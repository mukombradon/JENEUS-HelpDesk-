import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import prisma from '../lib/prisma';
import config from '../config';

// ============================================================================
// Token helpers
// ============================================================================

function signAccessToken(user: {
  id: string;
  email: string;
  role: string;
}): string {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    config.jwt.accessSecret,
    { expiresIn: config.jwt.accessExpiry } as jwt.SignOptions,
  );
}

function signRefreshToken(user: {
  id: string;
  email: string;
  role: string;
}): string {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    config.jwt.refreshSecret,
    { expiresIn: config.jwt.refreshExpiry } as jwt.SignOptions,
  );
}

// ---------------------------------------------------------------------------
// Cookie options for the refresh token
// ---------------------------------------------------------------------------
const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: config.nodeEnv === 'production',
  sameSite: 'strict' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: '/api/v1/auth/refresh',
};

// ============================================================================
// Handlers
// ============================================================================

// ---------------------------------------------------------------------------
// POST /auth/login
// ---------------------------------------------------------------------------
export async function login(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { email, password } = req.body;

    // 1. Look up user
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(401).json({
        error: {
          message: 'Invalid email or password',
          code: 'INVALID_CREDENTIALS',
        },
      });
      return;
    }

    // 2. Check active status
    if (!user.isActive) {
      res.status(403).json({
        error: {
          message: 'Account is deactivated',
          code: 'ACCOUNT_DEACTIVATED',
        },
      });
      return;
    }

    // 3. Verify password
    const passwordValid = await bcrypt.compare(password, user.passwordHash);
    if (!passwordValid) {
      res.status(401).json({
        error: {
          message: 'Invalid email or password',
          code: 'INVALID_CREDENTIALS',
        },
      });
      return;
    }

    // 4. Update last login timestamp
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // 5. Sign tokens
    const payload = { id: user.id, email: user.email, role: user.role };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    // 6. Set refresh cookie
    res.cookie('refreshToken', refreshToken, REFRESH_COOKIE_OPTIONS);

    // 7. Respond
    res.json({
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        avatarUrl: user.avatarUrl,
      },
      accessToken,
    });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// POST /auth/refresh
// ---------------------------------------------------------------------------
export async function refresh(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const token: string | undefined = req.cookies?.refreshToken;
    if (!token) {
      res.status(401).json({
        error: { message: 'Unauthorized', code: 'UNAUTHORIZED' },
      });
      return;
    }

    // 1. Verify refresh token
    let decoded: { id: string; email: string; role: string };
    try {
      decoded = jwt.verify(
        token,
        config.jwt.refreshSecret,
      ) as typeof decoded;
    } catch {
      res.status(401).json({
        error: { message: 'Unauthorized', code: 'UNAUTHORIZED' },
      });
      return;
    }

    // 2. Confirm user still exists and is active
    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user || !user.isActive) {
      res.status(401).json({
        error: { message: 'Unauthorized', code: 'UNAUTHORIZED' },
      });
      return;
    }

    // 3. Issue new access token
    const accessToken = signAccessToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    res.json({ accessToken });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// POST /auth/logout
// ---------------------------------------------------------------------------
export async function logout(
  _req: Request,
  res: Response,
): Promise<void> {
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: config.nodeEnv === 'production',
    sameSite: 'strict',
    path: '/api/v1/auth/refresh',
  });
  res.json({ message: 'Logged out successfully' });
}

// ---------------------------------------------------------------------------
// POST /auth/forgot-password
//
// NOTE: This endpoint relies on `resetToken` and `resetTokenExpiry` fields on
//       the User model. These fields need to be added to prisma/schema.prisma
//       before the database persistence works — see the Prisma migration step
//       documented in the project setup guide.
// ---------------------------------------------------------------------------
export async function forgotPassword(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { email } = req.body;

    // Always return the same message regardless of whether the email exists
    // to prevent email-address enumeration.
    const genericMessage =
      'If an account with that email exists, a password reset link has been sent.';

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.json({ message: genericMessage });
      return;
    }

    // Generate a cryptographically random reset token (valid for 1 hour)
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000);

    // Persist token (requires resetToken / resetTokenExpiry on the User model)
    await (prisma.user as any).update({
      where: { id: user.id },
      data: { resetToken, resetTokenExpiry },
    });

    // Send password-reset email
    const transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.port === 465,
      auth: {
        user: config.smtp.user,
        pass: config.smtp.pass,
      },
    });

    const resetUrl = `${config.frontendUrl}/reset-password?token=${resetToken}`;

    await transporter.sendMail({
      from: config.smtp.from,
      to: email,
      subject: 'JENEUS HelpDesk - Password Reset Request',
      html: `
        <h2>Password Reset Request</h2>
        <p>You requested a password reset for your JENEUS HelpDesk account.</p>
        <p>Click the link below to reset your password. This link expires in 1 hour.</p>
        <p style="text-align:center;margin:32px 0">
          <a href="${resetUrl}"
             style="display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;font-size:16px">
            Reset Password
          </a>
        </p>
        <p style="color:#6b7280;font-size:13px">
          If you did not request a password reset, please ignore this email.
        </p>
      `,
    });

    res.json({ message: genericMessage });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// POST /auth/reset-password
//
// NOTE: Same schema-dependency as forgotPassword — the User model must
//       include resetToken & resetTokenExpiry fields.
// ---------------------------------------------------------------------------
export async function resetPassword(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { token, password } = req.body;

    // Look up a user whose reset token matches and hasn't expired
    const user = await (prisma.user as any).findFirst({
      where: {
        resetToken: token,
        resetTokenExpiry: { gte: new Date() },
      },
    });

    if (!user) {
      res.status(400).json({
        error: {
          message: 'Invalid or expired reset token',
          code: 'INVALID_RESET_TOKEN',
        },
      });
      return;
    }

    // Hash the new password and clear the reset fields
    const passwordHash = await bcrypt.hash(password, 12);

    await (prisma.user as any).update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    res.json({ message: 'Password has been reset successfully.' });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// GET /auth/me
// ---------------------------------------------------------------------------
export async function getMe(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        error: { message: 'Unauthorized', code: 'UNAUTHORIZED' },
      });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
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
      },
    });

    if (!user) {
      res.status(401).json({
        error: { message: 'Unauthorized', code: 'UNAUTHORIZED' },
      });
      return;
    }

    res.json({ user });
  } catch (err) {
    next(err);
  }
}
