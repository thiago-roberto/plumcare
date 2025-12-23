import type { Subscription } from '@medplum/fhirtypes';

/**
 * Subscription configuration for creating/updating subscriptions
 */
export interface SubscriptionConfig {
  /** Human-readable name for this subscription */
  name: string;
  /** FHIR resource type to watch (e.g., 'Patient', 'Encounter') */
  criteria: string;
  /** Which operations trigger this subscription */
  interaction?: SubscriptionInteraction;
  /** Webhook endpoint to notify */
  endpoint?: string;
  /** Optional FHIRPath expression for advanced filtering */
  fhirPathFilter?: string;
  /** Number of retry attempts (1-18, default 3) */
  maxAttempts?: number;
}

/**
 * Subscription interaction types
 */
export type SubscriptionInteraction = 'create' | 'update' | 'delete';

/**
 * Subscription with metadata
 */
export interface SubscriptionWithMeta extends Subscription {
  meta?: {
    lastUpdated?: string;
    versionId?: string;
  };
}

/**
 * Default subscription presets
 */
export interface DefaultSubscriptionPreset {
  name: string;
  criteria: string;
  interaction: SubscriptionInteraction;
}

/**
 * Resend request parameters
 */
export interface ResendParams {
  resourceType: string;
  resourceId: string;
}
