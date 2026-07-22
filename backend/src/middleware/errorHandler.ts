import { Request, Response, NextFunction } from 'express';
import { AppError } from '../lib/AppError';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: err.message, details: err.details });
  }
  console.error(err);
  return res.status(500).json({ error: 'Internal server error' });
}
