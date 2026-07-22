import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import * as controller from './dashboard.controller';

export const dashboardRouter = Router();
dashboardRouter.use(authenticate);
dashboardRouter.get('/', controller.summary);
