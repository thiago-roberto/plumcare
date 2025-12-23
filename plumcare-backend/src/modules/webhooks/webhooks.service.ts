import type { Resource, Patient, Encounter, DiagnosticReport, Task } from '@medplum/fhirtypes';
import { addSyncEvent } from '../sync/sync.service.js';
import { redis, CacheTTL } from '../../core/database/index.js';
import type { WebhookEvent, WebhookAction } from './webhooks.types.js';

// In-memory fallback for webhook events
const webhookEventsFallback: WebhookEvent[] = [];
const WEBHOOK_EVENTS_KEY = 'webhooks:events';
const MAX_EVENTS = 100;

/**
 * Webhooks Service
 *
 * Handles webhook event processing and storage.
 */

/**
 * Store a webhook event (Redis with fallback)
 */
async function storeWebhookEvent(event: WebhookEvent): Promise<void> {
  if (redis.isReady()) {
    await redis.lpush(WEBHOOK_EVENTS_KEY, event);
    await redis.ltrim(WEBHOOK_EVENTS_KEY, 0, MAX_EVENTS - 1);
    await redis.expire(WEBHOOK_EVENTS_KEY, CacheTTL.WEBHOOK_EVENTS);
  } else {
    webhookEventsFallback.unshift(event);
    if (webhookEventsFallback.length > MAX_EVENTS) {
      webhookEventsFallback.pop();
    }
  }
}

/**
 * Create a webhook event from an incoming resource
 */
export async function createWebhookEvent(
  resource: Resource,
  subscriptionId?: string
): Promise<WebhookEvent> {
  const action: WebhookAction = 'create';

  const event: WebhookEvent = {
    id: `webhook-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
    resourceType: resource.resourceType,
    resourceId: resource.id || 'unknown',
    action,
    subscriptionId,
    payload: resource,
    processed: false,
  };

  await storeWebhookEvent(event);

  return event;
}

/**
 * Process a webhook event based on resource type
 */
export async function processWebhookEvent(event: WebhookEvent): Promise<void> {
  const { resourceType, payload, action } = event;

  switch (resourceType) {
    case 'Patient':
      await handlePatientWebhook(payload as Patient, action);
      break;

    case 'Encounter':
      await handleEncounterWebhook(payload as Encounter, action);
      break;

    case 'DiagnosticReport':
      await handleDiagnosticReportWebhook(payload as DiagnosticReport, action);
      break;

    case 'Task':
      await handleTaskWebhook(payload as Task, action);
      break;

    default:
      console.log(`Unhandled resource type: ${resourceType}`);
  }

  // Mark as processed
  event.processed = true;
}

/**
 * Get webhook events
 */
export async function getWebhookEvents(params?: {
  limit?: number;
  resourceType?: string;
}): Promise<{ events: WebhookEvent[]; total: number }> {
  let allEvents: WebhookEvent[];

  if (redis.isReady()) {
    allEvents = await redis.lrange<WebhookEvent>(WEBHOOK_EVENTS_KEY, 0, MAX_EVENTS - 1);
  } else {
    allEvents = webhookEventsFallback;
  }

  let filteredEvents = allEvents;

  if (params?.resourceType) {
    filteredEvents = allEvents.filter(e => e.resourceType === params.resourceType);
  }

  const limit = params?.limit || 20;

  return {
    events: filteredEvents.slice(0, limit),
    total: filteredEvents.length,
  };
}

/**
 * Get a specific webhook event by ID
 */
export async function getWebhookEventById(id: string): Promise<WebhookEvent | undefined> {
  let allEvents: WebhookEvent[];

  if (redis.isReady()) {
    allEvents = await redis.lrange<WebhookEvent>(WEBHOOK_EVENTS_KEY, 0, MAX_EVENTS - 1);
  } else {
    allEvents = webhookEventsFallback;
  }

  return allEvents.find(e => e.id === id);
}

/**
 * Handle Patient webhooks
 */
async function handlePatientWebhook(
  patient: Patient,
  action: WebhookAction
): Promise<void> {
  console.log(`Patient ${action}: ${patient.id}`);

  await addSyncEvent({
    system: 'athena',
    type: 'patient',
    action: action === 'create' ? 'created' : action === 'update' ? 'updated' : 'deleted',
    resourceId: patient.id || 'unknown',
    status: 'success',
    details: `Patient ${patient.name?.[0]?.given?.[0]} ${patient.name?.[0]?.family} ${action}d via subscription`,
  });

  if (action === 'create') {
    console.log(`New patient registered: ${patient.name?.[0]?.given?.[0]} ${patient.name?.[0]?.family}`);
  }
}

/**
 * Handle Encounter webhooks
 */
async function handleEncounterWebhook(
  encounter: Encounter,
  action: WebhookAction
): Promise<void> {
  console.log(`Encounter ${action}: ${encounter.id}`);

  await addSyncEvent({
    system: 'athena',
    type: 'encounter',
    action: action === 'create' ? 'created' : action === 'update' ? 'updated' : 'deleted',
    resourceId: encounter.id || 'unknown',
    status: 'success',
    details: `Encounter ${encounter.class?.code} ${action}d via subscription`,
  });

  if (action === 'create' && encounter.status === 'planned') {
    console.log(`New appointment scheduled: ${encounter.id}`);
  }
}

/**
 * Handle DiagnosticReport webhooks (lab results)
 */
async function handleDiagnosticReportWebhook(
  report: DiagnosticReport,
  action: WebhookAction
): Promise<void> {
  console.log(`DiagnosticReport ${action}: ${report.id}`);

  await addSyncEvent({
    system: 'athena',
    type: 'diagnostic_report',
    action: action === 'create' ? 'created' : action === 'update' ? 'updated' : 'deleted',
    resourceId: report.id || 'unknown',
    status: 'success',
    details: `Lab result "${report.code?.text || 'Unknown'}" ${action}d via subscription`,
  });

  if (action === 'create') {
    console.log(`New lab result received: ${report.code?.text}`);
  }
}

/**
 * Handle Task webhooks
 */
async function handleTaskWebhook(
  task: Task,
  action: WebhookAction
): Promise<void> {
  console.log(`Task ${action}: ${task.id}`);

  if (action === 'create') {
    console.log(`New task created: ${task.description}`);
  }

  if (action === 'update' && task.status === 'completed') {
    console.log(`Task completed: ${task.id}`);
  }
}
