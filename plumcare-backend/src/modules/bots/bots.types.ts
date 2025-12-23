export interface BotConfig {
  /** Human-readable name for the bot */
  name: string;
  /** Description of what the bot does */
  description?: string;
  /** The bot's source code (TypeScript/JavaScript) */
  code: string;
  /** Runtime version */
  runtimeVersion?: 'awslambda' | 'vmcontext';
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

export interface BotTemplate {
  name: string;
  description: string;
  key: string;
}
