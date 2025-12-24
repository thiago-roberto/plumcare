// Legacy API (for backward compatibility)
export * from './ehrApi';

// New modular API - export under namespace to avoid conflicts
export { apiClient, ApiError } from './api/client';
export { ehrApi, getAggregateStats as getEhrAggregateStats } from './api/ehr.api';
export { syncApi } from './api/sync.api';
export { subscriptionsApi } from './api/subscriptions.api';
export { botsApi } from './api/bots.api';
export { webhooksApi } from './api/webhooks.api';
