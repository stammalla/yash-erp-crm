import { Request, Response, NextFunction } from 'express';
import * as service from './users.service';

export async function list(_req: Request, res: Response, next: NextFunction) {
  try { res.json(await service.listUsers()); } catch (e) { next(e); }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try { res.status(201).json(await service.createUser(req.body)); } catch (e) { next(e); }
}
