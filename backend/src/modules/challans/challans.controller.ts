import { Request, Response, NextFunction } from 'express';
import { parsePagination } from '../../lib/pagination';
import * as service from './challans.service';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const p = parsePagination(req.query);
    res.json(await service.listChallans(p, req.query.status as string | undefined));
  } catch (e) { next(e); }
}
export async function get(req: Request, res: Response, next: NextFunction) {
  try { res.json(await service.getChallan(req.params.id as string)); } catch (e) { next(e); }
}
export async function create(req: Request, res: Response, next: NextFunction) {
  try { res.status(201).json(await service.createChallan(req.body, req.user!.id)); } catch (e) { next(e); }
}
export async function update(req: Request, res: Response, next: NextFunction) {
  try { res.json(await service.updateChallan(req.params.id as string, req.body)); } catch (e) { next(e); }
}
export async function confirm(req: Request, res: Response, next: NextFunction) {
  try { res.json(await service.confirmChallan(req.params.id as string, req.user!.id)); } catch (e) { next(e); }
}
export async function cancel(req: Request, res: Response, next: NextFunction) {
  try { res.json(await service.cancelChallan(req.params.id as string)); } catch (e) { next(e); }
}
