import type { Patient, Observation, Condition, DiagnosticReport } from '@medplum/fhirtypes';

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
 * Paginated response for patient resources
 */
export interface PaginatedPatientResponse {
  data: Patient[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
  system: EhrSystem;
  source: 'medplum';
}

/**
 * Single patient response
 */
export interface PatientResponse {
  data: Patient;
  system: EhrSystem;
  source: 'medplum';
}

/**
 * Paginated observations response
 */
export interface PaginatedObservationsResponse {
  data: Observation[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
  system: EhrSystem;
  patientId: string;
  source: 'medplum';
}

/**
 * Paginated conditions response
 */
export interface PaginatedConditionsResponse {
  data: Condition[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
  system: EhrSystem;
  patientId: string;
  source: 'medplum';
}

/**
 * Paginated diagnostic reports response
 */
export interface PaginatedDiagnosticReportsResponse {
  data: DiagnosticReport[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
  system: EhrSystem;
  patientId: string;
  source: 'medplum';
}
