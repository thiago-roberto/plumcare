import type { Subscription, Bundle } from '@medplum/fhirtypes';
import { getMedplumClient } from './medplum.service.js';
import { config } from '../config/index.js';

/**
 * Subscription Service
 *
 * Manages FHIR Subscriptions in Medplum - event-driven notifications
 * that trigger when resources are created, updated, or deleted.
 *
 * Think of subscriptions as "sensors" that watch for changes and notify
 * your webhook endpoint when something happens.
 */

export interface SubscriptionConfig {
  /** Human-readable name for this subscription */
  name: string;
  /** FHIR resource type to watch (e.g., 'Patient', 'Encounter') */
  criteria: string;
  /** Which operations trigger this subscription */
  interaction?: 'create' | 'update' | 'delete';
  /** Webhook endpoint to notify */
  endpoint?: string;
  /** Optional FHIRPath expression for advanced filtering */
  fhirPathFilter?: string;
  /** Number of retry attempts (1-18, default 3) */
  maxAttempts?: number;
}

export interface SubscriptionWithMeta extends Subscription {
  meta?: {
    lastUpdated?: string;
    versionId?: string;
  };
}

/**
 * Create a new subscription in Medplum
 */
export async function createSubscription(subscriptionConfig: SubscriptionConfig): Promise<Subscription> {
  const client = getMedplumClient();

  // Build the webhook endpoint - use Docker internal URL so Medplum can reach backend
  // From Medplum container's perspective, it needs to call http://backend:8000 (Docker network)
  const webhookEndpoint = subscriptionConfig.endpoint ||
    `${config.webhook.internalUrl}/api/webhooks/medplum`;

  // Build extensions for advanced features
  const extensions: Subscription['extension'] = [];

  // Add interaction filter (create, update, delete)
  if (subscriptionConfig.interaction) {
    extensions.push({
      url: 'https://medplum.com/fhir/StructureDefinition/subscription-supported-interaction',
      valueCode: subscriptionConfig.interaction,
    });
  }

  // Add retry configuration
  if (subscriptionConfig.maxAttempts) {
    extensions.push({
      url: 'https://medplum.com/fhir/StructureDefinition/subscription-max-attempts',
      valueInteger: subscriptionConfig.maxAttempts,
    });
  }

  // Add FHIRPath filter for advanced conditional logic
  if (subscriptionConfig.fhirPathFilter) {
    extensions.push({
      url: 'https://medplum.com/fhir/StructureDefinition/fhir-path-criteria-expression',
      valueString: subscriptionConfig.fhirPathFilter,
    });
  }

  const subscription: Subscription = {
    resourceType: 'Subscription',
    status: 'active',
    reason: subscriptionConfig.name,
    criteria: subscriptionConfig.criteria,
    channel: {
      type: 'rest-hook',
      endpoint: webhookEndpoint,
      payload: 'application/fhir+json',
    },
    extension: extensions.length > 0 ? extensions : undefined,
  };

  return client.createResource(subscription);
}

/**
 * Get all subscriptions from Medplum
 */
export async function getSubscriptions(): Promise<Subscription[]> {
  const client = getMedplumClient();
  return client.searchResources('Subscription', {
    _count: '100',
  });
}

/**
 * Get a specific subscription by ID
 */
export async function getSubscription(id: string): Promise<Subscription | undefined> {
  const client = getMedplumClient();
  try {
    return await client.readResource('Subscription', id);
  } catch {
    return undefined;
  }
}

/**
 * Update an existing subscription
 */
export async function updateSubscription(
  id: string,
  updates: Partial<SubscriptionConfig>
): Promise<Subscription> {
  const client = getMedplumClient();
  const existing = await client.readResource('Subscription', id);

  const updated: Subscription = {
    ...existing,
    reason: updates.name || existing.reason,
    criteria: updates.criteria || existing.criteria,
    status: 'active',
  };

  if (updates.endpoint) {
    updated.channel = {
      ...existing.channel,
      type: 'rest-hook',
      endpoint: updates.endpoint,
    };
  }

  return client.updateResource(updated);
}

/**
 * Delete a subscription
 */
export async function deleteSubscription(id: string): Promise<void> {
  const client = getMedplumClient();
  await client.deleteResource('Subscription', id);
}

/**
 * Pause a subscription (set status to 'off')
 */
export async function pauseSubscription(id: string): Promise<Subscription> {
  const client = getMedplumClient();
  const existing = await client.readResource('Subscription', id);

  return client.updateResource({
    ...existing,
    status: 'off',
  });
}

/**
 * Resume a paused subscription (set status to 'active')
 */
export async function resumeSubscription(id: string): Promise<Subscription> {
  const client = getMedplumClient();
  const existing = await client.readResource('Subscription', id);

  return client.updateResource({
    ...existing,
    status: 'active',
  });
}

/**
 * Create predefined subscriptions for common use cases
 */
export async function createDefaultSubscriptions(): Promise<Subscription[]> {
  const defaultSubscriptions: SubscriptionConfig[] = [
    {
      name: 'New Patient Notifications',
      criteria: 'Patient',
      interaction: 'create',
    },
    {
      name: 'Patient Updates',
      criteria: 'Patient',
      interaction: 'update',
    },
    {
      name: 'New Encounter Notifications',
      criteria: 'Encounter',
      interaction: 'create',
    },
    {
      name: 'Lab Results (DiagnosticReport)',
      criteria: 'DiagnosticReport',
      interaction: 'create',
    },
    {
      name: 'New Tasks',
      criteria: 'Task',
      interaction: 'create',
    },
  ];

  const results: Subscription[] = [];

  for (const sub of defaultSubscriptions) {
    try {
      const created = await createSubscription(sub);
      results.push(created);
      console.log(`Created subscription: ${sub.name}`);
    } catch (error) {
      console.error(`Failed to create subscription ${sub.name}:`, error);
    }
  }

  return results;
}

/**
 * Get subscription execution history (via AuditEvents)
 */
export async function getSubscriptionHistory(subscriptionId: string, limit = 20): Promise<Bundle> {
  const client = getMedplumClient();

  // AuditEvents are created when subscriptions fire
  return client.search('AuditEvent', {
    entity: `Subscription/${subscriptionId}`,
    _count: String(limit),
    _sort: '-_lastUpdated',
  });
}

/**
 * Manually trigger a subscription (useful for testing)
 * Uses Medplum's $resend operation
 */
export async function resendSubscription(
  subscriptionId: string,
  resourceType: string,
  resourceId: string
): Promise<void> {
  const client = getMedplumClient();

  // $resend operation triggers the subscription for a specific resource
  await client.post(
    client.fhirUrl(resourceType, resourceId, '$resend'),
    {
      subscription: `Subscription/${subscriptionId}`,
    }
  );
}
