import { apiClient } from './client';

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

export const webhooksApi = {
  getEvents: (limit = 20) =>
    apiClient.get<{ data: WebhookEvent[] }>(`/api/webhooks/events?limit=${limit}`).then(res => res.data),
};
