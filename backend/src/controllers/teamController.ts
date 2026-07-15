import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { AppError } from '../utils/AppError';

// ============================================================================
// Team CRUD
// ============================================================================

/**
 * GET /teams
 * List all teams with member count.
 */
export async function list(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const teams = await prisma.team.findMany({
      orderBy: { name: 'asc' },
      include: {
        lead: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        _count: {
          select: {
            members: true,
            assignedTickets: true,
          },
        },
      },
    });

    res.json({ data: teams });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /teams
 * Create a new team.
 */
export async function create(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { name, leadId, description } = req.body;

    // Check for duplicate name using findFirst (name is not a unique field)
    const existing = await prisma.team.findFirst({ where: { name } });
    if (existing) {
      throw new AppError('A team with this name already exists', 409, 'DUPLICATE_TEAM_NAME');
    }

    // If leadId is specified, validate user exists
    if (leadId) {
      const lead = await prisma.user.findFirst({
        where: { id: leadId, deletedAt: null },
      });
      if (!lead) {
        throw new AppError('Team lead user not found', 400, 'LEAD_NOT_FOUND');
      }
    }

    const team = await prisma.team.create({
      data: {
        name,
        leadId: leadId ?? null,
        description: description ?? null,
      },
      include: {
        lead: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    res.status(201).json({ team });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /teams/:id
 * Update a team's fields.
 */
export async function update(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = req.params.id as string;
    const { name, leadId, description } = req.body;

    const existing = await prisma.team.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError('Team not found', 404, 'TEAM_NOT_FOUND');
    }

    // Check for duplicate name if name is being changed
    if (name && name !== existing.name) {
      const duplicate = await prisma.team.findFirst({ where: { name } });
      if (duplicate) {
        throw new AppError('A team with this name already exists', 409, 'DUPLICATE_TEAM_NAME');
      }
    }

    // If leadId is specified, validate user exists
    if (leadId) {
      const lead = await prisma.user.findFirst({
        where: { id: leadId, deletedAt: null },
      });
      if (!lead) {
        throw new AppError('Team lead user not found', 400, 'LEAD_NOT_FOUND');
      }
    }

    const team = await prisma.team.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(leadId !== undefined && { leadId }),
        ...(description !== undefined && { description }),
      },
      include: {
        lead: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        members: {
          select: { id: true, firstName: true, lastName: true, email: true, role: true },
        },
      },
    });

    res.json({ team });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /teams/:id
 * Get a single team with members.
 */
export async function getById(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = req.params.id as string;

    const team = await prisma.team.findUnique({
      where: { id },
      include: {
        lead: {
          select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true },
        },
        members: {
          where: { deletedAt: null },
          orderBy: { firstName: 'asc' },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
            avatarUrl: true,
            isActive: true,
          },
        },
        _count: {
          select: {
            assignedTickets: true,
          },
        },
      },
    });

    if (!team) {
      throw new AppError('Team not found', 404, 'TEAM_NOT_FOUND');
    }

    res.json({ team });
  } catch (err) {
    next(err);
  }
}
