import { Request, Response, NextFunction } from 'express';
import { AppError } from '../lib/AppError';
import { AuthUser } from '../types/express';

export function authorize(roles: AuthUser['role'][]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(new AppError(401, 'Not authenticated'));
    if (!roles.includes(req.user.role)) return next(new AppError(403, 'Forbidden'));
    next();
  };
}
