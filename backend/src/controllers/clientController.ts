import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { AppError } from '../utils/AppError';

// ============================================================================
// Client CRUD
// ============================================================================

/**
 * GET /clients
 * List clients with pagination and filtering by name, isActive.
 */
export async function list(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const page = Math.max(parseInt(req.query.page as string, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit as string, 10) || 20, 1), 100);
    const name = (req.query.name as string) || undefined;
    const isActive = req.query.isActive !== undefined
      ? req.query.isActive === 'true'
      : undefined;

    const where: any = { deletedAt: null };

    if (name) {
      where.name = { contains: name, mode: 'insensitive' };
    }
    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const skip = (page - 1) * limit;

    const [clients, total] = await Promise.all([
      prisma.client.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        include: {
          accountManager: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          slaPolicy: {
            select: { id: true, name: true },
          },
          _count: {
            select: { tickets: true, contacts: true },
          },
        },
      }),
      prisma.client.count({ where }),
    ]);

    res.json({
      data: clients,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /clients
 * Create a new client.
 */
export async function create(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const {
      name,
      industry,
      contractTier,
      slaPolicyId,
      accountManagerId,
    } = req.body;

    const client = await prisma.client.create({
      data: {
        name,
        industry: industry ?? null,
        contractTier,
        slaPolicyId: slaPolicyId ?? null,
        accountManagerId: accountManagerId ?? null,
      },
      include: {
        accountManager: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        slaPolicy: {
          select: { id: true, name: true },
        },
      },
    });

    res.status(201).json({ client });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /clients/:id
 * Get a single client with contacts and ticket count.
 */
export async function getById(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = req.params.id as string;

    const client = await prisma.client.findFirst({
      where: { id, deletedAt: null },
      include: {
        contacts: {
          orderBy: { firstName: 'asc' },
        },
        accountManager: {
          select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true },
        },
        slaPolicy: true,
        _count: {
          select: { tickets: true },
        },
      },
    });

    if (!client) {
      throw new AppError('Client not found', 404, 'CLIENT_NOT_FOUND');
    }

    res.json({ client });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /clients/:id
 * Update a client's fields.
 */
export async function update(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = req.params.id as string;
    const {
      name,
      industry,
      contractTier,
      slaPolicyId,
      accountManagerId,
      isActive,
      logoUrl,
    } = req.body;

    const existing = await prisma.client.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) {
      throw new AppError('Client not found', 404, 'CLIENT_NOT_FOUND');
    }

    const client = await prisma.client.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(industry !== undefined && { industry }),
        ...(contractTier !== undefined && { contractTier }),
        ...(slaPolicyId !== undefined && { slaPolicyId }),
        ...(accountManagerId !== undefined && { accountManagerId }),
        ...(isActive !== undefined && { isActive }),
        ...(logoUrl !== undefined && { logoUrl }),
      },
      include: {
        accountManager: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        slaPolicy: {
          select: { id: true, name: true },
        },
      },
    });

    res.json({ client });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /clients/:id
 * Soft-delete a client. Super admin only.
 */
export async function deleteClient(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = req.params.id as string;

    const existing = await prisma.client.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) {
      throw new AppError('Client not found', 404, 'CLIENT_NOT_FOUND');
    }

    await prisma.client.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    res.json({ message: 'Client deleted successfully' });
  } catch (err) {
    next(err);
  }
}

// ============================================================================
// Client Contacts
// ============================================================================

/**
 * GET /clients/:id/contacts
 * List contacts for a client.
 */
export async function getContacts(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const clientId = req.params.id as string;

    const client = await prisma.client.findFirst({
      where: { id: clientId, deletedAt: null },
    });
    if (!client) {
      throw new AppError('Client not found', 404, 'CLIENT_NOT_FOUND');
    }

    const contacts = await prisma.clientContact.findMany({
      where: { clientId },
      orderBy: { firstName: 'asc' },
      include: {
        _count: { select: { tickets: true } },
      },
    });

    res.json({ contacts });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /clients/:id/contacts
 * Create a new contact for a client.
 */
export async function createContact(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const clientId = req.params.id as string;
    const { firstName, lastName, email, phone, role, isPrimary, portalAccess } = req.body;

    const client = await prisma.client.findFirst({
      where: { id: clientId, deletedAt: null },
    });
    if (!client) {
      throw new AppError('Client not found', 404, 'CLIENT_NOT_FOUND');
    }

    // If setting as primary, unset any existing primary contact for this client
    if (isPrimary) {
      await prisma.clientContact.updateMany({
        where: { clientId, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    const contact = await prisma.clientContact.create({
      data: {
        clientId,
        firstName,
        lastName,
        email,
        phone: phone ?? null,
        role: role ?? 'General',
        isPrimary: isPrimary ?? false,
        portalAccess: portalAccess ?? true,
      },
    });

    // If this is the first contact or marked primary, update client's primaryContactId
    if (isPrimary || !client.primaryContactId) {
      await prisma.client.update({
        where: { id: clientId },
        data: { primaryContactId: contact.id },
      });
    }

    res.status(201).json({ contact });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /clients/:id/contacts/:contactId
 * Update a contact for a client.
 */
export async function updateContact(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const clientId = req.params.id as string;
    const contactId = req.params.contactId as string;
    const { firstName, lastName, email, phone, role, isPrimary, portalAccess } = req.body;

    const contact = await prisma.clientContact.findFirst({
      where: { id: contactId, clientId },
    });
    if (!contact) {
      throw new AppError('Contact not found', 404, 'CONTACT_NOT_FOUND');
    }

    // If setting as primary, unset any existing primary contact for this client
    if (isPrimary) {
      await prisma.clientContact.updateMany({
        where: { clientId, isPrimary: true, id: { not: contactId } },
        data: { isPrimary: false },
      });
    }

    const updated = await prisma.clientContact.update({
      where: { id: contactId },
      data: {
        ...(firstName !== undefined && { firstName }),
        ...(lastName !== undefined && { lastName }),
        ...(email !== undefined && { email }),
        ...(phone !== undefined && { phone }),
        ...(role !== undefined && { role }),
        ...(isPrimary !== undefined && { isPrimary }),
        ...(portalAccess !== undefined && { portalAccess }),
      },
    });

    // Update client's primaryContactId if this contact is now primary
    if (isPrimary) {
      await prisma.client.update({
        where: { id: clientId },
        data: { primaryContactId: contactId },
      });
    }

    res.json({ contact: updated });
  } catch (err) {
    next(err);
  }
}

// ============================================================================
// Client Tickets
// ============================================================================

/**
 * GET /clients/:id/tickets
 * List tickets for a client.
 */
export async function getTickets(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const clientId = req.params.id as string;

    const client = await prisma.client.findFirst({
      where: { id: clientId, deletedAt: null },
    });
    if (!client) {
      throw new AppError('Client not found', 404, 'CLIENT_NOT_FOUND');
    }

    const page = Math.max(parseInt(req.query.page as string, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit as string, 10) || 20, 1), 100);
    const status = req.query.status as string | undefined;
    const type = req.query.type as string | undefined;
    const priority = req.query.priority as string | undefined;

    const where: any = {
      clientId,
      deletedAt: null,
    };

    if (status) where.status = status;
    if (type) where.type = type;
    if (priority) where.priority = priority;

    const skip = (page - 1) * limit;

    const [tickets, total] = await Promise.all([
      prisma.ticket.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          assignedAgent: {
            select: { id: true, firstName: true, lastName: true, avatarUrl: true },
          },
          category: { select: { id: true, name: true } },
        },
      }),
      prisma.ticket.count({ where }),
    ]);

    res.json({
      data: tickets,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    next(err);
  }
}
