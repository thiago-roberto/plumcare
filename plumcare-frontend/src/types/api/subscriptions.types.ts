// Subscription API Types
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
