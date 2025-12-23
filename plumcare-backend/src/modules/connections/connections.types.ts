/**
 * Valid EHR systems for connections
 */
export const CONNECTION_EHR_SYSTEMS = ['athena', 'elation', 'nextgen'] as const;
export type ConnectionEhrSystem = (typeof CONNECTION_EHR_SYSTEMS)[number];

/**
 * Connection status
 */
export type ConnectionStatus = 'connected' | 'disconnected' | 'error' | 'syncing';

/**
 * EHR Connection information
 */
export interface EhrConnection {
  id: string;
  system: ConnectionEhrSystem;
  name: string;
  status: ConnectionStatus;
  lastSync: string;
  patientCount: number;
  encounterCount: number;
  pendingRecords: number;
  apiVersion: string;
  fhirVersion: string;
  capabilities: string[];
}

/**
 * Connection list response
 */
export interface ConnectionListResponse {
  connections: EhrConnection[];
  total: number;
}

/**
 * Connection test response
 */
export interface ConnectionTestResponse {
  success: boolean;
  system: ConnectionEhrSystem;
  message: string;
  expiresAt?: string;
}

/**
 * System display names
 */
export const SYSTEM_DISPLAY_NAMES: Record<ConnectionEhrSystem, string> = {
  athena: 'Athena Health',
  elation: 'Elation Health',
  nextgen: 'NextGen Healthcare',
};
