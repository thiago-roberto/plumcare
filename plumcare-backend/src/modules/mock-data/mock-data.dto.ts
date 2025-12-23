import {
  IsOptional,
  IsInt,
  IsBoolean,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO for mock data sync request body
 */
export class SyncMockDataDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  patientCount?: number;

  @IsOptional()
  @IsBoolean()
  includeAllData?: boolean;
}
