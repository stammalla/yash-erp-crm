import { Request, Response, NextFunction } from 'express';
import * as service from './dashboard.service';

export async function summary(req: Request, res: Response, next: NextFunction) {
  try { res.json(await service.summary(req.user!.role)); } catch (e) { next(e); }
}
