import type { Request, Response, NextFunction } from 'express';
import { plainToInstance } from 'class-transformer';
import { validate, type ValidationError } from 'class-validator';
import { ValidationAppError } from './error.middleware.js';

type ClassConstructor<T> = new (...args: unknown[]) => T;

interface ValidateOptions {
  body?: ClassConstructor<unknown>;
  query?: ClassConstructor<unknown>;
  params?: ClassConstructor<unknown>;
}

/**
 * Validation middleware factory
 * Uses class-transformer to convert plain objects to class instances
 * Uses class-validator to validate the instances
 *
 * @example
 * router.post('/', validateRequest({ body: CreateBotDto }), controller.create);
 */
export function validateRequest(options: ValidateOptions) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    const errors: ValidationError[] = [];

    if (options.body) {
      const instance = plainToInstance(options.body, req.body);
      const bodyErrors = await validate(instance as object, {
        whitelist: true,
        forbidNonWhitelisted: false,
        skipMissingProperties: false,
      });
      errors.push(...bodyErrors);
      req.body = instance;
    }

    if (options.query) {
      const instance = plainToInstance(options.query, req.query);
      const queryErrors = await validate(instance as object, {
        whitelist: true,
        forbidNonWhitelisted: false,
        skipMissingProperties: true,
      });
      errors.push(...queryErrors);
      req.query = instance as unknown as typeof req.query;
    }

    if (options.params) {
      const instance = plainToInstance(options.params, req.params);
      const paramsErrors = await validate(instance as object, {
        whitelist: true,
        forbidNonWhitelisted: false,
        skipMissingProperties: false,
      });
      errors.push(...paramsErrors);
      req.params = instance as unknown as typeof req.params;
    }

    if (errors.length > 0) {
      return next(new ValidationAppError(errors));
    }

    next();
  };
}
