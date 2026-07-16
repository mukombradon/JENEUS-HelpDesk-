import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { TicketStatus, TicketPriority } from '@prisma/client';

// ============================================================================
// Dashboard Controller
// ============================================================================

/**
 * GET /dashboard/summary
 * Admin / management dashboard — total open tickets, by priority, SLA, top clients,
 * agent workload, first response & resolution time averages.
 *
 * Response shape matches the frontend DashboardSummary type.
 */
export async function getSummary(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const now = new Date();

    // --- Open ticket counts by status ---
    const statusCounts = await prisma.ticket.groupBy({
      by: ['status'],
      where: { deletedAt: null },
      _count: { id: true },
    });

    // Build a map keyed by status for quick lookup
    const statusMap: Record<string, number> = { open: 0, in_progress: 0, pending: 0, resolved: 0, closed: 0, cancelled: 0 };
    for (const s of statusCounts) {
      statusMap[s.status] = s._count.id;
    }

    const tickets_by_status: Record<string, number> = { ...statusMap };

    // --- Tickets by priority (active tickets only: non-closed, non-cancelled) ---
    const activeStatuses: TicketStatus[] = ['open', 'in_progress', 'pending', 'resolved'];
    const priorityGroups = await prisma.ticket.groupBy({
      by: ['priority'],
      where: { deletedAt: null, status: { in: activeStatuses } },
      _count: { id: true },
    });

    const tickets_by_priority: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0 };
    for (const p of priorityGroups) {
      tickets_by_priority[p.priority] = p._count.id;
    }

    // --- SLA compliance ---
    const slaStatuses: TicketStatus[] = ['open', 'in_progress', 'pending', 'resolved'];
    const activeTicketsWithSla = await prisma.ticket.count({
      where: {
        deletedAt: null,
        status: { in: slaStatuses },
        OR: [{ responseDueAt: { not: null } }, { resolutionDueAt: { not: null } }],
      },
    });
    const breachedTickets = await prisma.ticket.count({
      where: { deletedAt: null, status: { in: slaStatuses }, slaBreach: true },
    });

    const sla_compliance_rate =
      activeTicketsWithSla > 0
        ? Math.round(((activeTicketsWithSla - breachedTickets) / activeTicketsWithSla) * 100)
        : 100;

    // --- Top clients by ticket volume ---
    const topClientsRaw = await prisma.ticket.groupBy({
      by: ['clientId'],
      where: { deletedAt: null },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    });

    const topClientIds = topClientsRaw.map((c) => c.clientId);
    const clients = await prisma.client.findMany({
      where: { id: { in: topClientIds } },
      select: { id: true, name: true },
    });
    const clientMap = new Map(clients.map((c) => [c.id, c]));

    const top_clients = topClientsRaw
      .filter((c) => clientMap.has(c.clientId))
      .map((c) => ({
        client: { id: c.clientId, name: clientMap.get(c.clientId)!.name, email: '' },
        ticket_count: c._count.id,
      }));

    // --- Agent workload (active agents with open ticket counts, SLA breaches, avg resolution) ---
    const agents = await prisma.user.findMany({
      where: {
        isActive: true,
        deletedAt: null,
        role: { in: ['agent', 'team_lead', 'admin'] },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        avatarUrl: true,
        assignedTickets: {
          where: { deletedAt: null, status: { in: ['open', 'in_progress', 'pending'] } },
          select: { id: true, slaBreach: true, resolvedAt: true, createdAt: true, priority: true },
        },
      },
      orderBy: { firstName: 'asc' },
    });

    const agent_workload = agents.map((agent) => {
      const openTickets = agent.assignedTickets.length;
      const slaBreachCount = agent.assignedTickets.filter((t) => t.slaBreach).length;

      // Compute average resolution time from resolved tickets assigned to this agent
      // (we compute this server-side below rather than per-agent for simplicity;
      //  a future optimisation could pre-aggregate)
      return {
        agent: {
          id: agent.id,
          first_name: agent.firstName,
          last_name: agent.lastName,
          email: agent.email,
          role: agent.role,
          avatar_url: agent.avatarUrl,
        },
        open_tickets: openTickets,
        avg_resolution_time: 0, // simplified; could be computed from resolved tickets
        sla_breach_count: slaBreachCount,
      };
    });

    // --- Average first response & resolution time by priority ---
    const resolvedTickets = await prisma.ticket.findMany({
      where: {
        deletedAt: null,
        resolvedAt: { not: null },
      },
      select: { priority: true, createdAt: true, firstResponseAt: true, resolvedAt: true },
    });

    const firstResponseBuckets: Record<string, number[]> = {};
    const resolutionBuckets: Record<string, number[]> = {};

    for (const t of resolvedTickets) {
      // First response time (hours)
      if (t.firstResponseAt && t.createdAt) {
        const hours = (t.firstResponseAt.getTime() - t.createdAt.getTime()) / (1000 * 60 * 60);
        if (hours >= 0) {
          if (!firstResponseBuckets[t.priority]) firstResponseBuckets[t.priority] = [];
          firstResponseBuckets[t.priority].push(hours);
        }
      }

      // Resolution time (hours)
      if (t.resolvedAt && t.createdAt) {
        const hours = (t.resolvedAt.getTime() - t.createdAt.getTime()) / (1000 * 60 * 60);
        if (hours >= 0) {
          if (!resolutionBuckets[t.priority]) resolutionBuckets[t.priority] = [];
          resolutionBuckets[t.priority].push(hours);
        }
      }
    }

    const avg = (arr: number[]) => (arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);

    const first_response_time_avg: Record<string, number> = {};
    const resolution_time_avg: Record<string, number> = {};
    for (const p of ['critical', 'high', 'medium', 'low']) {
      first_response_time_avg[p] = Math.round(avg(firstResponseBuckets[p] ?? []) * 100) / 100;
      resolution_time_avg[p] = Math.round(avg(resolutionBuckets[p] ?? []) * 100) / 100;
    }

    // --- Recent tickets (last 24h) ---
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const ticketsLast24h = await prisma.ticket.count({
      where: { createdAt: { gte: last24h }, deletedAt: null },
    });

    res.json({
      tickets_by_status,
      tickets_by_priority,
      sla_compliance_rate,
      top_clients,
      agent_workload,
      first_response_time_avg,
      resolution_time_avg,
      // additional convenience fields (used elsewhere)
      totalOpen: (tickets_by_status.open ?? 0) + (tickets_by_status.in_progress ?? 0) + (tickets_by_status.pending ?? 0),
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

    // --- My tickets by status (as a Record<status, count>) ---
    const myTicketGroups = await prisma.ticket.groupBy({
      by: ['status'],
      where: {
        assignedAgentId: userId,
        deletedAt: null,
        status: { notIn: ['closed', 'cancelled'] },
      },
      _count: { id: true },
    });

    const my_tickets: Record<string, number> = { open: 0, in_progress: 0, pending: 0, resolved: 0 };
    for (const g of myTicketGroups) {
      my_tickets[g.status] = g._count.id;
    }

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

    const sla_at_risk = slaAtRisk.map((t) => ({
      id: t.id,
      ticket_number: t.ticketNumber,
      title: t.title,
      priority: t.priority,
      status: t.status,
      client: t.client.name,
      response_due_at: t.responseDueAt,
      resolution_due_at: t.resolutionDueAt,
    }));

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
    const activityLogs = await prisma.activityLog.findMany({
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

    const recent_activity = activityLogs.map((a) => ({
      id: a.id,
      ticket_id: a.ticket.id,
      ticket_number: a.ticket.ticketNumber,
      ticket_title: a.ticket.title,
      action: a.action,
      actor_id: a.actorId,
      actor_type: a.actorType,
      created_at: a.createdAt,
    }));

    res.json({
      my_tickets,
      sla_at_risk,
      breached: breached.map((t) => ({
        id: t.id,
        ticket_number: t.ticketNumber,
        title: t.title,
        priority: t.priority,
        status: t.status,
        client: t.client.name,
      })),
      recent_activity,
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
