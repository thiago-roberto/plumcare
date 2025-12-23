import { v4 as uuidv4 } from 'uuid';
import type { Bundle } from '@medplum/fhirtypes';
import { getMedplumClient, createSyncAuditEvent } from '../../shared/medplum/index.js';
import { config } from '../../core/config/index.js';
import { getProvider, type ProviderConfig } from '../../providers/base.provider.js';
import type { SyncEhrSystem, SyncEvent, SyncResult, SyncEventsQuery } from './sync.types.js';
import { redis, CacheKeys, CacheTTL } from '../../core/database/index.js';

// EHR-specific transformers
import { parseAthenaJsonToFhir } from '../../transforms/athena.transform.js';
import { parseElationJsonToFhir } from '../../transforms/elation.transform.js';
import { parseNextgenJsonToFhir } from '../../transforms/nextgen.transform.js';

// C-CDA and HL7v2 transformers
import { parseCcdaToFhir } from '../../transforms/ccda.transform.js';
import { parseHL7v2ToFhir } from '../../transforms/hl7v2.transform.js';

// Mock providers
import { AthenaMockProvider } from '../../providers/athena/athena.mock.js';
import { ElationMockProvider } from '../../providers/elation/elation.mock.js';
import { NextGenMockProvider } from '../../providers/nextgen/nextgen.mock.js';

// In-memory fallback when Redis is unavailable
const syncEventsFallback: SyncEvent[] = [];
const SYNC_EVENTS_KEY = 'sync:events';
const MAX_EVENTS = 100;

/**
 * Get configuration for a specific EHR system
 */
function getProviderConfig(system: SyncEhrSystem): ProviderConfig {
  return config[system] as ProviderConfig;
}

/**
 * Execute a FHIR transaction bundle against Medplum
 */
async function executeFhirBundle(bundle: Bundle): Promise<{ success: boolean; resourceCount: number; errors: string[] }> {
  const medplum = getMedplumClient();
  const errors: string[] = [];
  let resourceCount = 0;

  try {
    const result = await medplum.executeBatch(bundle);

    if (result.entry) {
      for (const entry of result.entry) {
        if (entry.response?.status?.startsWith('2')) {
          resourceCount++;
        } else {
          errors.push(`Failed to create resource: ${entry.response?.status}`);
        }
      }
    }

    return { success: errors.length === 0, resourceCount, errors };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error executing bundle';
    errors.push(errorMsg);
    return { success: false, resourceCount, errors };
  }
}

/**
 * Store a sync event (Redis with fallback)
 */
async function storeSyncEvent(event: SyncEvent): Promise<void> {
  if (redis.isReady()) {
    await redis.lpush(SYNC_EVENTS_KEY, event);
    await redis.ltrim(SYNC_EVENTS_KEY, 0, MAX_EVENTS - 1);
    await redis.expire(SYNC_EVENTS_KEY, CacheTTL.SYNC_STATE);
  } else {
    syncEventsFallback.unshift(event);
    if (syncEventsFallback.length > MAX_EVENTS) {
      syncEventsFallback.pop();
    }
  }
}

/**
 * Create a sync event
 */
function createSyncEvent(
  system: SyncEhrSystem,
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
 * Perform a full sync for Athena
 */
async function syncAthena(): Promise<{ syncedResources: number; events: SyncEvent[]; errors: string[] }> {
  const events: SyncEvent[] = [];
  const errors: string[] = [];
  let syncedResources = 0;

  const providerConfig = getProviderConfig('athena');
  const provider = getProvider('athena', providerConfig) as AthenaMockProvider;

  await provider.authenticate();

  // 1. Sync REST API data (JSON format)
  const nativeDataResult = await provider.getNativePatientData({ limit: 100 });

  for (const nativeData of nativeDataResult.data) {
    try {
      const fhirBundle = parseAthenaJsonToFhir({
        patient: nativeData.patient,
        encounters: nativeData.encounters,
        problems: nativeData.problems,
        allergies: nativeData.allergies,
        medications: nativeData.medications,
        vitals: nativeData.vitals,
        labResults: nativeData.labResults,
      });

      const result = await executeFhirBundle(fhirBundle);
      syncedResources += result.resourceCount;

      if (result.success) {
        const event = createSyncEvent('athena', 'patient', 'created', `Patient/${nativeData.patient.patientid}`, 'success',
          `[REST API JSON] Synced patient with ${nativeData.encounters.length} encounters, ${nativeData.problems.length} problems`);
        events.push(event);
        await storeSyncEvent(event);
      } else {
        errors.push(...result.errors);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      errors.push(`Failed to transform/sync Athena JSON: ${errorMsg}`);
    }
  }

  // 2. Sync C-CDA Documents
  const ccdaResult = await provider.getCcdaDocuments({ limit: 100 });

  for (const ccdaDoc of ccdaResult.data) {
    try {
      const fhirBundle = parseCcdaToFhir(ccdaDoc);
      const result = await executeFhirBundle(fhirBundle);
      syncedResources += result.resourceCount;

      if (result.success) {
        const event = createSyncEvent('athena', 'document', 'created', `Document/${ccdaDoc.documentId}`, 'success',
          `[C-CDA ${ccdaDoc.templateType}] Parsed XML clinical document to ${result.resourceCount} FHIR resources`);
        events.push(event);
        await storeSyncEvent(event);
      } else {
        errors.push(...result.errors);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      errors.push(`Failed to transform/sync Athena C-CDA: ${errorMsg}`);
    }
  }

  // 3. Sync HL7v2 Messages
  const hl7Result = await provider.getHl7v2Messages({ limit: 100 });

  for (const hl7Msg of hl7Result.data) {
    try {
      const fhirBundle = parseHL7v2ToFhir(hl7Msg);
      const result = await executeFhirBundle(fhirBundle);
      syncedResources += result.resourceCount;

      if (result.success) {
        const event = createSyncEvent('athena', 'message', 'created', `Message/${hl7Msg.parsed.messageControlId}`, 'success',
          `[HL7v2 ${hl7Msg.messageType}] Parsed pipe-delimited message to ${result.resourceCount} FHIR resources`);
        events.push(event);
        await storeSyncEvent(event);
      } else {
        errors.push(...result.errors);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      errors.push(`Failed to transform/sync Athena HL7v2: ${errorMsg}`);
    }
  }

  return { syncedResources, events, errors };
}

/**
 * Perform a full sync for Elation
 */
async function syncElation(): Promise<{ syncedResources: number; events: SyncEvent[]; errors: string[] }> {
  const events: SyncEvent[] = [];
  const errors: string[] = [];
  let syncedResources = 0;

  const providerConfig = getProviderConfig('elation');
  const provider = getProvider('elation', providerConfig) as ElationMockProvider;

  await provider.authenticate();

  // 1. Sync REST API data
  const nativeDataResult = await provider.getNativePatientData({ limit: 100 });

  for (const nativeData of nativeDataResult.data) {
    try {
      const fhirBundle = parseElationJsonToFhir({
        patient: nativeData.patient,
        visitNotes: nativeData.visitNotes,
        problems: nativeData.problems,
        allergies: nativeData.allergies,
        medications: nativeData.medications,
        labOrders: nativeData.labOrders,
      });

      const result = await executeFhirBundle(fhirBundle);
      syncedResources += result.resourceCount;

      if (result.success) {
        const event = createSyncEvent('elation', 'patient', 'created', `Patient/${nativeData.patient.id}`, 'success',
          `[REST API JSON] Synced patient with ${nativeData.visitNotes.length} visits, ${nativeData.problems.length} problems`);
        events.push(event);
        await storeSyncEvent(event);
      } else {
        errors.push(...result.errors);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      errors.push(`Failed to transform/sync Elation JSON: ${errorMsg}`);
    }
  }

  // 2. Sync C-CDA Documents
  const ccdaResult = await provider.getCcdaDocuments({ limit: 100 });

  for (const ccdaDoc of ccdaResult.data) {
    try {
      const fhirBundle = parseCcdaToFhir(ccdaDoc);
      const result = await executeFhirBundle(fhirBundle);
      syncedResources += result.resourceCount;

      if (result.success) {
        const event = createSyncEvent('elation', 'document', 'created', `Document/${ccdaDoc.documentId}`, 'success',
          `[C-CDA ${ccdaDoc.templateType}] Parsed XML clinical document to ${result.resourceCount} FHIR resources`);
        events.push(event);
        await storeSyncEvent(event);
      } else {
        errors.push(...result.errors);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      errors.push(`Failed to transform/sync Elation C-CDA: ${errorMsg}`);
    }
  }

  // 3. Sync HL7v2 Messages
  const hl7Result = await provider.getHl7v2Messages({ limit: 100 });

  for (const hl7Msg of hl7Result.data) {
    try {
      const fhirBundle = parseHL7v2ToFhir(hl7Msg);
      const result = await executeFhirBundle(fhirBundle);
      syncedResources += result.resourceCount;

      if (result.success) {
        const event = createSyncEvent('elation', 'message', 'created', `Message/${hl7Msg.parsed.messageControlId}`, 'success',
          `[HL7v2 ${hl7Msg.messageType}] Parsed pipe-delimited message to ${result.resourceCount} FHIR resources`);
        events.push(event);
        await storeSyncEvent(event);
      } else {
        errors.push(...result.errors);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      errors.push(`Failed to transform/sync Elation HL7v2: ${errorMsg}`);
    }
  }

  return { syncedResources, events, errors };
}

/**
 * Perform a full sync for NextGen
 */
async function syncNextGen(): Promise<{ syncedResources: number; events: SyncEvent[]; errors: string[] }> {
  const events: SyncEvent[] = [];
  const errors: string[] = [];
  let syncedResources = 0;

  const providerConfig = getProviderConfig('nextgen');
  const provider = getProvider('nextgen', providerConfig) as NextGenMockProvider;

  await provider.authenticate();

  // 1. Sync REST API data
  const nativeDataResult = await provider.getNativePatientData({ limit: 100 });

  for (const nativeData of nativeDataResult.data) {
    try {
      const fhirBundle = parseNextgenJsonToFhir({
        patient: nativeData.patient,
        encounters: nativeData.encounters,
        problems: nativeData.problems,
        allergies: nativeData.allergies,
        medications: nativeData.medications,
        labOrders: nativeData.labOrders,
      });

      const result = await executeFhirBundle(fhirBundle);
      syncedResources += result.resourceCount;

      if (result.success) {
        const event = createSyncEvent('nextgen', 'patient', 'created', `Patient/${nativeData.patient.person_id}`, 'success',
          `[REST API JSON] Synced patient with ${nativeData.encounters.length} encounters, ${nativeData.problems.length} problems`);
        events.push(event);
        await storeSyncEvent(event);
      } else {
        errors.push(...result.errors);
        const event = createSyncEvent('nextgen', 'patient', 'created', `Patient/${nativeData.patient.person_id}`, 'failed', result.errors.join('; '));
        events.push(event);
        await storeSyncEvent(event);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      errors.push(`Failed to transform/sync NextGen JSON: ${errorMsg}`);
    }
  }

  // 2. Sync C-CDA Documents
  const ccdaResult = await provider.getCcdaDocuments({ limit: 100 });

  for (const ccdaDoc of ccdaResult.data) {
    try {
      const fhirBundle = parseCcdaToFhir(ccdaDoc);
      const result = await executeFhirBundle(fhirBundle);
      syncedResources += result.resourceCount;

      if (result.success) {
        const event = createSyncEvent('nextgen', 'document', 'created', `Document/${ccdaDoc.documentId}`, 'success',
          `[C-CDA ${ccdaDoc.templateType}] Parsed XML clinical document to ${result.resourceCount} FHIR resources`);
        events.push(event);
        await storeSyncEvent(event);
      } else {
        errors.push(...result.errors);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      errors.push(`Failed to transform/sync NextGen C-CDA: ${errorMsg}`);
    }
  }

  // 3. Sync HL7v2 Messages
  const hl7Result = await provider.getHl7v2Messages({ limit: 100 });

  for (const hl7Msg of hl7Result.data) {
    try {
      const fhirBundle = parseHL7v2ToFhir(hl7Msg);
      const result = await executeFhirBundle(fhirBundle);
      syncedResources += result.resourceCount;

      if (result.success) {
        const event = createSyncEvent('nextgen', 'message', 'created', `Message/${hl7Msg.parsed.messageControlId}`, 'success',
          `[HL7v2 ${hl7Msg.messageType}] Parsed pipe-delimited message to ${result.resourceCount} FHIR resources`);
        events.push(event);
        await storeSyncEvent(event);
      } else {
        errors.push(...result.errors);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      errors.push(`Failed to transform/sync NextGen HL7v2: ${errorMsg}`);
    }
  }

  return { syncedResources, events, errors };
}

/**
 * Perform a full sync for an EHR system
 */
export async function performSync(system: SyncEhrSystem): Promise<SyncResult> {
  const startTime = Date.now();

  try {
    let result: { syncedResources: number; events: SyncEvent[]; errors: string[] };

    switch (system) {
      case 'athena':
        result = await syncAthena();
        break;
      case 'elation':
        result = await syncElation();
        break;
      case 'nextgen':
        result = await syncNextGen();
        break;
      default:
        throw new Error(`Unknown EHR system: ${system}`);
    }

    // Log audit event
    await createSyncAuditEvent({
      action: 'C',
      outcome: result.errors.length === 0 ? '0' : '4',
      source: system,
      description: `Synced ${result.syncedResources} FHIR resources from ${system} (native format) in ${Date.now() - startTime}ms`,
    }).catch(console.error);

    return {
      success: result.errors.length === 0,
      syncedResources: result.syncedResources,
      errors: result.errors,
      events: result.events,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    const event = createSyncEvent(system, 'patient', 'created', 'sync', 'failed', errorMsg);
    await storeSyncEvent(event);

    return {
      success: false,
      syncedResources: 0,
      errors: [`Sync failed: ${errorMsg}`],
      events: [event],
    };
  }
}

/**
 * Get recent sync events
 */
export async function getSyncEvents(params?: SyncEventsQuery): Promise<{ events: SyncEvent[]; total: number }> {
  let allEvents: SyncEvent[];

  if (redis.isReady()) {
    const total = await redis.llen(SYNC_EVENTS_KEY);
    allEvents = await redis.lrange<SyncEvent>(SYNC_EVENTS_KEY, 0, MAX_EVENTS - 1);
  } else {
    allEvents = syncEventsFallback;
  }

  let filtered = allEvents;

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
 * Add a manual sync event (for testing/demo)
 */
export async function addSyncEvent(event: Omit<SyncEvent, 'id' | 'timestamp'>): Promise<SyncEvent> {
  const fullEvent: SyncEvent = {
    ...event,
    id: `sync-${uuidv4()}`,
    timestamp: new Date().toISOString(),
  };
  await storeSyncEvent(fullEvent);
  return fullEvent;
}

/**
 * Clear all sync events (for testing)
 */
export async function clearSyncEvents(): Promise<void> {
  if (redis.isReady()) {
    await redis.delete(SYNC_EVENTS_KEY);
  }
  syncEventsFallback.length = 0;
}

/**
 * Initialize with some demo sync events
 */
export async function initializeDemoSyncEvents(): Promise<void> {
  const demoEvents: Array<Omit<SyncEvent, 'id' | 'timestamp'>> = [
    { system: 'athena', type: 'patient', action: 'created', resourceId: 'Patient/athena-demo-001', status: 'success', details: 'Native Athena JSON → FHIR transformation complete' },
    { system: 'elation', type: 'patient', action: 'created', resourceId: 'Patient/elation-demo-001', status: 'success', details: 'Native Elation JSON → FHIR transformation complete' },
    { system: 'nextgen', type: 'patient', action: 'created', resourceId: 'Patient/nextgen-demo-001', status: 'success', details: 'Native NextGen JSON → FHIR transformation complete' },
  ];

  for (let index = 0; index < demoEvents.length; index++) {
    const event = demoEvents[index];
    const fullEvent: SyncEvent = {
      ...event,
      id: `sync-demo-${index}`,
      timestamp: new Date(Date.now() - index * 2 * 60 * 1000).toISOString(),
    };
    await storeSyncEvent(fullEvent);
  }
}
