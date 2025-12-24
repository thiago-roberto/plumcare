import type { Request, Response, NextFunction } from 'express';
import { HTTPError } from '../core/errors.js';

export function errorMiddleware(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error('Error:', err);

  if (err instanceof HTTPError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        message: err.message,
        statusCode: err.statusCode,
        ...(('errors' in err && err.errors) ? { validationErrors: err.errors } : {}),
      },
    });
    return;
  }

  res.status(500).json({
    success: false,
    error: {
      message: 'Internal server error',
      statusCode: 500,
    },
  });
}
