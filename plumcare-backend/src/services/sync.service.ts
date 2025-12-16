import { v4 as uuidv4 } from 'uuid';
import type { EhrSystem, SyncEvent, SyncResult } from '../types/index.js';
import { getProvider, type ProviderConfig } from '../providers/base.provider.js';
import { transformPatientsBatch, transformEncountersBatch } from './transform.service.js';
import { batchUpsertResources, createSyncAuditEvent } from './medplum.service.js';
import { config } from '../config/index.js';

// In-memory store for sync events (in production, use database)
const syncEvents: SyncEvent[] = [];

/**
 * Get configuration for a specific EHR system
 */
function getProviderConfig(system: EhrSystem): ProviderConfig {
  return config[system] as ProviderConfig;
}

/**
 * Perform a full sync for an EHR system
 */
export async function performSync(system: EhrSystem): Promise<SyncResult> {
  const startTime = Date.now();
  const events: SyncEvent[] = [];
  const errors: string[] = [];
  let syncedResources = 0;

  try {
    const providerConfig = getProviderConfig(system);
    const provider = getProvider(system, providerConfig);

    // Authenticate
    await provider.authenticate();

    // Sync patients
    const patientsResult = await provider.getPatients({ limit: 100 });
    if (patientsResult.data.length > 0) {
      const fhirPatients = transformPatientsBatch(patientsResult.data);

      try {
        await batchUpsertResources(fhirPatients);
        syncedResources += fhirPatients.length;

        for (const patient of fhirPatients) {
          const event = createSyncEvent(system, 'patient', 'created', patient.id!, 'success', 'Patient synced successfully');
          events.push(event);
          syncEvents.unshift(event);
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`Failed to sync patients: ${errorMsg}`);

        const event = createSyncEvent(system, 'patient', 'created', 'batch', 'failed', errorMsg);
        events.push(event);
        syncEvents.unshift(event);
      }
    }

    // Sync encounters
    const encountersResult = await provider.getEncounters({ limit: 100 });
    if (encountersResult.data.length > 0) {
      const fhirEncounters = transformEncountersBatch(encountersResult.data);

      try {
        await batchUpsertResources(fhirEncounters);
        syncedResources += fhirEncounters.length;

        for (const encounter of fhirEncounters) {
          const event = createSyncEvent(system, 'encounter', 'created', encounter.id!, 'success', 'Encounter synced successfully');
          events.push(event);
          syncEvents.unshift(event);
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`Failed to sync encounters: ${errorMsg}`);

        const event = createSyncEvent(system, 'encounter', 'created', 'batch', 'failed', errorMsg);
        events.push(event);
        syncEvents.unshift(event);
      }
    }

    // Log audit event
    await createSyncAuditEvent({
      action: 'C',
      outcome: errors.length === 0 ? '0' : '4',
      source: system,
      description: `Synced ${syncedResources} resources from ${system} in ${Date.now() - startTime}ms`,
    }).catch(console.error);

    return {
      success: errors.length === 0,
      syncedResources,
      errors,
      events,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    errors.push(`Sync failed: ${errorMsg}`);

    const event = createSyncEvent(system, 'patient', 'created', 'sync', 'failed', errorMsg);
    events.push(event);
    syncEvents.unshift(event);

    return {
      success: false,
      syncedResources,
      errors,
      events,
    };
  }
}

/**
 * Get recent sync events
 */
export function getSyncEvents(params?: {
  system?: EhrSystem;
  limit?: number;
  offset?: number;
}): { events: SyncEvent[]; total: number } {
  let filtered = syncEvents;

  if (params?.system) {
    filtered = filtered.filter(e => e.system === params.system);
  }

  const limit = params?.limit || 20;
  const offset = params?.offset || 0;

  return {
    events: filtered.slice(offset, offset + limit),
    total: filtered.length,
  };
}

/**
 * Create a sync event
 */
function createSyncEvent(
  system: EhrSystem,
  type: SyncEvent['type'],
  action: SyncEvent['action'],
  resourceId: string,
  status: SyncEvent['status'],
  details?: string
): SyncEvent {
  return {
    id: `sync-${uuidv4()}`,
    timestamp: new Date().toISOString(),
    system,
    type,
    action,
    resourceId,
    status,
    details,
  };
}

/**
 * Add a manual sync event (for testing/demo)
 */
export function addSyncEvent(event: Omit<SyncEvent, 'id' | 'timestamp'>): SyncEvent {
  const fullEvent: SyncEvent = {
    ...event,
    id: `sync-${uuidv4()}`,
    timestamp: new Date().toISOString(),
  };
  syncEvents.unshift(fullEvent);
  return fullEvent;
}

/**
 * Clear all sync events (for testing)
 */
export function clearSyncEvents(): void {
  syncEvents.length = 0;
}

/**
 * Initialize with some demo sync events
 */
export function initializeDemoSyncEvents(): void {
  const demoEvents: Array<Omit<SyncEvent, 'id' | 'timestamp'>> = [
    { system: 'athena', type: 'patient', action: 'updated', resourceId: 'Patient/athena-p-001', status: 'success', details: 'Demographics updated' },
    { system: 'athena', type: 'encounter', action: 'created', resourceId: 'Encounter/athena-e-002', status: 'success', details: 'New office visit created' },
    { system: 'elation', type: 'observation', action: 'created', resourceId: 'Observation/elation-o-001', status: 'success', details: 'Vital signs recorded' },
    { system: 'nextgen', type: 'condition', action: 'updated', resourceId: 'Condition/nextgen-c-001', status: 'success', details: 'Diagnosis status changed' },
    { system: 'athena', type: 'diagnostic_report', action: 'created', resourceId: 'DiagnosticReport/athena-dr-001', status: 'pending', details: 'Lab results pending verification' },
  ];

  // Add with staggered timestamps
  demoEvents.forEach((event, index) => {
    const fullEvent: SyncEvent = {
      ...event,
      id: `sync-demo-${index}`,
      timestamp: new Date(Date.now() - index * 2 * 60 * 1000).toISOString(), // 2 mins apart
    };
    syncEvents.push(fullEvent);
  });
}
