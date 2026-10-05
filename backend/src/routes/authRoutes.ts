import { Router } from 'express';

import { loginController } from '../controllers/authController.js';
import { validate } from '../middlewares/validate.js';
import { loginSchema } from '../schemas/authSchema.js';

export const authRoutes = Router();

authRoutes.post('/login', validate({ body: loginSchema }), loginController);
