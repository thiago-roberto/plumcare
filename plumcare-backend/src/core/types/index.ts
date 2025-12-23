import type { Patient, Encounter, Observation, Condition, DiagnosticReport } from '@medplum/fhirtypes';

// EHR System types
export type EhrSystem = 'athena' | 'elation' | 'nextgen';
export type EhrSystemWithMedplum = EhrSystem | 'medplum';

export const EHR_SYSTEMS: EhrSystem[] = ['athena', 'elation', 'nextgen'];
export const EHR_SYSTEMS_WITH_MEDPLUM: EhrSystemWithMedplum[] = ['athena', 'elation', 'nextgen', 'medplum'];

export interface EhrConnection {
  id: string;
  system: EhrSystem;
  name: string;
  status: 'connected' | 'disconnected' | 'syncing' | 'error';
  lastSync: string;
  patientCount: number;
  encounterCount: number;
  pendingRecords: number;
  apiVersion: string;
  fhirVersion: string;
  capabilities: string[];
}

export interface SyncEvent {
  id: string;
  timestamp: string;
  system: EhrSystem;
  type: 'patient' | 'encounter' | 'observation' | 'condition' | 'diagnostic_report' | 'document' | 'message';
  action: 'created' | 'updated' | 'deleted';
  resourceId: string;
  status: 'success' | 'failed' | 'pending';
  details?: string;
}

export interface PaginationParams {
  limit?: number;
  offset?: number;
  cursor?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export interface SyncResult {
  success: boolean;
  syncedResources: number;
  errors: string[];
  events: SyncEvent[];
}

// Re-export FHIR types for convenience
export type { Patient, Encounter, Observation, Condition, DiagnosticReport };

// EHR-specific patient format (before FHIR transformation)
export interface EhrPatient {
  id: string;
  mrn: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  dateOfBirth: string;
  gender: 'male' | 'female' | 'other' | 'unknown';
  email?: string;
  phone?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  sourceSystem: EhrSystem;
  sourceId: string;
  lastUpdated: string;
}

// EHR-specific encounter format (before FHIR transformation)
export interface EhrEncounter {
  id: string;
  patientId: string;
  type: string;
  status: 'planned' | 'arrived' | 'in-progress' | 'finished' | 'cancelled';
  startTime: string;
  endTime?: string;
  provider?: {
    id: string;
    name: string;
  };
  facility?: {
    id: string;
    name: string;
  };
  reason?: string;
  notes?: string;
  sourceSystem: EhrSystem;
  sourceId: string;
  lastUpdated: string;
}

// EHR System metadata
export interface EhrSystemMeta {
  name: string;
  color: string;
  logo: string;
  description: string;
}

export const ehrSystemMeta: Record<EhrSystem, EhrSystemMeta> = {
  athena: {
    name: 'Athena Health',
    color: '#00857c',
    logo: '/img/integrations/athena.png',
    description: 'Cloud-based EHR with comprehensive revenue cycle management and patient engagement tools.',
  },
  elation: {
    name: 'Elation Health',
    color: '#4f46e5',
    logo: '/img/integrations/elation.png',
    description: 'Primary care-focused EHR designed for independent practices with intuitive workflows.',
  },
  nextgen: {
    name: 'NextGen Healthcare',
    color: '#059669',
    logo: '/img/integrations/nextgen.png',
    description: 'Enterprise EHR solution with specialty-specific templates and interoperability features.',
  },
};

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: PaginationMeta;
}

export interface ApiError {
  message: string;
  code: string;
  details?: unknown;
}

export interface PaginationMeta {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}
