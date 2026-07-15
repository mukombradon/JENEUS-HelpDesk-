import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';
import config from '../config';
import { AppError } from '../utils/AppError';

// ============================================================================
// Client Portal Controller
// ============================================================================

/**
 * POST /portal/login
 * Authenticate a client contact by email + password.
 * Client contacts use a separate auth flow from staff users.
 *
 * NOTE: This requires a `passwordHash` field on the ClientContact model.
 * If the field does not exist in your schema, add it via a migration.
 */
export async function portalLogin(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { email, password } = req.body;

    // 1. Look up the contact
    const contact = await prisma.clientContact.findUnique({
      where: { email },
      include: {
        client: {
          select: { id: true, name: true, isActive: true },
        },
      },
    });

    if (!contact) {
      res.status(401).json({
        error: { message: 'Invalid email or password', code: 'INVALID_CREDENTIALS' },
      });
      return;
    }

    if (!contact.portalAccess) {
      res.status(403).json({
        error: { message: 'Portal access is disabled for this account', code: 'PORTAL_ACCESS_DISABLED' },
      });
      return;
    }

    if (!contact.client.isActive) {
      res.status(403).json({
        error: { message: 'Client account is inactive', code: 'CLIENT_INACTIVE' },
      });
      return;
    }

    // 2. Verify password
    //    The contact record must have a passwordHash for portal login.
    const passwordHash = (contact as any).passwordHash;
    if (!passwordHash) {
      res.status(401).json({
        error: {
          message: 'Portal login not set up for this account. Please contact support.',
          code: 'PORTAL_NOT_CONFIGURED',
        },
      });
      return;
    }

    const passwordValid = await bcrypt.compare(password, passwordHash);
    if (!passwordValid) {
      res.status(401).json({
        error: { message: 'Invalid email or password', code: 'INVALID_CREDENTIALS' },
      });
      return;
    }

    // 3. Issue a short-lived JWT for portal sessions
    const token = jwt.sign(
      {
        sub: contact.id,
        clientId: contact.clientId,
        email: contact.email,
        type: 'portal',
      },
      config.jwt.accessSecret,
      { expiresIn: '2h' } as jwt.SignOptions,
    );

    res.json({
      contact: {
        id: contact.id,
        firstName: contact.firstName,
        lastName: contact.lastName,
        email: contact.email,
        role: contact.role,
        clientId: contact.clientId,
        clientName: contact.client.name,
      },
      token,
    });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// Helper: extract portal contact from request
// ---------------------------------------------------------------------------

function getPortalContact(req: Request): { contactId: string; clientId: string } {
  const authHeader = req.headers.authorization;
  const token =
    authHeader && authHeader.startsWith('Bearer ')
      ? authHeader.slice(7)
      : null;

  if (!token) {
    throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  }

  try {
    const decoded = jwt.verify(token, config.jwt.accessSecret) as {
      sub: string;
      clientId: string;
      email: string;
      type: string;
    };

    if (decoded.type !== 'portal') {
      throw new AppError('Invalid token type', 401, 'UNAUTHORIZED');
    }

    return { contactId: decoded.sub, clientId: decoded.clientId };
  } catch {
    throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  }
}

// ---------------------------------------------------------------------------
// Portal middleware — extracts and attaches portal contact info
// ---------------------------------------------------------------------------

export function portalAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  try {
    const portal = getPortalContact(req);
    (req as any).portalContact = portal;
    next();
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// Ticket endpoints
// ---------------------------------------------------------------------------

/**
 * GET /portal/tickets
 * List tickets for the authenticated contact's client company.
 */
export async function listTickets(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { clientId } = (req as any).portalContact as {
      contactId: string;
      clientId: string;
    };

    const page = Math.max(parseInt(req.query.page as string, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit as string, 10) || 20, 1), 100);
    const status = req.query.status as string | undefined;

    const where: any = {
      clientId,
      deletedAt: null,
    };

    if (status) where.status = status;

    const skip = (page - 1) * limit;

    const [tickets, total] = await Promise.all([
      prisma.ticket.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          ticketNumber: true,
          title: true,
          status: true,
          priority: true,
          type: true,
          createdAt: true,
          updatedAt: true,
          assignedAgent: {
            select: { id: true, firstName: true, lastName: true },
          },
          category: { select: { name: true } },
        },
      }),
      prisma.ticket.count({ where }),
    ]);

    res.json({
      data: tickets,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /portal/tickets
 * Create a ticket from the client portal (limited fields).
 */
export async function createTicket(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { contactId, clientId } = (req as any).portalContact as {
      contactId: string;
      clientId: string;
    };

    const { title, description, categoryId, priority } = req.body;

    // Generate ticket number
    const lastTicket = await prisma.ticket.findFirst({
      where: { type: 'incident', deletedAt: null },
      orderBy: { createdAt: 'desc' },
      select: { ticketNumber: true },
    });

    let nextSeq = 1;
    if (lastTicket) {
      const match = lastTicket.ticketNumber.match(/(\d+)$/);
      if (match) nextSeq = parseInt(match[1], 10) + 1;
    }
    const ticketNumber = `INC-${String(nextSeq).padStart(5, '0')}`;

    // Calculate SLA deadlines
    const sla = await calculateSlaDeadlines(clientId, priority ?? 'medium');

    const ticket = await prisma.ticket.create({
      data: {
        ticketNumber,
        type: 'incident',
        title,
        description,
        priority: priority ?? 'medium',
        clientId,
        contactId,
        categoryId: categoryId ?? null,
        createdBy: contactId, // portal tickets use contactId as creator reference
        source: 'portal',
        slaPolicyId: sla.slaPolicyId,
        responseDueAt: sla.responseDueAt,
        resolutionDueAt: sla.resolutionDueAt,
      },
      include: {
        category: { select: { id: true, name: true } },
        assignedAgent: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    res.status(201).json({ ticket });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /portal/tickets/:id
 * Get a ticket by ID — only if it belongs to the contact's client.
 */
export async function getTicketById(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { clientId } = (req as any).portalContact as {
      contactId: string;
      clientId: string;
    };
    const id = req.params.id as string;

    const ticket = await prisma.ticket.findFirst({
      where: { id, clientId, deletedAt: null },
      include: {
        category: { select: { id: true, name: true } },
        assignedAgent: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true },
        },
        comments: {
          where: { isInternal: false }, // clients see public comments only
          orderBy: { createdAt: 'asc' },
          include: {
            attachments: true,
          },
        },
        attachments: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!ticket) {
      throw new AppError('Ticket not found', 404, 'TICKET_NOT_FOUND');
    }

    res.json({ ticket });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /portal/tickets/:id/comments
 * Add a public comment to a ticket (client-side only).
 */
export async function addComment(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { contactId, clientId } = (req as any).portalContact as {
      contactId: string;
      clientId: string;
    };
    const id = req.params.id as string;
    const { body } = req.body;

    const ticket = await prisma.ticket.findFirst({
      where: { id, clientId, deletedAt: null },
    });

    if (!ticket) {
      throw new AppError('Ticket not found', 404, 'TICKET_NOT_FOUND');
    }

    const comment = await prisma.comment.create({
      data: {
        ticketId: id,
        authorId: contactId,
        authorType: 'client',
        body,
        isInternal: false,
      },
    });

    res.status(201).json({ comment });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /portal/tickets/:id/reopen
 * Client can reopen a resolved/closed ticket within the configured window.
 */
export async function reopenTicket(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { clientId } = (req as any).portalContact as {
      contactId: string;
      clientId: string;
    };
    const id = req.params.id as string;
    const reopenWindowDays = config.app.reopenWindowDays;

    const ticket = await prisma.ticket.findFirst({
      where: { id, clientId, deletedAt: null },
    });

    if (!ticket) {
      throw new AppError('Ticket not found', 404, 'TICKET_NOT_FOUND');
    }

    if (ticket.status !== 'resolved' && ticket.status !== 'closed') {
      throw new AppError(
        'Only resolved or closed tickets can be reopened',
        400,
        'INVALID_STATUS',
      );
    }

    // Check reopen window
    const resolvedOrClosedAt = ticket.resolvedAt ?? ticket.closedAt;
    if (resolvedOrClosedAt) {
      const windowEnd = new Date(
        resolvedOrClosedAt.getTime() + reopenWindowDays * 24 * 60 * 60 * 1000,
      );
      if (new Date() > windowEnd) {
        throw new AppError(
          `Tickets can only be reopened within ${reopenWindowDays} days of resolution`,
          400,
          'REOPEN_WINDOW_EXPIRED',
        );
      }
    }

    const updated = await prisma.ticket.update({
      where: { id },
      data: {
        status: 'open',
        resolvedAt: null,
        closedAt: null,
      },
    });

    res.json({ ticket: updated });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /portal/tickets/:id/confirm-resolved
 * Mark a ticket as confirmed resolved by the client.
 */
export async function confirmResolved(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { clientId, contactId } = (req as any).portalContact as {
      contactId: string;
      clientId: string;
    };
    const id = req.params.id as string;

    const ticket = await prisma.ticket.findFirst({
      where: { id, clientId, deletedAt: null },
    });

    if (!ticket) {
      throw new AppError('Ticket not found', 404, 'TICKET_NOT_FOUND');
    }

    if (ticket.status !== 'resolved') {
      throw new AppError('Ticket must be in resolved status to confirm', 400, 'INVALID_STATUS');
    }

    const updated = await prisma.ticket.update({
      where: { id },
      data: {
        status: 'closed',
        closedAt: new Date(),
      },
    });

    // Create a feedback entry (rating optional at this stage)
    const existingFeedback = await prisma.customerFeedback.findFirst({
      where: { ticketId: id, clientContactId: contactId },
    });

    if (!existingFeedback) {
      await prisma.customerFeedback.create({
        data: {
          ticketId: id,
          clientContactId: contactId,
          rating: 0, // placeholder — client can update later
        },
      });
    }

    res.json({ ticket: updated });
  } catch (err) {
    next(err);
  }
}

// ============================================================================
// Internal helpers
// ============================================================================

async function calculateSlaDeadlines(
  clientId: string,
  priority: string,
): Promise<{
  responseDueAt: Date | null;
  resolutionDueAt: Date | null;
  slaPolicyId: string | null;
}> {
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
