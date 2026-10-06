import { Router } from 'express';

import { healthController } from '../controllers/healthController.js';
import { authRoutes } from './authRoutes.js';

export const routes = Router();

routes.get('/health', healthController);
routes.use('/auth', authRoutes);
