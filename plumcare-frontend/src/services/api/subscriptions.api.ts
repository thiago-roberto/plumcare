import { apiClient } from './client';

export interface SubscriptionConfig {
  name: string;
  criteria: string;
  interaction?: 'create' | 'update' | 'delete';
  endpoint?: string;
  fhirPathFilter?: string;
  maxAttempts?: number;
}

export interface Subscription {
  resourceType: 'Subscription';
  id?: string;
  status: 'requested' | 'active' | 'error' | 'off';
  reason?: string;
  criteria: string;
  channel: {
    type: string;
    endpoint?: string;
    payload?: string;
  };
  extension?: Array<{
    url: string;
    valueCode?: string;
    valueInteger?: number;
    valueString?: string;
  }>;
  meta?: {
    lastUpdated?: string;
  };
}

export const subscriptionsApi = {
  getAll: () =>
    apiClient.get<{ data: Subscription[] }>('/api/subscriptions').then(res => res.data),

  create: (config: SubscriptionConfig) =>
    apiClient.post<{ data: Subscription }>('/api/subscriptions', config).then(res => res.data),

  createDefaults: () =>
    apiClient.post<{ data: Subscription[] }>('/api/subscriptions/defaults').then(res => res.data),

  pause: (id: string) =>
    apiClient.post<{ data: Subscription }>(`/api/subscriptions/${id}/pause`).then(res => res.data),

  resume: (id: string) =>
    apiClient.post<{ data: Subscription }>(`/api/subscriptions/${id}/resume`).then(res => res.data),

  delete: (id: string) =>
    apiClient.delete<void>(`/api/subscriptions/${id}`),
};
