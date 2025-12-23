import type { Request, Response, NextFunction } from 'express';
import type { ValidationError } from 'class-validator';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationAppError extends AppError {
  constructor(errors: ValidationError[]) {
    const messages = errors.map(error => {
      const constraints = error.constraints ? Object.values(error.constraints) : [];
      return `${error.property}: ${constraints.join(', ')}`;
    });

    super(400, 'Validation failed', 'VALIDATION_ERROR', messages);
    this.name = 'ValidationAppError';
  }
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error('Error:', err);

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        message: err.message,
        code: err.code,
        details: err.details,
      },
    });
    return;
  }

  res.status(500).json({
    success: false,
    error: {
      message: 'Internal server error',
      code: 'INTERNAL_ERROR',
    },
  });
}
