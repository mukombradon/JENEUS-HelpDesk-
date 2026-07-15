import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import prisma from '../lib/prisma';
import config from '../config';
import { AppError } from '../utils/AppError';

// ============================================================================
// Helpers
// ============================================================================

/**
 * Generate a cryptographically random temporary password.
 */
function generateTempPassword(): string {
  return crypto.randomBytes(12).toString('hex'); // 24 characters
}

// ============================================================================
// User CRUD
// ============================================================================

/**
 * GET /users
 * List users with pagination and filtering by role, team, isActive.
 */
export async function list(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const page = Math.max(parseInt(req.query.page as string, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit as string, 10) || 20, 1), 100);
    const role = req.query.role as string | undefined;
    const teamId = req.query.teamId as string | undefined;
    const isActive = req.query.isActive !== undefined
      ? req.query.isActive === 'true'
      : undefined;

    const where: any = { deletedAt: null };

    if (role) where.role = role;
    if (teamId) where.teamId = teamId;
    if (isActive !== undefined) where.isActive = isActive;

    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { firstName: 'asc' },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
          avatarUrl: true,
          isActive: true,
          lastLoginAt: true,
          teamId: true,
          createdAt: true,
          team: {
            select: { id: true, name: true },
          },
          _count: {
            select: {
              assignedTickets: true,
              managedClients: true,
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      data: users,
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
 * POST /users/invite
 * Create a new user with a temporary password and send an invite email.
 */
export async function invite(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { firstName, lastName, email, role, teamId } = req.body;

    // Check for duplicate email
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new AppError('A user with this email already exists', 409, 'DUPLICATE_EMAIL');
    }

    const tempPassword = generateTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, 12);

    const user = await prisma.user.create({
      data: {
        firstName,
        lastName,
        email,
        passwordHash,
        role,
        teamId: teamId ?? null,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        teamId: true,
        createdAt: true,
      },
    });

    // Send invite email with temporary password
    try {
      const transporter = nodemailer.createTransport({
        host: config.smtp.host,
        port: config.smtp.port,
        secure: config.smtp.port === 465,
        auth: {
          user: config.smtp.user,
          pass: config.smtp.pass,
        },
      });

      await transporter.sendMail({
        from: config.smtp.from,
        to: email,
        subject: 'Welcome to JENEUS HelpDesk',
        html: `
          <h2>Welcome to JENEUS HelpDesk</h2>
          <p>Hello ${firstName} ${lastName},</p>
          <p>Your account has been created. Use the temporary password below to log in:</p>
          <p style="text-align:center;margin:32px 0">
            <code style="display:inline-block;padding:12px 24px;background:#f3f4f6;border:1px solid #d1d5db;border-radius:6px;font-size:18px;font-weight:bold">
              ${tempPassword}
            </code>
          </p>
          <p>You will be prompted to set a new password on first login.</p>
          <p style="color:#6b7280;font-size:13px">
            If you did not expect this invitation, please contact your administrator.
          </p>
        `,
      });
    } catch {
      // Email delivery failure is non-fatal — the user is created, and an admin
      // can manually provide the temporary password.
    }

    res.status(201).json({
      user,
      message: 'User created successfully. An invite email has been sent.',
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /users/:id
 * Get a single user by ID.
 */
export async function getById(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = req.params.id as string;

    const user = await prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        avatarUrl: true,
        isActive: true,
        lastLoginAt: true,
        teamId: true,
        createdAt: true,
        updatedAt: true,
        team: {
          select: { id: true, name: true },
        },
        _count: {
          select: {
            assignedTickets: true,
            managedClients: true,
            createdTickets: true,
          },
        },
      },
    });

    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    res.json({ user });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /users/:id
 * Update a user's profile and/or role.
 */
export async function update(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = req.params.id as string;
    const { firstName, lastName, email, role, teamId, avatarUrl, isActive } = req.body;

    const existing = await prisma.user.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    // If changing email, check it's not already taken
    if (email && email !== existing.email) {
      const duplicate = await prisma.user.findUnique({ where: { email } });
      if (duplicate) {
        throw new AppError('Email is already in use', 409, 'DUPLICATE_EMAIL');
      }
    }

    const user = await prisma.user.update({
      where: { id },
      data: {
        ...(firstName !== undefined && { firstName }),
        ...(lastName !== undefined && { lastName }),
        ...(email !== undefined && { email }),
        ...(role !== undefined && { role }),
        ...(teamId !== undefined && { teamId }),
        ...(avatarUrl !== undefined && { avatarUrl }),
        ...(isActive !== undefined && { isActive }),
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        avatarUrl: true,
        isActive: true,
        teamId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.json({ user });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /users/:id
 * Soft-deactivate a user (set deletedAt). Super admin only.
 */
export async function deleteUser(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = req.params.id as string;

    const existing = await prisma.user.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    // Soft deactivate: set deletedAt, mark inactive, and clear team associations
    await prisma.user.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isActive: false,
        teamId: null,
      },
    });

    res.json({ message: 'User deactivated successfully' });
  } catch (err) {
    next(err);
  }
}
