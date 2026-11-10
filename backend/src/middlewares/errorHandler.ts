import type { ErrorRequestHandler } from "express";
import { AppError } from "../errors/AppError.js";
import { Prisma } from "../generated/prisma/client.js";
export const errorHandler: ErrorRequestHandler = (
  error,
  _request,
  response,
  _next,
) => {
  if (error?.type === "entity.parse.failed")
    error = new AppError(400, "VALIDATION_ERROR", "JSON inválido.");
  if (error?.type === "entity.too.large")
    error = new AppError(
      413,
      "PAYLOAD_TOO_LARGE",
      "JSON excede o limite de 1 MB.",
    );
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002")
      error = new AppError(
        409,
        "MATRICULA_DUPLICADA",
        "Matrícula já cadastrada.",
      );
    else if (error.code === "P2025")
      error = new AppError(404, "NOT_FOUND", "Registro não encontrado.");
    else if (error.code === "P2003")
      error = new AppError(
        400,
        "INVALID_REFERENCE",
        "Sala ou referência inexistente.",
      );
  }
  if (error instanceof AppError) {
    return response.status(error.statusCode).json({
      error: {
        code: error.code,
        message: error.message,
        ...(error.details === undefined ? {} : { details: error.details }),
      },
    });
  }
  // Do not log request bodies, tokens, database parameters or raw driver errors.
  console.error(
    "Erro interno não tratado.",
    error instanceof Error ? error.name : "UnknownError",
  );
  return response
    .status(500)
    .json({
      error: { code: "INTERNAL_ERROR", message: "Erro interno do servidor." },
    });
};
