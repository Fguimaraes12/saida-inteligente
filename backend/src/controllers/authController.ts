import { cookieOptions } from "../config.js";
import type { RequestHandler } from "express";

import { authService } from "../services/authService.js";
import type { LoginInput } from "../schemas/authSchema.js";

export const loginController: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const result = await authService.login(request.body as LoginInput);

    response.cookie("access_token", result.token, {
      ...cookieOptions,
      maxAge: result.maxAgeMs,
    });

    response.status(200).json({ usuario: result.usuario });
  } catch (error) {
    next(error);
  }
};
