import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { createUserSchema } from './users.schema';
import * as controller from './users.controller';

export const usersRouter = Router();
usersRouter.use(authenticate, authorize(['admin']));
usersRouter.get('/', controller.list);
usersRouter.post('/', validate(createUserSchema), controller.create);
