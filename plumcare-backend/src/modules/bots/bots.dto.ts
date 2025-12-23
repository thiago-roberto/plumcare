import { IsString, IsOptional, IsEnum, MinLength, MaxLength, IsNotEmpty, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

// Bot template keys
export const BOT_TEMPLATE_KEYS = ['welcomeEmail', 'labResultAlert', 'appointmentReminder', 'dataValidation', 'auditLogger'] as const;
export type BotTemplateKey = (typeof BOT_TEMPLATE_KEYS)[number];

// Bot runtime versions
export const BOT_RUNTIME_VERSIONS = ['awslambda', 'vmcontext'] as const;
export type BotRuntimeVersion = (typeof BOT_RUNTIME_VERSIONS)[number];

// Bot subscription interactions
export const BOT_SUBSCRIPTION_INTERACTIONS = ['create', 'update', 'delete'] as const;
export type BotSubscriptionInteraction = (typeof BOT_SUBSCRIPTION_INTERACTIONS)[number];

// Create Bot DTO
export class CreateBotDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(255)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsString()
  @IsNotEmpty()
  code!: string;

  @IsOptional()
  @IsEnum(BOT_RUNTIME_VERSIONS)
  runtimeVersion?: BotRuntimeVersion;
}

// Create Bot from Template DTO
export class CreateBotFromTemplateDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(255)
  name!: string;

  @IsEnum(BOT_TEMPLATE_KEYS, { message: 'Invalid template key' })
  templateKey!: BotTemplateKey;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;
}

// Update Bot DTO
export class UpdateBotDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;
}

// Update Bot Code DTO
export class UpdateBotCodeDto {
  @IsString()
  @IsNotEmpty()
  code!: string;
}

// Execute Bot DTO
export class ExecuteBotDto {
  @IsOptional()
  input?: unknown;
}

// Create Bot Subscription DTO
export class CreateBotSubscriptionDto {
  @IsString()
  @IsNotEmpty()
  criteria!: string;

  @IsOptional()
  @IsEnum(BOT_SUBSCRIPTION_INTERACTIONS)
  interaction?: BotSubscriptionInteraction;
}

// Query DTOs
export class BotListQueryDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 20;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  offset?: number = 0;
}

export class BotExecutionsQueryDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 20;
}

// Param DTOs
export class BotIdParamDto {
  @IsString()
  @IsNotEmpty()
  id!: string;
}

export class TemplateKeyParamDto {
  @IsString()
  @IsNotEmpty()
  key!: string;
}
