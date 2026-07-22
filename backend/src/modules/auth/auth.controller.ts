import { Request, Response, NextFunction } from 'express';
import * as service from './auth.service';

export async function loginHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = req.body;
    res.json(await service.login(email, password));
  } catch (e) { next(e); }
}
