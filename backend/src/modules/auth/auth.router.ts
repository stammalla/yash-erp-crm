import { Router } from 'express';
import { validate } from '../../middleware/validate';
import { loginSchema } from './auth.schema';
import { loginHandler } from './auth.controller';

export const authRouter = Router();
authRouter.post('/login', validate(loginSchema), loginHandler);
