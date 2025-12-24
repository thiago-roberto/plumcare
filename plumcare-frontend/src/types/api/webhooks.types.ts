// Webhook API Types
export interface WebhookEvent {
  id: string;
  timestamp: string;
  resourceType: string;
  resourceId: string;
  action: 'create' | 'update' | 'delete';
  subscriptionId?: string;
  payload?: Record<string, unknown>;
  processed: boolean;
}
