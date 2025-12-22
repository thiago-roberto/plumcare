import { Router } from 'express';
import type { Resource, Patient, Encounter, DiagnosticReport, Task } from '@medplum/fhirtypes';
import { addSyncEvent } from '../services/sync.service.js';
import type { SyncEvent } from '../types/index.js';

const router = Router();

/**
 * Webhook Handlers
 *
 * This is where Medplum sends notifications when subscriptions trigger.
 * Think of this as the "doorbell" - when a change happens in Medplum,
 * it rings this endpoint with the details.
 */

interface WebhookEvent {
  id: string;
  timestamp: string;
  resourceType: string;
  resourceId: string;
  action: 'create' | 'update' | 'delete';
  subscriptionId?: string;
  payload: Resource;
  processed: boolean;
}

// In-memory store for webhook events (for demo purposes)
const webhookEvents: WebhookEvent[] = [];

/**
 * POST /api/webhooks/medplum
 * Main webhook endpoint for Medplum subscriptions
 *
 * When a subscription triggers, Medplum sends a POST request here
 * with the FHIR resource that changed.
 */
router.post('/medplum', async (req, res) => {
  try {
    const resource = req.body as Resource;

    if (!resource || !resource.resourceType) {
      return res.status(400).json({
        success: false,
        error: 'Invalid webhook payload - missing resource',
      });
    }

    // Extract subscription ID from headers if available
    const subscriptionId = req.headers['x-medplum-subscription'] as string;

    // Determine the action based on the resource
    // In real scenarios, you might check meta.versionId or use headers
    const action: 'create' | 'update' | 'delete' = 'create';

    // Create webhook event record
    const webhookEvent: WebhookEvent = {
      id: `webhook-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      resourceType: resource.resourceType,
      resourceId: resource.id || 'unknown',
      action,
      subscriptionId,
      payload: resource,
      processed: false,
    };

    // Store the event
    webhookEvents.unshift(webhookEvent);

    // Keep only last 100 events
    if (webhookEvents.length > 100) {
      webhookEvents.pop();
    }

    // Process the webhook based on resource type
    await processWebhook(webhookEvent);

    console.log(`Webhook received: ${resource.resourceType}/${resource.id}`);

    // Return 200 OK to acknowledge receipt
    // Medplum expects a successful response to mark the delivery as complete
    res.status(200).json({
      success: true,
      message: 'Webhook processed',
      eventId: webhookEvent.id,
    });
  } catch (error) {
    console.error('Error processing webhook:', error);
    // Return 500 to trigger retry (if configured)
    res.status(500).json({
      success: false,
      error: 'Webhook processing failed',
    });
  }
});

/**
 * GET /api/webhooks/events
 * Get recent webhook events (for debugging/monitoring)
 */
router.get('/events', async (req, res) => {
  const limit = parseInt(req.query.limit as string) || 20;
  const resourceType = req.query.resourceType as string;

  let filteredEvents = webhookEvents;

  if (resourceType) {
    filteredEvents = webhookEvents.filter(e => e.resourceType === resourceType);
  }

  res.json({
    success: true,
    data: filteredEvents.slice(0, limit),
    total: filteredEvents.length,
  });
});

/**
 * GET /api/webhooks/events/:id
 * Get a specific webhook event
 */
router.get('/events/:id', async (req, res) => {
  const event = webhookEvents.find(e => e.id === req.params.id);

  if (!event) {
    return res.status(404).json({
      success: false,
      error: 'Webhook event not found',
    });
  }

  res.json({
    success: true,
    data: event,
  });
});

/**
 * Process incoming webhooks based on resource type
 * This is where you implement your business logic
 */
async function processWebhook(event: WebhookEvent): Promise<void> {
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
 * Handle Patient webhooks
 */
async function handlePatientWebhook(
  patient: Patient,
  action: 'create' | 'update' | 'delete'
): Promise<void> {
  console.log(`Patient ${action}: ${patient.id}`);

  // Add to sync events for UI display
  const syncEvent: SyncEvent = {
    id: `sync-${Date.now()}`,
    timestamp: new Date().toISOString(),
    system: 'athena', // Default - in real app, determine from patient source
    type: 'patient',
    action: action === 'create' ? 'created' : action === 'update' ? 'updated' : 'deleted',
    resourceId: patient.id || 'unknown',
    status: 'success',
    details: `Patient ${patient.name?.[0]?.given?.[0]} ${patient.name?.[0]?.family} ${action}d via subscription`,
  };

  addSyncEvent(syncEvent);

  // Example business logic:
  // - Send welcome email for new patients
  // - Update external systems
  // - Trigger analytics
  if (action === 'create') {
    console.log(`New patient registered: ${patient.name?.[0]?.given?.[0]} ${patient.name?.[0]?.family}`);
    // await sendWelcomeEmail(patient);
  }
}

/**
 * Handle Encounter webhooks
 */
async function handleEncounterWebhook(
  encounter: Encounter,
  action: 'create' | 'update' | 'delete'
): Promise<void> {
  console.log(`Encounter ${action}: ${encounter.id}`);

  const syncEvent: SyncEvent = {
    id: `sync-${Date.now()}`,
    timestamp: new Date().toISOString(),
    system: 'athena',
    type: 'encounter',
    action: action === 'create' ? 'created' : action === 'update' ? 'updated' : 'deleted',
    resourceId: encounter.id || 'unknown',
    status: 'success',
    details: `Encounter ${encounter.class?.code} ${action}d via subscription`,
  };

  addSyncEvent(syncEvent);

  // Example: Notify scheduling system of new appointments
  if (action === 'create' && encounter.status === 'planned') {
    console.log(`New appointment scheduled: ${encounter.id}`);
  }
}

/**
 * Handle DiagnosticReport webhooks (lab results)
 */
async function handleDiagnosticReportWebhook(
  report: DiagnosticReport,
  action: 'create' | 'update' | 'delete'
): Promise<void> {
  console.log(`DiagnosticReport ${action}: ${report.id}`);

  const syncEvent: SyncEvent = {
    id: `sync-${Date.now()}`,
    timestamp: new Date().toISOString(),
    system: 'athena',
    type: 'diagnostic_report',
    action: action === 'create' ? 'created' : action === 'update' ? 'updated' : 'deleted',
    resourceId: report.id || 'unknown',
    status: 'success',
    details: `Lab result "${report.code?.text || 'Unknown'}" ${action}d via subscription`,
  };

  addSyncEvent(syncEvent);

  // Example: Check for critical values and alert
  if (action === 'create') {
    // In real app: analyze results and create alerts for abnormal values
    console.log(`New lab result received: ${report.code?.text}`);
  }
}

/**
 * Handle Task webhooks
 */
async function handleTaskWebhook(
  task: Task,
  action: 'create' | 'update' | 'delete'
): Promise<void> {
  console.log(`Task ${action}: ${task.id}`);

  // Example: Send notification for new tasks
  if (action === 'create') {
    console.log(`New task created: ${task.description}`);
    // await sendTaskNotification(task);
  }

  // Example: Handle task completion
  if (action === 'update' && task.status === 'completed') {
    console.log(`Task completed: ${task.id}`);
  }
}

export { router as webhooksRouter, webhookEvents, type WebhookEvent };
