import { Request, Response, NextFunction } from 'express';
import { parsePagination } from '../../lib/pagination';
import * as service from './customers.service';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const p = parsePagination(req.query);
    res.json(await service.listCustomers(req.query.search as string | undefined, p));
  } catch (e) { next(e); }
}
export async function get(req: Request, res: Response, next: NextFunction) {
  try { res.json(await service.getCustomer(req.params.id as string)); } catch (e) { next(e); }
}
export async function create(req: Request, res: Response, next: NextFunction) {
  try { res.status(201).json(await service.createCustomer(req.body, req.user!.id)); } catch (e) { next(e); }
}
export async function update(req: Request, res: Response, next: NextFunction) {
  try { res.json(await service.updateCustomer(req.params.id as string, req.body)); } catch (e) { next(e); }
}
export async function addNote(req: Request, res: Response, next: NextFunction) {
  try { res.status(201).json(await service.addNote(req.params.id as string, req.body.note, req.user!.id)); } catch (e) { next(e); }
}
