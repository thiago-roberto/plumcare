// EHR API Types
export type EhrSystem = 'athena' | 'elation' | 'nextgen' | 'medplum';

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
  type: 'patient' | 'encounter' | 'observation' | 'condition' | 'diagnostic_report';
  action: 'created' | 'updated' | 'deleted';
  resourceId: string;
  status: 'success' | 'failed' | 'pending';
  details?: string;
}

export interface EhrSystemMeta {
  name: string;
  color: string;
  logo: string;
  description: string;
}
