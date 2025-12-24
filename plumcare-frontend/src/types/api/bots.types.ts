// Bot API Types
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
