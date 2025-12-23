import type { Resource } from '@medplum/fhirtypes';

/**
 * Webhook action types
 */
export type WebhookAction = 'create' | 'update' | 'delete';

/**
 * Webhook event
 */
export interface WebhookEvent {
  id: string;
  timestamp: string;
  resourceType: string;
  resourceId: string;
  action: WebhookAction;
  subscriptionId?: string;
  payload: Resource;
  processed: boolean;
}

/**
 * Webhook response
 */
export interface WebhookResponse {
  success: boolean;
  message: string;
  eventId: string;
}

/**
 * Webhook events list response
 */
export interface WebhookEventsResponse {
  success: boolean;
  data: WebhookEvent[];
  total: number;
}

/**
 * Webhook event detail response
 */
export interface WebhookEventDetailResponse {
  success: boolean;
  data: WebhookEvent;
}
