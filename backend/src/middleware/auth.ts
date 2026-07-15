import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import config from '../config';

// ---------------------------------------------------------------------------
// Declaration merging — extends Express Request with an optional `user` property
// ---------------------------------------------------------------------------
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
      };
    }
  }
}

interface JwtPayload {
  id: string;
  email: string;
  role: string;
}

// ---------------------------------------------------------------------------
// authenticate — requires a valid access JWT; 401 if missing / invalid
// ---------------------------------------------------------------------------
export function authenticate(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const authHeader = req.headers.authorization;
  const token =
    authHeader && authHeader.startsWith('Bearer ')
      ? authHeader.slice(7)
      : null;

  if (!token) {
    res.status(401).json({
      error: { message: 'Unauthorized', code: 'UNAUTHORIZED' },
    });
    return;
  }

  try {
    const decoded = jwt.verify(
      token,
      config.jwt.accessSecret,
    ) as JwtPayload & jwt.JwtPayload;

    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
    };

    next();
  } catch {
    res.status(401).json({
      error: { message: 'Unauthorized', code: 'UNAUTHORIZED' },
    });
  }
}

// ---------------------------------------------------------------------------
// optionalAuth — attaches user to req if a valid token is present, otherwise
//                continues silently without setting req.user
// ---------------------------------------------------------------------------
export function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const authHeader = req.headers.authorization;
  const token =
    authHeader && authHeader.startsWith('Bearer ')
      ? authHeader.slice(7)
      : null;

  if (!token) {
    next();
    return;
  }

  try {
    const decoded = jwt.verify(
      token,
      config.jwt.accessSecret,
    ) as JwtPayload & jwt.JwtPayload;

    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
    };
  } catch {
    // Token invalid or expired — continue without user
  }

  next();
}
