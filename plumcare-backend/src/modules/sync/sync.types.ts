/**
 * Valid EHR systems for sync
 */
export const SYNC_EHR_SYSTEMS = ['athena', 'elation', 'nextgen'] as const;
export type SyncEhrSystem = (typeof SYNC_EHR_SYSTEMS)[number];

/**
 * Sync event type
 */
export interface SyncEvent {
  id: string;
  timestamp: string;
  system: SyncEhrSystem;
  type: 'patient' | 'encounter' | 'observation' | 'document' | 'message' | 'diagnostic_report';
  action: 'created' | 'updated' | 'deleted';
  resourceId: string;
  status: 'success' | 'failed' | 'pending';
  details?: string;
}

/**
 * Sync result type
 */
export interface SyncResult {
  success: boolean;
  syncedResources: number;
  errors: string[];
  events: SyncEvent[];
}

/**
 * Sync response
 */
export interface SyncResponse {
  success: boolean;
  system: SyncEhrSystem;
  syncedResources: number;
  errors: string[];
  events: SyncEvent[];
  timestamp: string;
}

/**
 * Sync all response
 */
export interface SyncAllResponse {
  success: boolean;
  totalSyncedResources: number;
  results: Record<SyncEhrSystem, {
    success: boolean;
    syncedResources: number;
    errors: string[];
  }>;
  timestamp: string;
}

/**
 * Sync events query params
 */
export interface SyncEventsQuery {
  system?: SyncEhrSystem;
  limit?: number;
  offset?: number;
}

/**
 * Sync events response
 */
export interface SyncEventsResponse {
  events: SyncEvent[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}
