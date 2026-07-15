import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { TicketStatus } from '@prisma/client';

// ============================================================================
// Dashboard Controller
// ============================================================================

/**
 * GET /dashboard/summary
 * Admin dashboard — total open tickets, by priority, SLA compliance %.
 */
export async function getSummary(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const now = new Date();

    // --- Open ticket counts by status ---
    const [openCount, inProgressCount, pendingCount, resolvedCount] =
      await Promise.all([
        prisma.ticket.count({
          where: { deletedAt: null, status: 'open' },
        }),
        prisma.ticket.count({
          where: { deletedAt: null, status: 'in_progress' },
        }),
        prisma.ticket.count({
          where: { deletedAt: null, status: 'pending' },
        }),
        prisma.ticket.count({
          where: { deletedAt: null, status: 'resolved' },
        }),
      ]);

    // --- Tickets by priority (non-closed, non-cancelled) ---
    const activeStatuses: TicketStatus[] = ['open', 'in_progress', 'pending', 'resolved'];
    const byPriority = await prisma.ticket.groupBy({
      by: ['priority'],
      where: {
        deletedAt: null,
        status: { in: activeStatuses },
      },
      _count: { id: true },
    });

    // --- SLA compliance ---
    const slaStatuses: TicketStatus[] = ['open', 'in_progress', 'pending', 'resolved'];
    const activeTicketsWithSla = await prisma.ticket.count({
      where: {
        deletedAt: null,
        status: { in: slaStatuses },
        OR: [
          { responseDueAt: { not: null } },
          { resolutionDueAt: { not: null } },
        ],
      },
    });
    const breachedTickets = await prisma.ticket.count({
      where: {
        deletedAt: null,
        status: { in: slaStatuses },
        slaBreach: true,
      },
    });

    const slaCompliancePercent =
      activeTicketsWithSla > 0
        ? Math.round(
            ((activeTicketsWithSla - breachedTickets) / activeTicketsWithSla) * 100,
          )
        : 100;

    // --- Recent tickets (last 24h) ---
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const ticketsLast24h = await prisma.ticket.count({
      where: { createdAt: { gte: last24h }, deletedAt: null },
    });

    res.json({
      totalOpen: openCount + inProgressCount + pendingCount,
      byStatus: {
        open: openCount,
        inProgress: inProgressCount,
        pending: pendingCount,
        resolved: resolvedCount,
      },
      byPriority: byPriority.map((p) => ({
        priority: p.priority,
        count: p._count?.id ?? 0,
      })),
      slaCompliance: {
        totalTracked: activeTicketsWithSla,
        breached: breachedTickets,
        compliancePercent: slaCompliancePercent,
      },
      ticketsLast24h,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /dashboard/agent
 * Agent dashboard — my tickets by status, SLA at risk, recent activity.
 */
export async function getAgentWidgets(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.id;

    // --- My tickets by status ---
    const myTickets = await prisma.ticket.groupBy({
      by: ['status'],
      where: {
        assignedAgentId: userId,
        deletedAt: null,
        status: { notIn: ['closed', 'cancelled'] },
      },
      _count: { id: true },
    });

    // --- SLA at risk (my tickets approaching deadlines) ---
    const now = new Date();
    const warningThreshold = new Date(now.getTime() + 30 * 60 * 1000); // 30 min from now

    const slaAtRisk = await prisma.ticket.findMany({
      where: {
        assignedAgentId: userId,
        deletedAt: null,
        slaBreach: false,
        status: { in: ['open' as const, 'in_progress' as const] },
        OR: [
          {
            responseDueAt: {
              not: null,
              lte: warningThreshold,
              gte: now,
            },
          },
          {
            resolutionDueAt: {
              not: null,
              lte: warningThreshold,
              gte: now,
            },
          },
        ],
      },
      select: {
        id: true,
        ticketNumber: true,
        title: true,
        priority: true,
        status: true,
        responseDueAt: true,
        resolutionDueAt: true,
        client: { select: { name: true } },
      },
      orderBy: { resolutionDueAt: 'asc' },
      take: 10,
    });

    // --- Breached tickets ---
    const breached = await prisma.ticket.findMany({
      where: {
        assignedAgentId: userId,
        deletedAt: null,
        slaBreach: true,
        status: { in: ['open', 'in_progress', 'pending'] },
      },
      select: {
        id: true,
        ticketNumber: true,
        title: true,
        priority: true,
        status: true,
        client: { select: { name: true } },
      },
      take: 10,
    });

    // --- Recent activity on my tickets ---
    const recentActivity = await prisma.activityLog.findMany({
      where: {
        ticket: {
          assignedAgentId: userId,
          deletedAt: null,
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        ticket: {
          select: { id: true, ticketNumber: true, title: true },
        },
      },
    });

    res.json({
      myTickets: myTickets.map((t) => ({
        status: t.status,
        count: t._count.id,
      })),
      slaAtRisk: slaAtRisk.map((t) => ({
        id: t.id,
        ticketNumber: t.ticketNumber,
        title: t.title,
        priority: t.priority,
        status: t.status,
        client: t.client.name,
        responseDueAt: t.responseDueAt,
        resolutionDueAt: t.resolutionDueAt,
      })),
      breached: breached.map((t) => ({
        id: t.id,
        ticketNumber: t.ticketNumber,
        title: t.title,
        priority: t.priority,
        status: t.status,
        client: t.client.name,
      })),
      recentActivity: recentActivity.map((a) => ({
        id: a.id,
        ticketId: a.ticket.id,
        ticketNumber: a.ticket.ticketNumber,
        ticketTitle: a.ticket.title,
        action: a.action,
        actorId: a.actorId,
        actorType: a.actorType,
        createdAt: a.createdAt,
      })),
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /dashboard/stats
 * Charts data — tickets over time, by category, agent workload.
 * Admin / super_admin only.
 */
export async function getStats(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const now = new Date();
    const daysBack = parseInt(req.query.days as string, 10) || 30;
    const since = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);

    // --- Tickets over time (daily counts) ---
    const ticketsByDay = await prisma.ticket.findMany({
      where: {
        createdAt: { gte: since },
        deletedAt: null,
      },
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    // Group by day
    const dayBuckets: Record<string, number> = {};
    for (const t of ticketsByDay) {
      const dayKey = t.createdAt.toISOString().slice(0, 10);
      dayBuckets[dayKey] = (dayBuckets[dayKey] || 0) + 1;
    }
    const ticketsOverTime = Object.entries(dayBuckets)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count }));

    // --- Tickets by category ---
    const byCategory = await prisma.ticket.groupBy({
      by: ['categoryId'],
      where: {
        createdAt: { gte: since },
        deletedAt: null,
      },
      _count: { id: true },
    });

    const categoryIds = byCategory.map((c) => c.categoryId);
    const categories = await prisma.category.findMany({
      where: { id: { in: categoryIds } },
      select: { id: true, name: true },
    });
    const categoryMap = new Map(categories.map((c) => [c.id, c.name]));

    const ticketsByCategory = byCategory.map((c) => ({
      categoryId: c.categoryId,
      categoryName: categoryMap.get(c.categoryId) ?? 'Unknown',
      count: c._count.id,
    }));

    // --- Agent workload (open tickets per agent) ---
    const agentWorkload = await prisma.user.findMany({
      where: {
        isActive: true,
        deletedAt: null,
        role: { in: ['agent', 'team_lead', 'admin'] },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        _count: {
          select: {
            assignedTickets: {
              where: {
                deletedAt: null,
                status: { in: ['open', 'in_progress', 'pending'] },
              },
            },
          },
        },
      },
      orderBy: { firstName: 'asc' },
    });

    // --- Resolved vs created over time ---
    const resolvedByDay = await prisma.ticket.findMany({
      where: {
        resolvedAt: { gte: since },
        deletedAt: null,
      },
      select: { resolvedAt: true },
    });
    const resolvedBuckets: Record<string, number> = {};
    for (const t of resolvedByDay) {
      if (t.resolvedAt) {
        const dayKey = t.resolvedAt.toISOString().slice(0, 10);
        resolvedBuckets[dayKey] = (resolvedBuckets[dayKey] || 0) + 1;
      }
    }
    const resolvedOverTime = Object.entries(resolvedBuckets)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count }));

    res.json({
      ticketsOverTime,
      ticketsByCategory,
      resolvedOverTime,
      agentWorkload: agentWorkload.map((a) => ({
        id: a.id,
        name: `${a.firstName} ${a.lastName}`,
        openTickets: a._count.assignedTickets,
      })),
      period: {
        from: since,
        to: now,
        days: daysBack,
      },
    });
  } catch (err) {
    next(err);
  }
}
