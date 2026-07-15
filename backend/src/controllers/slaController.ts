import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { AppError } from '../utils/AppError';

// ============================================================================
// SLA Policy Controller
// ============================================================================

/**
 * GET /sla-policies
 * List all SLA policies.
 */
export async function list(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const policies = await prisma.sLAPolicy.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { clients: true, tickets: true },
        },
      },
    });

    res.json({ data: policies });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /sla-policies
 * Create a new SLA policy.
 */
export async function create(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { name, description, rules, businessHoursOnly, businessHours } = req.body;

    const policy = await prisma.sLAPolicy.create({
      data: {
        name,
        description: description ?? null,
        rules,
        businessHoursOnly: businessHoursOnly ?? false,
        businessHours: businessHours ?? null,
      },
    });

    res.status(201).json({ policy });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /sla-policies/:id
 * Get a single SLA policy with client list.
 */
export async function getById(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = req.params.id as string;

    const policy = await prisma.sLAPolicy.findUnique({
      where: { id },
      include: {
        clients: {
          where: { deletedAt: null },
          select: { id: true, name: true, contractTier: true },
        },
      },
    });

    if (!policy) {
      throw new AppError('SLA policy not found', 404, 'SLA_POLICY_NOT_FOUND');
    }

    res.json({ policy });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /sla-policies/:id
 * Update an SLA policy.
 */
export async function update(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = req.params.id as string;
    const { name, description, rules, businessHoursOnly, businessHours } = req.body;

    const existing = await prisma.sLAPolicy.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError('SLA policy not found', 404, 'SLA_POLICY_NOT_FOUND');
    }

    const policy = await prisma.sLAPolicy.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(rules !== undefined && { rules }),
        ...(businessHoursOnly !== undefined && { businessHoursOnly }),
        ...(businessHours !== undefined && { businessHours }),
      },
    });

    res.json({ policy });
  } catch (err) {
    next(err);
  }
}
