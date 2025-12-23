import {
  IsEnum,
} from 'class-validator';
import { CONNECTION_EHR_SYSTEMS } from './connections.types.js';

/**
 * DTO for system parameter
 */
export class ConnectionSystemParamDto {
  @IsEnum(CONNECTION_EHR_SYSTEMS)
  system!: string;
}
