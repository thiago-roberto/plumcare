import { apiClient } from './client';
import type { Subscription } from './subscriptions.api';

export interface BotConfig {
  name: string;
  description?: string;
  code: string;
  runtimeVersion?: 'awslambda' | 'vmcontext';
}

export interface Bot {
  resourceType: 'Bot';
  id?: string;
  name?: string;
  description?: string;
  runtimeVersion?: string;
  meta?: {
    lastUpdated?: string;
  };
}

export interface BotTemplate {
  name: string;
  description: string;
  key: string;
}

export interface BotExecution {
  id: string;
  botId: string;
  timestamp: string;
  status: 'success' | 'error';
  input?: unknown;
  output?: unknown;
  error?: string;
  duration?: number;
}

export const botsApi = {
  getAll: () =>
    apiClient.get<{ data: Bot[] }>('/api/bots').then(res => res.data),

  getTemplates: () =>
    apiClient.get<{ data: BotTemplate[] }>('/api/bots/templates').then(res => res.data),

  getTemplateCode: (key: string) =>
    apiClient.get<{ data: { code: string } }>(`/api/bots/templates/${key}`).then(res => res.data.code),

  create: (config: BotConfig) =>
    apiClient.post<{ data: Bot }>('/api/bots', config).then(res => res.data),

  createFromTemplate: (name: string, templateKey: string, description?: string) =>
    apiClient.post<{ data: Bot }>('/api/bots/from-template', { name, templateKey, description }).then(res => res.data),

  execute: (botId: string, input?: unknown) =>
    apiClient.post<{ data: unknown }>(`/api/bots/${botId}/execute`, { input }).then(res => res.data),

  delete: (id: string) =>
    apiClient.delete<void>(`/api/bots/${id}`),

  createSubscription: (botId: string, criteria: string, interaction?: 'create' | 'update' | 'delete') =>
    apiClient.post<{ data: Subscription }>(`/api/bots/${botId}/subscribe`, { criteria, interaction }).then(res => res.data),

  getExecutions: (botId?: string, limit = 20) => {
    const url = botId
      ? `/api/bots/${botId}/executions?limit=${limit}`
      : `/api/bots/executions?limit=${limit}`;
    return apiClient.get<{ data: BotExecution[] }>(url).then(res => res.data);
  },
};
