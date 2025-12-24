import type { Patient, Encounter, Observation, Condition, DiagnosticReport } from '@medplum/fhirtypes';
import { apiClient } from './client';

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

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export const ehrApi = {
  // Connections
  getConnections: () =>
    apiClient.get<{ connections: EhrConnection[] }>('/api/connections').then(res => res.connections),

  getConnection: (system: EhrSystem) =>
    apiClient.get<EhrConnection>(`/api/connections/${system}`),

  // Sync Events
  getSyncEvents: (params?: { system?: EhrSystem; limit?: number; offset?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.system) searchParams.set('system', params.system);
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.offset) searchParams.set('offset', params.offset.toString());
    const query = searchParams.toString() ? `?${searchParams}` : '';
    return apiClient.get<{ events: SyncEvent[]; total: number }>(`/api/sync/events${query}`);
  },

  triggerSync: (system: EhrSystem) =>
    apiClient.post<{ success: boolean; syncedResources: number; errors: string[] }>(`/api/sync/${system}`),

  // Patients
  getPatientsByEhr: (system: EhrSystem, params?: { limit?: number; offset?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.offset) searchParams.set('offset', params.offset.toString());
    const query = searchParams.toString() ? `?${searchParams}` : '';
    return apiClient.get<PaginatedResponse<Patient>>(`/api/${system}/patients${query}`);
  },

  getPatientByEhr: (system: EhrSystem, patientId: string) =>
    apiClient.get<{ data: Patient }>(`/api/${system}/patients/${patientId}`).then(res => res.data),

  // Encounters
  getEncountersByEhr: (system: EhrSystem, params?: { limit?: number; offset?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.offset) searchParams.set('offset', params.offset.toString());
    const query = searchParams.toString() ? `?${searchParams}` : '';
    return apiClient.get<PaginatedResponse<Encounter>>(`/api/${system}/encounters${query}`);
  },

  // Patient resources
  getObservationsByPatient: (system: EhrSystem, patientId: string) =>
    apiClient.get<PaginatedResponse<Observation>>(`/api/${system}/patients/${patientId}/observations`),

  getConditionsByPatient: (system: EhrSystem, patientId: string) =>
    apiClient.get<PaginatedResponse<Condition>>(`/api/${system}/patients/${patientId}/conditions`),

  getDiagnosticReportsByPatient: (system: EhrSystem, patientId: string) =>
    apiClient.get<PaginatedResponse<DiagnosticReport>>(`/api/${system}/patients/${patientId}/diagnostic-reports`),
};

// Aggregate stats helper
export async function getAggregateStats(): Promise<{
  totalPatients: number;
  totalEncounters: number;
  totalPending: number;
  connectedSystems: number;
  totalSystems: number;
}> {
  const connections = await ehrApi.getConnections();

  const totalPatients = connections.reduce((sum, conn) => sum + conn.patientCount, 0);
  const totalEncounters = connections.reduce((sum, conn) => sum + conn.encounterCount, 0);
  const totalPending = connections.reduce((sum, conn) => sum + conn.pendingRecords, 0);
  const connectedSystems = connections.filter(
    conn => conn.status === 'connected' || conn.status === 'syncing'
  ).length;

  return {
    totalPatients,
    totalEncounters,
    totalPending,
    connectedSystems,
    totalSystems: connections.length,
  };
}

// EHR System metadata
export const ehrSystemMeta: Record<EhrSystem, { name: string; color: string; logo: string; description: string }> = {
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
  medplum: {
    name: 'Medplum',
    color: '#7c3aed',
    logo: '/img/integrations/medplum.png',
    description: 'FHIR-native healthcare platform for building custom healthcare applications.',
  },
};
