// Spaces Domain Types

export interface Message {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string | null;
  tool_calls?: unknown[];
  tool_call_id?: string;
  resources?: string[];
}
