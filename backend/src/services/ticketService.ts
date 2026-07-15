import prisma from '../lib/prisma';
import { AppError } from '../utils/AppError';
import type {
  CreateTicketInput,
  UpdateTicketInput,
  TicketQueryInput,
} from '../validators/ticket';

// ============================================================================
// Types
// ============================================================================

interface StatusChangeParams {
  newStatus: string;
  userId: string;
  reason?: string;
}

interface AssignTicketParams {
  agentId?: string | null;
  teamId?: string | null;
}

interface LinkProblemParams {
  problemId: string;
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Allowed status transitions keyed by current status.
 */
const STATUS_TRANSITIONS: Record<string, string[]> = {
  open: ['in_progress', 'pending', 'closed', 'cancelled'],
  in_progress: ['open', 'pending', 'resolved', 'cancelled'],
  pending: ['open', 'in_progress', 'cancelled'],
  resolved: ['closed', 'open'],
  closed: ['open'],
  cancelled: ['open'],
};

/**
 * Generate an auto-incrementing ticket number.
 * Format: INC-00001 or PRB-00001
 */
async function generateTicketNumber(type: 'incident' | 'problem'): Promise<string> {
  const prefix = type === 'incident' ? 'INC' : 'PRB';

  const lastTicket = await prisma.ticket.findFirst({
    where: { type, deletedAt: null },
    orderBy: { createdAt: 'desc' },
    select: { ticketNumber: true },
  });

  let nextSeq = 1;
  if (lastTicket) {
    const match = lastTicket.ticketNumber.match(/(\d+)$/);
    if (match) {
      nextSeq = parseInt(match[1], 10) + 1;
    }
  }

  return `${prefix}-${String(nextSeq).padStart(5, '0')}`;
}

/**
 * Calculate SLA deadlines based on the client's SLA policy and ticket priority.
 *
 * The SLA policy `rules` field is expected to have the shape:
 * ```json
 * {
 *   "response": { "critical": 15, "high": 30, "medium": 60, "low": 120 },
 *   "resolution": { "critical": 60, "high": 240, "medium": 480, "low": 960 }
 * }
 * ```
 * All values are in minutes.
 */
async function calculateSlaDeadlines(
  clientId: string,
  priority: string,
): Promise<{ responseDueAt: Date | null; resolutionDueAt: Date | null; slaPolicyId: string | null }> {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: { slaPolicy: true },
  });

  if (!client?.slaPolicy?.rules) {
    return { responseDueAt: null, resolutionDueAt: null, slaPolicyId: null };
  }

  const rules = client.slaPolicy.rules as Record<string, Record<string, number>>;

  const responseMinutes = rules.response?.[priority];
  const resolutionMinutes = rules.resolution?.[priority];

  const now = new Date();

  return {
    responseDueAt: responseMinutes
      ? new Date(now.getTime() + responseMinutes * 60_000)
      : null,
    resolutionDueAt: resolutionMinutes
      ? new Date(now.getTime() + resolutionMinutes * 60_000)
      : null,
    slaPolicyId: client.slaPolicy.id,
  };
}

/**
 * Create an activity log entry for a ticket.
 */
async function createActivityLog(params: {
  ticketId: string;
  actorId: string;
  actorType: 'staff' | 'client' | 'system';
  action: string;
  oldValue?: string;
  newValue?: string;
}): Promise<void> {
  await prisma.activityLog.create({
    data: {
      ticketId: params.ticketId,
      actorId: params.actorId,
      actorType: params.actorType,
      action: params.action,
      oldValue: params.oldValue ?? null,
      newValue: params.newValue ?? null,
    },
  });
}

/**
 * Notify relevant parties about a ticket event.
 * Only in-app notification records are created here; email dispatch is handled
 * by a separate background job.
 */
async function createNotification(params: {
  ticketId: string;
  type: 'ticket_created' | 'ticket_assigned' | 'comment_added' | 'status_changed' | 'sla_warning' | 'sla_breached' | 'escalated';
  message: string;
  recipientIds: string[];
  recipientType: 'staff' | 'client';
}): Promise<void> {
  if (params.recipientIds.length === 0) return;

  await prisma.notification.createMany({
    data: params.recipientIds.map((recipientId) => ({
      recipientId,
      recipientType: params.recipientType,
      ticketId: params.ticketId,
      type: params.type,
      message: params.message,
      sentVia: 'in_app',
    })),
  });
}

// ============================================================================
// Public Service Functions
// ============================================================================

/**
 * Create a new ticket.
 * - Auto-generates the ticket number
 * - Calculates SLA deadlines from the client's SLA policy
 * - Creates an ActivityLog entry
 * - Sends in-app notification
 */
export async function createTicket(
  data: CreateTicketInput,
  userId: string,
) {
  const ticketNumber = await generateTicketNumber(data.type);

  const sla = await calculateSlaDeadlines(data.clientId, data.priority);

  const ticket = await prisma.ticket.create({
    data: {
      ticketNumber,
      type: data.type,
      title: data.title,
      description: data.description,
      priority: data.priority as any,
      clientId: data.clientId,
      contactId: data.contactId,
      categoryId: data.categoryId,
      subcategoryId: data.subcategoryId ?? null,
      assignedAgentId: data.assignedAgentId ?? null,
      assignedTeamId: data.assignedTeamId ?? null,
      createdBy: userId,
      tags: data.tags ?? [],
      slaPolicyId: sla.slaPolicyId,
      responseDueAt: sla.responseDueAt,
      resolutionDueAt: sla.resolutionDueAt,
    },
    include: {
      client: true,
      contact: true,
      assignedAgent: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
      category: true,
      subcategory: true,
      slaPolicy: true,
    },
  });

  // Activity log
  await createActivityLog({
    ticketId: ticket.id,
    actorId: userId,
    actorType: 'staff',
    action: 'ticket_created',
    newValue: JSON.stringify({ status: 'open', priority: data.priority, type: data.type }),
  });

  // Notify assigned agent
  if (data.assignedAgentId) {
    await createNotification({
      ticketId: ticket.id,
      type: 'ticket_created',
      message: `New ${data.type} assigned to you: ${ticketNumber} — ${data.title}`,
      recipientIds: [data.assignedAgentId],
      recipientType: 'staff',
    });
  }

  // Notify team members if assigned to a team
  if (data.assignedTeamId) {
    const teamMembers = await prisma.user.findMany({
      where: { teamId: data.assignedTeamId, isActive: true, deletedAt: null },
      select: { id: true },
    });
    const memberIds = teamMembers
      .map((m) => m.id)
      .filter((id) => id !== data.assignedAgentId);
    if (memberIds.length > 0) {
      await createNotification({
        ticketId: ticket.id,
        type: 'ticket_created',
        message: `New team ${data.type}: ${ticketNumber} — ${data.title}`,
        recipientIds: memberIds,
        recipientType: 'staff',
      });
    }
  }

  return ticket;
}

/**
 * Get a single ticket with all relations.
 */
export async function getTicket(id: string) {
  const ticket = await prisma.ticket.findUnique({
    where: { id },
    include: {
      client: true,
      contact: true,
      assignedAgent: {
        select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true },
      },
      assignedTeam: true,
      category: true,
      subcategory: true,
      createdByUser: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
      parentProblem: {
        select: { id: true, ticketNumber: true, title: true, status: true },
      },
      comments: {
        orderBy: { createdAt: 'asc' },
        include: {
          attachments: true,
        },
      },
      attachments: {
        orderBy: { createdAt: 'desc' },
      },
      activityLogs: {
        orderBy: { createdAt: 'desc' },
      },
      slaPolicy: true,
      feedback: true,
    },
  });

  if (!ticket || ticket.deletedAt) {
    throw new AppError('Ticket not found', 404, 'TICKET_NOT_FOUND');
  }

  return ticket;
}

/**
 * List tickets with full-text search, filtering, sorting, and pagination.
 */
export async function listTickets(filters: TicketQueryInput) {
  const {
    page,
    limit,
    sort,
    order,
    status,
    type,
    priority,
    clientId,
    assignedAgentId,
    assignedTeamId,
    categoryId,
    search,
    slaStatus,
    tags,
    dateFrom,
    dateTo,
  } = filters;

  const where: any = {
    deletedAt: null,
  };

  if (status) where.status = status;
  if (type) where.type = type;
  if (priority) where.priority = priority;
  if (clientId) where.clientId = clientId;
  if (assignedAgentId) where.assignedAgentId = assignedAgentId;
  if (assignedTeamId) where.assignedTeamId = assignedTeamId;
  if (categoryId) where.categoryId = categoryId;

  // Full-text search on title and description
  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
      { ticketNumber: { contains: search, mode: 'insensitive' } },
    ];
  }

  // Tags filter (comma-separated string -> array intersection)
  if (tags) {
    const tagList = tags.split(',').map((t) => t.trim()).filter(Boolean);
    if (tagList.length > 0) {
      where.tags = { hasSome: tagList };
    }
  }

  // Date range filter
  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) where.createdAt.gte = new Date(dateFrom);
    if (dateTo) where.createdAt.lte = new Date(dateTo);
  }

  // SLA status filter (computed field)
  if (slaStatus === 'breached') {
    where.slaBreach = true;
  } else if (slaStatus === 'warning') {
    // Tickets approaching SLA deadline (within 25% of the average SLA window)
    // but not yet breached. Filter for tickets whose resolutionDueAt is within
    // the near future (next 25% of typical SLA duration) or already past.
    const avgWindow = await getAvgResolutionWindow();
    const warningThreshold = avgWindow * 0.25;
    const nearFuture = new Date(Date.now() + warningThreshold);
    where.slaBreach = false;
    where.resolutionDueAt = {
      not: null,
      lte: nearFuture,
    };
  } else if (slaStatus === 'ok') {
    where.slaBreach = false;
    where.resolutionDueAt = { not: null };
  }

  // Build orderBy
  const allowedSortFields = [
    'createdAt',
    'updatedAt',
    'priority',
    'status',
    'type',
    'ticketNumber',
    'responseDueAt',
    'resolutionDueAt',
  ];
  const sortField = allowedSortFields.includes(sort) ? sort : 'createdAt';
  const orderBy = { [sortField]: order };

  const skip = (page - 1) * limit;

  const [tickets, total] = await Promise.all([
    prisma.ticket.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      include: {
        client: { select: { id: true, name: true } },
        contact: { select: { id: true, firstName: true, lastName: true, email: true } },
        assignedAgent: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true },
        },
        assignedTeam: { select: { id: true, name: true } },
        category: { select: { id: true, name: true } },
        subcategory: { select: { id: true, name: true } },
      },
    }),
    prisma.ticket.count({ where }),
  ]);

  return {
    data: tickets,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

// Internal helper for slaStatus warning - avoid using for now
let _avgResolutionWindow = 60 * 60 * 1000; // 1 hour default

async function getAvgResolutionWindow(): Promise<number> {
  // Average time between createdAt and resolutionDueAt for tickets that have it
  const ticketsWithSla = await prisma.ticket.findMany({
    where: {
      resolutionDueAt: { not: null },
    },
    select: { createdAt: true, resolutionDueAt: true },
    take: 100,
    orderBy: { createdAt: 'desc' },
  });

  if (ticketsWithSla.length === 0) return _avgResolutionWindow;

  const avg =
    ticketsWithSla.reduce((sum, t) => {
      return sum + (t.resolutionDueAt!.getTime() - t.createdAt.getTime());
    }, 0) / ticketsWithSla.length;

  _avgResolutionWindow = avg;
  return avg;
}

/**
 * Update ticket fields. Creates ActivityLog entries for each changed field.
 */
export async function updateTicket(id: string, data: UpdateTicketInput, userId: string) {
  const existing = await prisma.ticket.findUnique({ where: { id } });
  if (!existing || existing.deletedAt) {
    throw new AppError('Ticket not found', 404, 'TICKET_NOT_FOUND');
  }

  const changedFields: string[] = [];
  const updateData: Record<string, any> = {};

  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) continue;

    const dbField = key === 'tags' ? key : key as keyof typeof data;
    const existingValue = (existing as any)[dbField];

    // Compare values — simple equality for most fields
    const serializedNew = Array.isArray(value) ? value : String(value ?? '');
    const serializedOld = Array.isArray(existingValue) ? existingValue : String(existingValue ?? '');

    if (JSON.stringify(serializedNew) !== JSON.stringify(serializedOld)) {
      changedFields.push(key);
      updateData[key] = key === 'tags' ? value : value;
    }
  }

  if (changedFields.length === 0) {
    return existing;
  }

  // Convert to Prisma-compatible format for enum fields
  const prismaData: any = { ...updateData };
  if (prismaData.type) prismaData.type = prismaData.type;
  if (prismaData.priority) prismaData.priority = prismaData.priority;
  if (prismaData.status) prismaData.status = prismaData.status;

  const ticket = await prisma.ticket.update({
    where: { id },
    data: prismaData,
    include: {
      client: true,
      contact: true,
      assignedAgent: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
      category: true,
      subcategory: true,
    },
  });

  // Activity log for update
  await createActivityLog({
    ticketId: id,
    actorId: userId,
    actorType: 'staff',
    action: 'ticket_updated',
    newValue: JSON.stringify(changedFields),
  });

  return ticket;
}

/**
 * Change ticket status with transition validation and timestamp tracking.
 */
export async function statusChange(
  id: string,
  params: StatusChangeParams,
) {
  const { newStatus, userId, reason } = params;

  const ticket = await prisma.ticket.findUnique({ where: { id } });
  if (!ticket || ticket.deletedAt) {
    throw new AppError('Ticket not found', 404, 'TICKET_NOT_FOUND');
  }

  const currentStatus = ticket.status;
  const allowed = STATUS_TRANSITIONS[currentStatus];

  if (!allowed || !allowed.includes(newStatus)) {
    throw new AppError(
      `Cannot transition from '${currentStatus}' to '${newStatus}'`,
      400,
      'INVALID_STATUS_TRANSITION',
    );
  }

  const updateData: Record<string, any> = {
    status: newStatus,
  };

  // Set timestamps based on new status
  if (newStatus === 'resolved') {
    updateData.resolvedAt = new Date();
  }
  if (newStatus === 'closed') {
    updateData.closedAt = new Date();
  }
  // When reopening (resolved/closed/cancelled -> open), clear resolution timestamps
  if (newStatus === 'open' && ['resolved', 'closed', 'cancelled'].includes(currentStatus)) {
    updateData.resolvedAt = null;
    updateData.closedAt = null;
  }

  const updated = await prisma.ticket.update({
    where: { id },
    data: updateData,
    include: {
      client: { select: { name: true } },
      assignedAgent: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
  });

  // Activity log
  const logPayload: Record<string, any> = {
    ticketId: id,
    actorId: userId,
    actorType: 'staff',
    action: 'status_changed',
    oldValue: currentStatus,
    newValue: newStatus,
  };

  if (reason) {
    (logPayload as any).action = `status_changed: ${reason}`;
  }

  await createActivityLog(logPayload as any);

  // Notify relevant parties
  const notifyIds: string[] = [];
  if (ticket.assignedAgentId) notifyIds.push(ticket.assignedAgentId);

  await createNotification({
    ticketId: id,
    type: 'status_changed',
    message: `Ticket ${ticket.ticketNumber} changed from '${currentStatus}' to '${newStatus}'`,
    recipientIds: notifyIds,
    recipientType: 'staff',
  });

  return updated;
}

/**
 * Assign (or reassign) a ticket to an agent and/or team.
 */
export async function assignTicket(
  id: string,
  params: AssignTicketParams,
  userId: string,
) {
  const ticket = await prisma.ticket.findUnique({ where: { id } });
  if (!ticket || ticket.deletedAt) {
    throw new AppError('Ticket not found', 404, 'TICKET_NOT_FOUND');
  }

  const updateData: Record<string, any> = {};
  const changes: string[] = [];

  if (params.agentId !== undefined) {
    updateData.assignedAgentId = params.agentId;
    changes.push('assignedAgent');
  }
  if (params.teamId !== undefined) {
    updateData.assignedTeamId = params.teamId;
    changes.push('assignedTeam');
  }

  if (changes.length === 0) {
    return ticket;
  }

  // If agentId is provided, validate agent exists
  if (params.agentId) {
    const agent = await prisma.user.findUnique({ where: { id: params.agentId } });
    if (!agent || !agent.isActive || agent.deletedAt) {
      throw new AppError('Agent not found or inactive', 400, 'INVALID_AGENT');
    }
  }

  // If teamId is provided, validate team exists
  if (params.teamId) {
    const team = await prisma.team.findUnique({ where: { id: params.teamId } });
    if (!team) {
      throw new AppError('Team not found', 400, 'INVALID_TEAM');
    }
  }

  const updated = await prisma.ticket.update({
    where: { id },
    data: updateData,
    include: {
      assignedAgent: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
      assignedTeam: { select: { id: true, name: true } },
    },
  });

  // Activity log
  await createActivityLog({
    ticketId: id,
    actorId: userId,
    actorType: 'staff',
    action: changes.length === 2 ? 'ticket_assigned (agent & team)' : `ticket_assigned (${changes[0]})`,
    oldValue: JSON.stringify({
      agentId: ticket.assignedAgentId,
      teamId: ticket.assignedTeamId,
    }),
    newValue: JSON.stringify(updateData),
  });

  // Notify new assignee
  if (params.agentId) {
    await createNotification({
      ticketId: id,
      type: 'ticket_assigned',
      message: `Ticket ${ticket.ticketNumber} assigned to you`,
      recipientIds: [params.agentId],
      recipientType: 'staff',
    });
  }

  return updated;
}

/**
 * Escalate an incident to a problem.
 * Creates a new problem ticket linked to this incident,
 * or links to an existing problem if `problemId` is included.
 * Only incidents can be escalated.
 */
export async function escalateTicket(
  id: string,
  userId: string,
  problemId?: string,
) {
  const ticket = await prisma.ticket.findUnique({ where: { id } });
  if (!ticket || ticket.deletedAt) {
    throw new AppError('Ticket not found', 404, 'TICKET_NOT_FOUND');
  }

  if (ticket.type !== 'incident') {
    throw new AppError('Only incidents can be escalated to problems', 400, 'INVALID_ESCALATION');
  }

  if (ticket.parentProblemId) {
    throw new AppError('Incident is already linked to a problem', 400, 'ALREADY_LINKED');
  }

  if (problemId) {
    // Link to existing problem
    const problem = await prisma.ticket.findUnique({ where: { id: problemId } });
    if (!problem || problem.deletedAt) {
      throw new AppError('Problem ticket not found', 404, 'PROBLEM_NOT_FOUND');
    }
    if (problem.type !== 'problem') {
      throw new AppError('Target ticket is not a problem', 400, 'NOT_A_PROBLEM');
    }

    await linkToProblem(id, { problemId });

    await createActivityLog({
      ticketId: id,
      actorId: userId,
      actorType: 'staff',
      action: 'escalated',
      newValue: `Linked to problem ${problem.ticketNumber}`,
    });

    await createNotification({
      ticketId: id,
      type: 'escalated',
      message: `Incident ${ticket.ticketNumber} escalated and linked to problem ${problem.ticketNumber}`,
      recipientIds: [ticket.assignedAgentId].filter(Boolean) as string[],
      recipientType: 'staff',
    });

    return { incident: ticket, problem };
  }

  // Create a new problem ticket from the incident
  const problemNumber = await generateTicketNumber('problem');

  const problem = await prisma.ticket.create({
    data: {
      ticketNumber: problemNumber,
      type: 'problem',
      title: `[Escalated] ${ticket.title}`,
      description: `This problem was created from escalated incident ${ticket.ticketNumber}.\n\nOriginal description:\n${ticket.description}`,
      priority: 'high',
      clientId: ticket.clientId,
      contactId: ticket.contactId,
      categoryId: ticket.categoryId,
      subcategoryId: ticket.subcategoryId,
      createdBy: userId,
      tags: [...ticket.tags, 'escalated'],
    },
  });

  // Link the incident to the new problem
  await prisma.ticket.update({
    where: { id: ticket.id },
    data: { parentProblemId: problem.id },
  });

  await createActivityLog({
    ticketId: id,
    actorId: userId,
    actorType: 'staff',
    action: 'escalated',
    newValue: `New problem created: ${problemNumber}`,
  });

  // Also log activity on the problem ticket
  await createActivityLog({
    ticketId: problem.id,
    actorId: userId,
    actorType: 'staff',
    action: 'problem_created_from_escalation',
    newValue: `Created from incident ${ticket.ticketNumber}`,
  });

  await createNotification({
    ticketId: problem.id,
    type: 'escalated',
    message: `New problem created from escalated incident ${ticket.ticketNumber}: ${problemNumber}`,
    recipientIds: [...new Set([ticket.assignedAgentId, userId].filter(Boolean))] as string[],
    recipientType: 'staff',
  });

  return { incident: ticket, problem };
}

/**
 * Link an incident to a problem ticket.
 * Increments recurrenceCount on the problem.
 */
export async function linkToProblem(
  incidentId: string,
  params: LinkProblemParams,
) {
  const { problemId } = params;

  const incident = await prisma.ticket.findUnique({ where: { id: incidentId } });
  if (!incident || incident.deletedAt) {
    throw new AppError('Incident not found', 404, 'TICKET_NOT_FOUND');
  }

  const problem = await prisma.ticket.findUnique({ where: { id: problemId } });
  if (!problem || problem.deletedAt) {
    throw new AppError('Problem not found', 404, 'PROBLEM_NOT_FOUND');
  }

  if (problem.type !== 'problem') {
    throw new AppError('Target ticket is not a problem', 400, 'NOT_A_PROBLEM');
  }

  // Link incident to problem and increment recurrence count
  const [updatedIncident] = await Promise.all([
    prisma.ticket.update({
      where: { id: incidentId },
      data: { parentProblemId: problemId },
    }),
    prisma.ticket.update({
      where: { id: problemId },
      data: { recurrenceCount: { increment: 1 } },
    }),
  ]);

  return {
    incident: updatedIncident,
    problem: {
      ...problem,
      recurrenceCount: problem.recurrenceCount + 1,
    },
  };
}

/**
 * Soft-delete a ticket (set deletedAt).
 */
export async function deleteTicket(id: string) {
  const ticket = await prisma.ticket.findUnique({ where: { id } });
  if (!ticket || ticket.deletedAt) {
    throw new AppError('Ticket not found', 404, 'TICKET_NOT_FOUND');
  }

  await prisma.ticket.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  return { message: 'Ticket deleted successfully' };
}

/**
 * Add a comment to a ticket.
 */
export async function addComment(
  ticketId: string,
  data: { body: string; authorType: 'staff' | 'client'; isInternal?: boolean },
  userId: string,
) {
  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket || ticket.deletedAt) {
    throw new AppError('Ticket not found', 404, 'TICKET_NOT_FOUND');
  }

  const comment = await prisma.comment.create({
    data: {
      ticketId,
      authorId: userId,
      authorType: data.authorType,
      body: data.body,
      isInternal: data.isInternal ?? false,
    },
    include: {
      attachments: true,
    },
  });

  // Activity log
  await createActivityLog({
    ticketId,
    actorId: userId,
    actorType: 'staff',
    action: 'comment_added',
    newValue: data.isInternal ? 'internal_note' : 'comment',
  });

  // Notify assigned agent (skip if the commenter is the assigned agent)
  if (ticket.assignedAgentId && ticket.assignedAgentId !== userId) {
    await createNotification({
      ticketId,
      type: 'comment_added',
      message: `New comment on ${ticket.ticketNumber}`,
      recipientIds: [ticket.assignedAgentId],
      recipientType: 'staff',
    });
  }

  return comment;
}

/**
 * Get comments for a ticket.
 */
export async function getComments(ticketId: string) {
  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket || ticket.deletedAt) {
    throw new AppError('Ticket not found', 404, 'TICKET_NOT_FOUND');
  }

  return prisma.comment.findMany({
    where: { ticketId },
    orderBy: { createdAt: 'asc' },
    include: {
      attachments: true,
    },
  });
}

/**
 * Get activity logs for a ticket.
 */
export async function getActivity(ticketId: string) {
  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket || ticket.deletedAt) {
    throw new AppError('Ticket not found', 404, 'TICKET_NOT_FOUND');
  }

  return prisma.activityLog.findMany({
    where: { ticketId },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Add an attachment record to a ticket.
 */
export async function addAttachment(
  ticketId: string,
  data: {
    filename: string;
    fileUrl: string;
    fileSize: number;
    mimeType: string;
    commentId?: string;
  },
  userId: string,
) {
  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket || ticket.deletedAt) {
    throw new AppError('Ticket not found', 404, 'TICKET_NOT_FOUND');
  }

  const attachment = await prisma.attachment.create({
    data: {
      ticketId,
      commentId: data.commentId ?? null,
      filename: data.filename,
      fileUrl: data.fileUrl,
      fileSize: data.fileSize,
      mimeType: data.mimeType,
      uploadedBy: userId,
    },
  });

  return attachment;
}
