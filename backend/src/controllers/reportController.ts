import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';

// ============================================================================
// Report Controller
// ============================================================================

/**
 * GET /reports/sla
 * SLA compliance data — optionally filter by client, date range.
 * Returns compliance percentage, breached counts, and details.
 */
export async function getSlaReport(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const clientId = req.query.clientId as string | undefined;
    const dateFrom = req.query.dateFrom
      ? new Date(req.query.dateFrom as string)
      : undefined;
    const dateTo = req.query.dateTo
      ? new Date(req.query.dateTo as string)
      : undefined;

    const where: any = {
      deletedAt: null,
      OR: [
        { responseDueAt: { not: null } },
        { resolutionDueAt: { not: null } },
      ],
    };

    if (clientId) where.clientId = clientId;
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = dateFrom;
      if (dateTo) where.createdAt.lte = dateTo;
    }

    const [total, breached, byPriority, byClient] = await Promise.all([
      prisma.ticket.count({ where }),
      prisma.ticket.count({
        where: { ...where, slaBreach: true },
      }),
      prisma.ticket.groupBy({
        by: ['priority'],
        where,
        _count: { id: true },
        _sum: { recurrenceCount: true },
      }),
      prisma.ticket.groupBy({
        by: ['clientId'],
        where,
        _count: { id: true },
      }),
    ]);

    // Client names
    const clientIds = byClient.map((c) => c.clientId);
    const clients = await prisma.client.findMany({
      where: { id: { in: clientIds } },
      select: { id: true, name: true },
    });
    const clientMap = new Map(clients.map((c) => [c.id, c.name]));

    const compliancePercent = total > 0
      ? Math.round(((total - breached) / total) * 100)
      : 100;

    res.json({
      summary: {
        totalTracked: total,
        breached,
        compliant: total - breached,
        compliancePercent,
      },
      byPriority: byPriority.map((p) => ({
        priority: p.priority,
        count: p._count.id,
      })),
      byClient: byClient.map((c) => ({
        clientId: c.clientId,
        clientName: clientMap.get(c.clientId) ?? 'Unknown',
        count: c._count.id,
      })),
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /reports/volume
 * Ticket volume report grouped by period (day/week/month) and optionally by category.
 */
export async function getVolumeReport(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const period = ((req.query.period as string) || 'day') as 'day' | 'week' | 'month';
    const dateFrom = req.query.dateFrom
      ? new Date(req.query.dateFrom as string)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // default 30 days
    const dateTo = req.query.dateTo
      ? new Date(req.query.dateTo as string)
      : new Date();
    const type = req.query.type as string | undefined; // incident | problem

    const where: any = {
      deletedAt: null,
      createdAt: { gte: dateFrom, lte: dateTo },
    };
    if (type) where.type = type;

    const tickets = await prisma.ticket.findMany({
      where,
      select: {
        createdAt: true,
        type: true,
        priority: true,
        categoryId: true,
        category: { select: { name: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Group by period
    const periodBuckets: Record<string, { total: number; incidents: number; problems: number; byCategory: Record<string, number>; byPriority: Record<string, number> }> = {};

    for (const t of tickets) {
      const key = formatPeriodKey(t.createdAt, period);
      if (!periodBuckets[key]) {
        periodBuckets[key] = { total: 0, incidents: 0, problems: 0, byCategory: {}, byPriority: {} };
      }
      periodBuckets[key].total++;
      if (t.type === 'incident') periodBuckets[key].incidents++;
      else periodBuckets[key].problems++;

      const catName = t.category?.name ?? 'Uncategorized';
      periodBuckets[key].byCategory[catName] = (periodBuckets[key].byCategory[catName] || 0) + 1;
      periodBuckets[key].byPriority[t.priority] = (periodBuckets[key].byPriority[t.priority] || 0) + 1;
    }

    const volumeByPeriod = Object.entries(periodBuckets)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]) => ({ date, ...data }));

    res.json({
      period,
      dateFrom,
      dateTo,
      volumeByPeriod,
      totals: {
        total: tickets.length,
        incidents: tickets.filter((t) => t.type === 'incident').length,
        problems: tickets.filter((t) => t.type === 'problem').length,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /reports/agents
 * Agent performance metrics — tickets resolved, avg resolution time, SLA compliance.
 */
export async function getAgentReport(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const dateFrom = req.query.dateFrom
      ? new Date(req.query.dateFrom as string)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const dateTo = req.query.dateTo
      ? new Date(req.query.dateTo as string)
      : new Date();

    const agents = await prisma.user.findMany({
      where: {
        isActive: true,
        deletedAt: null,
        role: { not: 'super_admin' }, // exclude super admin from agent reports
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        teamId: true,
        team: { select: { name: true } },
        assignedTickets: {
          where: {
            deletedAt: null,
            createdAt: { gte: dateFrom, lte: dateTo },
          },
          select: {
            id: true,
            status: true,
            slaBreach: true,
            resolvedAt: true,
            createdAt: true,
          },
        },
      },
    });

    const agentReport = agents.map((agent) => {
      const totalAssigned = agent.assignedTickets.length;
      const resolved = agent.assignedTickets.filter(
        (t) => t.status === 'resolved' || t.status === 'closed',
      ).length;
      const breached = agent.assignedTickets.filter((t) => t.slaBreach).length;
      const inProgress = agent.assignedTickets.filter(
        (t) => t.status === 'in_progress',
      ).length;
      const open = agent.assignedTickets.filter(
        (t) => t.status === 'open',
      ).length;

      // Average resolution time (in hours) for resolved tickets
      let avgResolutionHours = 0;
      const resolvedTickets = agent.assignedTickets.filter(
        (t) => t.resolvedAt,
      );
      if (resolvedTickets.length > 0) {
        const totalMs = resolvedTickets.reduce((sum, t) => {
          return sum + (t.resolvedAt!.getTime() - t.createdAt.getTime());
        }, 0);
        avgResolutionHours = Math.round((totalMs / resolvedTickets.length) / (1000 * 60 * 60) * 10) / 10;
      }

      return {
        id: agent.id,
        name: `${agent.firstName} ${agent.lastName}`,
        email: agent.email,
        role: agent.role,
        team: agent.team?.name ?? null,
        totalAssigned,
        resolved,
        inProgress,
        open,
        breached,
        slaCompliancePercent:
          totalAssigned > 0
            ? Math.round(((totalAssigned - breached) / totalAssigned) * 100)
            : 100,
        avgResolutionHours,
        resolutionRate:
          totalAssigned > 0
            ? Math.round((resolved / totalAssigned) * 100)
            : 0,
      };
    });

    res.json({
      dateFrom,
      dateTo,
      agents: agentReport,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /reports/problems
 * Problem frequency report — recurring incidents grouped by category,
 * with recurrence counts and associated problem tickets.
 */
export async function getProblemReport(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const dateFrom = req.query.dateFrom
      ? new Date(req.query.dateFrom as string)
      : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // default 90 days
    const dateTo = req.query.dateTo
      ? new Date(req.query.dateTo as string)
      : new Date();

    // Fetch problem tickets with their child incidents
    const problems = await prisma.ticket.findMany({
      where: {
        type: 'problem',
        deletedAt: null,
        createdAt: { gte: dateFrom, lte: dateTo },
      },
      select: {
        id: true,
        ticketNumber: true,
        title: true,
        status: true,
        priority: true,
        recurrenceCount: true,
        createdAt: true,
        resolvedAt: true,
        client: { select: { id: true, name: true } },
        category: { select: { id: true, name: true } },
        assignedAgent: {
          select: { id: true, firstName: true, lastName: true },
        },
        childIncidents: {
          where: { deletedAt: null },
          select: { id: true, ticketNumber: true, status: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 25,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Top recurring categories (incidents not yet linked to problems)
    const recurringCategories = await prisma.ticket.groupBy({
      by: ['categoryId'],
      where: {
        type: 'incident',
        deletedAt: null,
        createdAt: { gte: dateFrom, lte: dateTo },
        parentProblemId: null,
      },
      _count: { id: true },
    });

    const catIds = recurringCategories.map((c) => c.categoryId);
    const categories = await prisma.category.findMany({
      where: { id: { in: catIds } },
      select: { id: true, name: true },
    });
    const catMap = new Map(categories.map((c) => [c.id, c.name]));

    const topRecurring = recurringCategories
      .filter((c) => c._count.id >= 2)
      .sort((a, b) => b._count.id - a._count.id)
      .slice(0, 20)
      .map((c) => ({
        categoryId: c.categoryId,
        categoryName: catMap.get(c.categoryId) ?? 'Unknown',
        incidentCount: c._count.id,
      }));

    res.json({
      dateFrom,
      dateTo,
      totalProblems: problems.length,
      problems: problems.map((p) => ({
        id: p.id,
        ticketNumber: p.ticketNumber,
        title: p.title,
        status: p.status,
        priority: p.priority,
        client: p.client.name,
        category: p.category?.name ?? null,
        assignedAgent: p.assignedAgent
          ? `${p.assignedAgent.firstName} ${p.assignedAgent.lastName}`
          : null,
        recurrenceCount: p.recurrenceCount,
        linkedIncidents: p.childIncidents.length,
        createdAt: p.createdAt,
        resolvedAt: p.resolvedAt,
      })),
      topRecurringCategories: topRecurring,
    });
  } catch (err) {
    next(err);
  }
}

// ============================================================================
// Helper
// ============================================================================

function formatPeriodKey(date: Date, period: 'day' | 'week' | 'month'): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');

  if (period === 'day') return `${y}-${m}-${d}`;
  if (period === 'month') return `${y}-${m}`;

  // ISO week number
  const startOfYear = new Date(date.getFullYear(), 0, 1);
  const diff = date.getTime() - startOfYear.getTime();
  const week = Math.ceil((diff / (1000 * 60 * 60 * 24) + startOfYear.getDay() + 1) / 7);
  return `${y}-W${String(week).padStart(2, '0')}`;
}
