import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { createProductSchema, updateProductSchema } from './products.schema';
import * as controller from './products.controller';

export const productsRouter = Router();
productsRouter.use(authenticate);
productsRouter.get('/', controller.list);
productsRouter.get('/low-stock', authorize(['warehouse', 'admin']), controller.lowStock);
productsRouter.get('/:id', controller.get);
productsRouter.post('/', authorize(['warehouse', 'admin']), validate(createProductSchema), controller.create);
productsRouter.put('/:id', authorize(['warehouse', 'admin']), validate(updateProductSchema), controller.update);
