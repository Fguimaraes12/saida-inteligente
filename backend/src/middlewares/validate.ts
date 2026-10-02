import type { RequestHandler } from 'express';
import type { ZodType } from 'zod';

import { AppError } from '../errors/AppError.js';

type RequestSchemas = {
  body?: ZodType;
  params?: ZodType;
  query?: ZodType;
};

export function validate(schemas: RequestSchemas): RequestHandler {
  return (request, _response, next) => {
    const validation = [
      ['body', schemas.body, request.body],
      ['params', schemas.params, request.params],
      ['query', schemas.query, request.query],
    ] as const;

    for (const [source, schema, value] of validation) {
      if (!schema) {
        continue;
      }

      const result = schema.safeParse(value);

      if (!result.success) {
        return next(
          new AppError(400, 'VALIDATION_ERROR', 'Dados inválidos.',
            result.error.issues.map((issue) => ({
              path: issue.path.join('.') || source,
              message: issue.message,
            })),
          ),
        );
      }

      if (source === 'body') {
        request.body = result.data;
      } else if (source === 'params') {
        request.params = result.data as typeof request.params;
      }
    }

    next();
  };
}
