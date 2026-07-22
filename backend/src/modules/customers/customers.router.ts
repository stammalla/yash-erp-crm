import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { createCustomerSchema, updateCustomerSchema, noteSchema } from './customers.schema';
import * as controller from './customers.controller';

export const customersRouter = Router();
customersRouter.use(authenticate, authorize(['sales', 'admin']));
customersRouter.get('/', controller.list);
customersRouter.post('/', validate(createCustomerSchema), controller.create);
customersRouter.get('/:id', controller.get);
customersRouter.put('/:id', validate(updateCustomerSchema), controller.update);
customersRouter.post('/:id/notes', validate(noteSchema), controller.addNote);
