import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { VALID_EHR_SYSTEMS } from './patients.types.js';

/**
 * DTO for system parameter
 */
export class SystemParamDto {
  @IsEnum(VALID_EHR_SYSTEMS)
  system!: string;
}

/**
 * DTO for system and patient ID parameters
 */
export class PatientParamDto {
  @IsEnum(VALID_EHR_SYSTEMS)
  system!: string;

  @IsString()
  @IsNotEmpty()
  id!: string;
}

/**
 * DTO for pagination query parameters
 */
export class PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;
}
