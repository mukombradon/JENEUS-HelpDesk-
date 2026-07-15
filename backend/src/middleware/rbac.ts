import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@prisma/client';

// ---------------------------------------------------------------------------
// authorize — middleware factory that restricts access to specified roles
//
// Usage:
//   router.get('/admin', authenticate, authorize('admin', 'super_admin'), handler)
// ---------------------------------------------------------------------------
export function authorize(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: { message: 'Unauthorized', code: 'UNAUTHORIZED' },
      });
      return;
    }

    if (!roles.includes(req.user.role as UserRole)) {
      res.status(403).json({
        error: { message: 'Forbidden', code: 'FORBIDDEN' },
      });
      return;
    }

    next();
  };
}
