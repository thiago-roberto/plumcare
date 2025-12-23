import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsInt,
  Min,
  Max,
  MinLength,
  MaxLength,
  IsUrl,
} from 'class-validator';

/**
 * Subscription interaction types
 */
export const SUBSCRIPTION_INTERACTIONS = ['create', 'update', 'delete'] as const;
export type SubscriptionInteractionType = (typeof SUBSCRIPTION_INTERACTIONS)[number];

/**
 * DTO for creating a new subscription
 */
export class CreateSubscriptionDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(255)
  name!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(255)
  criteria!: string;

  @IsOptional()
  @IsEnum(SUBSCRIPTION_INTERACTIONS)
  interaction?: SubscriptionInteractionType;

  @IsOptional()
  @IsUrl()
  endpoint?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  fhirPathFilter?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(18)
  maxAttempts?: number;
}

/**
 * DTO for updating a subscription
 */
export class UpdateSubscriptionDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  criteria?: string;

  @IsOptional()
  @IsEnum(SUBSCRIPTION_INTERACTIONS)
  interaction?: SubscriptionInteractionType;

  @IsOptional()
  @IsUrl()
  endpoint?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  fhirPathFilter?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(18)
  maxAttempts?: number;
}

/**
 * DTO for subscription ID parameter
 */
export class SubscriptionIdParamDto {
  @IsString()
  @IsNotEmpty()
  id!: string;
}

/**
 * DTO for history query parameters
 */
export class HistoryQueryDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

/**
 * DTO for resending a subscription
 */
export class ResendSubscriptionDto {
  @IsString()
  @IsNotEmpty()
  resourceType!: string;

  @IsString()
  @IsNotEmpty()
  resourceId!: string;
}
