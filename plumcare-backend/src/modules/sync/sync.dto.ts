import {
  IsString,
  IsOptional,
  IsEnum,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SYNC_EHR_SYSTEMS } from './sync.types.js';

/**
 * DTO for system parameter (sync operations)
 */
export class SyncSystemParamDto {
  @IsEnum(SYNC_EHR_SYSTEMS)
  system!: string;
}

/**
 * DTO for sync events query parameters
 */
export class SyncEventsQueryDto {
  @IsOptional()
  @IsString()
  @IsEnum(SYNC_EHR_SYSTEMS)
  system?: string;

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
