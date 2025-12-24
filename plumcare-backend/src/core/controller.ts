import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { BadRequestError } from './errors.js';

export abstract class Controller {
  protected async validateDto<T extends object>(
    data: unknown,
    DtoClass: new () => T
  ): Promise<T> {
    const dto = plainToInstance(DtoClass, data);
    const errors = await validate(dto);
    if (errors.length > 0) {
      throw new BadRequestError({ errors });
    }
    return dto;
  }

  protected transformDto<T extends object>(DtoClass: new () => T, data: unknown): T {
    return plainToInstance(DtoClass, data);
  }
}
