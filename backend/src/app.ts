import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { authRouter } from './modules/auth/auth.router';
import { usersRouter } from './modules/users/users.router';
import { customersRouter } from './modules/customers/customers.router';
import { productsRouter } from './modules/products/products.router';
import { stockRouter } from './modules/stock/stock.router';
import { challansRouter } from './modules/challans/challans.router';
import { invoicesRouter } from './modules/invoices/invoices.router';
import { dashboardRouter } from './modules/dashboard/dashboard.router';
import { errorHandler } from './middleware/errorHandler';

export function createApp() {
  const app = express();
  app.use(helmet());
  app.use(cors({ origin: process.env.FRONTEND_URL ?? '*' }));
  app.use(express.json());
  app.use(morgan('dev'));

  app.get('/health', (_req, res) => res.json({ status: 'ok' }));

  app.use('/auth', authRouter);
  app.use('/users', usersRouter);
  app.use('/customers', customersRouter);
  app.use('/products', productsRouter);
  app.use('/stock-movements', stockRouter);
  app.use('/challans', challansRouter);
  app.use('/invoices', invoicesRouter);
  app.use('/dashboard', dashboardRouter);

  app.use(errorHandler);

  return app;
}
