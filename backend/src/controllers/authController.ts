import type { RequestHandler } from 'express';

import { authService } from '../services/authService.js';
import type { LoginInput } from '../schemas/authSchema.js';

export const loginController: RequestHandler = async (request, response, next) => {
  try {
    const result = await authService.login(request.body as LoginInput);

    response.cookie('access_token', result.token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: result.maxAgeMs,
    });

    response.status(200).json({ usuario: result.usuario });
  } catch (error) {
    next(error);
  }
};
