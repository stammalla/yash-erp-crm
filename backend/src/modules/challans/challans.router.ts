import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { createChallanSchema, updateChallanSchema } from './challans.schema';
import * as controller from './challans.controller';

export const challansRouter = Router();
challansRouter.use(authenticate, authorize(['sales', 'admin']));
challansRouter.get('/', controller.list);
challansRouter.post('/', validate(createChallanSchema), controller.create);
challansRouter.get('/:id', controller.get);
challansRouter.put('/:id', validate(updateChallanSchema), controller.update);
challansRouter.post('/:id/confirm', controller.confirm);
challansRouter.post('/:id/cancel', controller.cancel);
