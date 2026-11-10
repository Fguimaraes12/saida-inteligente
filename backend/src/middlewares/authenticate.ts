import type { RequestHandler } from "express";
import { AppError } from "../errors/AppError.js";
import {
  authenticateCookie,
  type AuthUser,
} from "../services/sessionService.js";
export const authenticate: RequestHandler = async (
  request,
  _response,
  next,
) => {
  try {
    request.user = (await authenticateCookie(request.headers.cookie)).user;
    next();
  } catch (error) {
    next(error);
  }
};
export function authorize(...roles: AuthUser["role"][]): RequestHandler {
  return (request, _response, next) => {
    if (!roles.includes(request.user.role))
      return next(
        new AppError(
          403,
          "FORBIDDEN",
          "Perfil sem permissão para esta operação.",
        ),
      );
    next();
  };
}
