import type { RequestHandler } from "express";
import { frontendOrigin } from "../config.js";
import { AppError } from "../errors/AppError.js";
// SameSite cookie plus explicit Origin checks for browser mutations (including login).
export const originGuard: RequestHandler = (request, _response, next) => {
  const origin = request.headers.origin;
  if (
    !["GET", "HEAD", "OPTIONS"].includes(request.method) &&
    ((origin && origin !== frontendOrigin) ||
      request.headers["sec-fetch-site"] === "cross-site")
  ) {
    return next(
      new AppError(403, "ORIGIN_NOT_ALLOWED", "Origem não autorizada."),
    );
  }
  next();
};
