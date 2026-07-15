import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';

export function errorHandler(
  err: Error | AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const statusCode = err instanceof AppError ? err.statusCode : 500;
  const code = err instanceof AppError ? err.code : 'INTERNAL_ERROR';
  const message = err.message || 'An unexpected error occurred';

  const response: Record<string, unknown> = {
    error: {
      message,
      code,
      statusCode,
    },
  };

  if (process.env.NODE_ENV === 'development') {
    response.error = {
      ...(response.error as Record<string, unknown>),
      stack: err.stack,
    };
  }

  res.status(statusCode).json(response);
}
