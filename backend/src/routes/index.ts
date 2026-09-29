import { Router } from 'express';

import { healthController } from '../controllers/healthController.js';

export const routes = Router();

routes.get('/health', healthController);
