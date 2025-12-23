import type { Encounter } from '@medplum/fhirtypes';

/**
 * EHR source system tag URL
 */
export const EHR_SOURCE_SYSTEM = 'http://plumcare.io/ehr-source';

/**
 * Valid EHR systems
 */
export const VALID_EHR_SYSTEMS = ['athena', 'elation', 'nextgen', 'medplum'] as const;
export type EhrSystem = (typeof VALID_EHR_SYSTEMS)[number];

/**
 * Paginated response for encounters
 */
export interface PaginatedEncountersResponse {
  data: Encounter[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
  system: EhrSystem;
  source: 'medplum';
}

/**
 * Single encounter response
 */
export interface EncounterResponse {
  data: Encounter;
  system: EhrSystem;
  source: 'medplum';
}

/**
 * Patient encounters response
 */
export interface PatientEncountersResponse extends PaginatedEncountersResponse {
  patientId: string;
}
