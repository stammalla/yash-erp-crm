import { Request, Response, NextFunction } from 'express';
import { parsePagination } from '../../lib/pagination';
import * as service from './stock.service';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const p = parsePagination(req.query);
    res.json(await service.listMovements(p, req.query.productId as string | undefined));
  } catch (e) { next(e); }
}
export async function create(req: Request, res: Response, next: NextFunction) {
  try { res.status(201).json(await service.createMovement(req.body, req.user!.id)); } catch (e) { next(e); }
}
