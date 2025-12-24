import type { ValidationError } from 'class-validator';

export class HTTPError extends Error {
  public statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class BadRequestError extends HTTPError {
  public errors?: ValidationError[];

  constructor({
    message = 'Bad Request',
    errors,
  }: { message?: string; errors?: ValidationError[] } = {}) {
    super(400, message);
    this.errors = errors;
  }
}

export class UnauthorizedError extends HTTPError {
  constructor({ message = 'Unauthorized' }: { message?: string } = {}) {
    super(401, message);
  }
}

export class ForbiddenError extends HTTPError {
  constructor({ message = 'Forbidden' }: { message?: string } = {}) {
    super(403, message);
  }
}

export class NotFoundError extends HTTPError {
  constructor({ message = 'Not Found' }: { message?: string } = {}) {
    super(404, message);
  }
}

export class ConflictError extends HTTPError {
  constructor({ message = 'Conflict' }: { message?: string } = {}) {
    super(409, message);
  }
}

export class InternalServerError extends HTTPError {
  constructor({ message = 'Internal Server Error' }: { message?: string } = {}) {
    super(500, message);
  }
}
