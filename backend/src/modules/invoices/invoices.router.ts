import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { createInvoiceSchema, paymentStatusSchema } from './invoices.schema';
import * as controller from './invoices.controller';

export const invoicesRouter = Router();
invoicesRouter.use(authenticate, authorize(['accounts', 'admin']));
invoicesRouter.get('/', controller.list);
invoicesRouter.post('/', validate(createInvoiceSchema), controller.create);
invoicesRouter.get('/:id', controller.get);
invoicesRouter.get('/:id/pdf', controller.pdf);
invoicesRouter.put('/:id/payment-status', validate(paymentStatusSchema), controller.updatePayment);
