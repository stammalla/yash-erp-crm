import { Request, Response, NextFunction } from 'express';
import { parsePagination } from '../../lib/pagination';
import * as service from './products.service';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const p = parsePagination(req.query);
    res.json(await service.listProducts(req.query.search as string | undefined, p));
  } catch (e) { next(e); }
}
export async function lowStock(_req: Request, res: Response, next: NextFunction) {
  try { res.json(await service.lowStock()); } catch (e) { next(e); }
}
export async function get(req: Request, res: Response, next: NextFunction) {
  try { res.json(await service.getProduct(req.params.id as string)); } catch (e) { next(e); }
}
export async function create(req: Request, res: Response, next: NextFunction) {
  try { res.status(201).json(await service.createProduct(req.body, req.user!.id)); } catch (e) { next(e); }
}
export async function update(req: Request, res: Response, next: NextFunction) {
  try { res.json(await service.updateProduct(req.params.id as string, req.body)); } catch (e) { next(e); }
}
