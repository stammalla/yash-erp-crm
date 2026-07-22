import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { createMovementSchema } from './stock.schema';
import * as controller from './stock.controller';

export const stockRouter = Router();
stockRouter.use(authenticate, authorize(['warehouse', 'admin']));
stockRouter.get('/', controller.list);
stockRouter.post('/', validate(createMovementSchema), controller.create);
