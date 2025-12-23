import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO for webhook event ID parameter
 */
export class WebhookEventIdParamDto {
  @IsString()
  @IsNotEmpty()
  id!: string;
}

/**
 * DTO for webhook events query parameters
 */
export class WebhookEventsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsString()
  resourceType?: string;
}
