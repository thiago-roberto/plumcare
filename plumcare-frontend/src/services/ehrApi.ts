import type { Patient, Encounter, Observation, Condition, DiagnosticReport } from '@medplum/fhirtypes';

// Types matching the backend
export type EhrSystem = 'athena' | 'elation' | 'nextgen' | 'medplum';

export interface EhrConnection {
  id: string;
  system: EhrSystem;
  name: string;
  status: 'connected' | 'disconnected' | 'syncing' | 'error';
  lastSync: string;
  patientCount: number;
  encounterCount: number;
  pendingRecords: number;
  apiVersion: string;
  fhirVersion: string;
  capabilities: string[];
}

export interface SyncEvent {
  id: string;
  timestamp: string;
  system: EhrSystem;
  type: 'patient' | 'encounter' | 'observation' | 'condition' | 'diagnostic_report';
  action: 'created' | 'updated' | 'deleted';
  resourceId: string;
  status: 'success' | 'failed' | 'pending';
  details?: string;
}

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

// Base URL for the backend API
const API_BASE_URL = import.meta.env.VITE_EHR_API_URL || 'http://localhost:8000';

/**
 * Fetch all EHR connections with their status
 */
export async function getEhrConnections(): Promise<EhrConnection[]> {
  const response = await fetch(`${API_BASE_URL}/api/connections`);
  if (!response.ok) {
    throw new Error('Failed to fetch EHR connections');
  }
  const data = await response.json();
  return data.connections;
}

/**
 * Fetch connection status for a specific EHR system
 */
export async function getEhrConnection(system: EhrSystem): Promise<EhrConnection> {
  const response = await fetch(`${API_BASE_URL}/api/connections/${system}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${system} connection`);
  }
  return response.json();
}

/**
 * Fetch recent sync events
 */
export async function getSyncEvents(params?: {
  system?: EhrSystem;
  limit?: number;
  offset?: number;
}): Promise<{ events: SyncEvent[]; total: number }> {
  const searchParams = new URLSearchParams();
  if (params?.system) searchParams.set('system', params.system);
  if (params?.limit) searchParams.set('limit', params.limit.toString());
  if (params?.offset) searchParams.set('offset', params.offset.toString());

  const url = `${API_BASE_URL}/api/sync/events${searchParams.toString() ? `?${searchParams}` : ''}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch sync events');
  }
  return response.json();
}

/**
 * Trigger a sync for an EHR system
 */
export async function triggerSync(system: EhrSystem): Promise<{
  success: boolean;
  syncedResources: number;
  errors: string[];
}> {
  const response = await fetch(`${API_BASE_URL}/api/sync/${system}`, {
    method: 'POST',
  });
  if (!response.ok) {
    throw new Error(`Failed to trigger sync for ${system}`);
  }
  return response.json();
}

/**
 * Fetch patients from a specific EHR system
 */
export async function getPatientsByEhr(
  system: EhrSystem,
  params?: { limit?: number; offset?: number }
): Promise<PaginatedResponse<Patient>> {
  const searchParams = new URLSearchParams();
  if (params?.limit) searchParams.set('limit', params.limit.toString());
  if (params?.offset) searchParams.set('offset', params.offset.toString());

  const url = `${API_BASE_URL}/api/${system}/patients${searchParams.toString() ? `?${searchParams}` : ''}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch patients from ${system}`);
  }
  return response.json();
}

/**
 * Fetch a specific patient from an EHR system
 */
export async function getPatientByEhr(system: EhrSystem, patientId: string): Promise<Patient> {
  const response = await fetch(`${API_BASE_URL}/api/${system}/patients/${patientId}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch patient ${patientId} from ${system}`);
  }
  const data = await response.json();
  return data.data;
}

/**
 * Fetch encounters from a specific EHR system
 */
export async function getEncountersByEhr(
  system: EhrSystem,
  params?: { limit?: number; offset?: number }
): Promise<PaginatedResponse<Encounter>> {
  const searchParams = new URLSearchParams();
  if (params?.limit) searchParams.set('limit', params.limit.toString());
  if (params?.offset) searchParams.set('offset', params.offset.toString());

  const url = `${API_BASE_URL}/api/${system}/encounters${searchParams.toString() ? `?${searchParams}` : ''}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch encounters from ${system}`);
  }
  return response.json();
}

/**
 * Fetch observations for a patient from an EHR system
 */
export async function getObservationsByPatient(
  system: EhrSystem,
  patientId: string
): Promise<PaginatedResponse<Observation>> {
  const response = await fetch(`${API_BASE_URL}/api/${system}/patients/${patientId}/observations`);
  if (!response.ok) {
    throw new Error(`Failed to fetch observations for patient ${patientId}`);
  }
  return response.json();
}

/**
 * Fetch conditions for a patient from an EHR system
 */
export async function getConditionsByPatient(
  system: EhrSystem,
  patientId: string
): Promise<PaginatedResponse<Condition>> {
  const response = await fetch(`${API_BASE_URL}/api/${system}/patients/${patientId}/conditions`);
  if (!response.ok) {
    throw new Error(`Failed to fetch conditions for patient ${patientId}`);
  }
  return response.json();
}

/**
 * Fetch diagnostic reports for a patient from an EHR system
 */
export async function getDiagnosticReportsByPatient(
  system: EhrSystem,
  patientId: string
): Promise<PaginatedResponse<DiagnosticReport>> {
  const response = await fetch(`${API_BASE_URL}/api/${system}/patients/${patientId}/diagnostic-reports`);
  if (!response.ok) {
    throw new Error(`Failed to fetch diagnostic reports for patient ${patientId}`);
  }
  return response.json();
}

/**
 * Get aggregate stats across all EHR systems
 */
export async function getAggregateStats(): Promise<{
  totalPatients: number;
  totalEncounters: number;
  totalPending: number;
  connectedSystems: number;
  totalSystems: number;
}> {
  const connections = await getEhrConnections();

  const totalPatients = connections.reduce((sum, conn) => sum + conn.patientCount, 0);
  const totalEncounters = connections.reduce((sum, conn) => sum + conn.encounterCount, 0);
  const totalPending = connections.reduce((sum, conn) => sum + conn.pendingRecords, 0);
  const connectedSystems = connections.filter(
    conn => conn.status === 'connected' || conn.status === 'syncing'
  ).length;

  return {
    totalPatients,
    totalEncounters,
    totalPending,
    connectedSystems,
    totalSystems: connections.length,
  };
}

/**
 * Sync mock data - generate and sync mock patient data for all EHRs
 */
export interface MockDataSyncRequest {
  patientCount?: number;
  includeAllData?: boolean;
}

export interface EhrResourceSummary {
  patients: number;
  encounters: number;
  observations: number;
  conditions: number;
  allergies: number;
  medications: number;
  diagnosticReports: number;
}

export interface MockDataSyncResponse {
  success: boolean;
  summary: {
    athena: EhrResourceSummary;
    elation: EhrResourceSummary;
    nextgen: EhrResourceSummary;
  };
  totalResources: number;
  errors?: string[];
}

export async function syncMockData(options?: MockDataSyncRequest): Promise<MockDataSyncResponse> {
  const response = await fetch(`${API_BASE_URL}/api/sync/mock-data`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(options || {}),
  });
  if (!response.ok) {
    throw new Error('Failed to sync mock data');
  }
  return response.json();
}

// ============================================
// SUBSCRIPTIONS API
// ============================================

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

/**
 * Get all subscriptions
 */
export async function getSubscriptions(): Promise<Subscription[]> {
  const response = await fetch(`${API_BASE_URL}/api/subscriptions`);
  if (!response.ok) {
    throw new Error('Failed to fetch subscriptions');
  }
  const data = await response.json();
  return data.data;
}

/**
 * Create a new subscription
 */
export async function createSubscription(config: SubscriptionConfig): Promise<Subscription> {
  const response = await fetch(`${API_BASE_URL}/api/subscriptions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });
  if (!response.ok) {
    throw new Error('Failed to create subscription');
  }
  const data = await response.json();
  return data.data;
}

/**
 * Create default subscriptions
 */
export async function createDefaultSubscriptions(): Promise<Subscription[]> {
  const response = await fetch(`${API_BASE_URL}/api/subscriptions/defaults`, {
    method: 'POST',
  });
  if (!response.ok) {
    throw new Error('Failed to create default subscriptions');
  }
  const data = await response.json();
  return data.data;
}

/**
 * Pause a subscription
 */
export async function pauseSubscription(id: string): Promise<Subscription> {
  const response = await fetch(`${API_BASE_URL}/api/subscriptions/${id}/pause`, {
    method: 'POST',
  });
  if (!response.ok) {
    throw new Error('Failed to pause subscription');
  }
  const data = await response.json();
  return data.data;
}

/**
 * Resume a subscription
 */
export async function resumeSubscription(id: string): Promise<Subscription> {
  const response = await fetch(`${API_BASE_URL}/api/subscriptions/${id}/resume`, {
    method: 'POST',
  });
  if (!response.ok) {
    throw new Error('Failed to resume subscription');
  }
  const data = await response.json();
  return data.data;
}

/**
 * Delete a subscription
 */
export async function deleteSubscription(id: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/subscriptions/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error('Failed to delete subscription');
  }
}

// ============================================
// BOTS API
// ============================================

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

/**
 * Get all bots
 */
export async function getBots(): Promise<Bot[]> {
  const response = await fetch(`${API_BASE_URL}/api/bots`);
  if (!response.ok) {
    throw new Error('Failed to fetch bots');
  }
  const data = await response.json();
  return data.data;
}

/**
 * Get bot templates
 */
export async function getBotTemplates(): Promise<BotTemplate[]> {
  const response = await fetch(`${API_BASE_URL}/api/bots/templates`);
  if (!response.ok) {
    throw new Error('Failed to fetch bot templates');
  }
  const data = await response.json();
  return data.data;
}

/**
 * Get bot template code
 */
export async function getBotTemplateCode(key: string): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/api/bots/templates/${key}`);
  if (!response.ok) {
    throw new Error('Failed to fetch bot template code');
  }
  const data = await response.json();
  return data.data.code;
}

/**
 * Create a new bot
 */
export async function createBot(config: BotConfig): Promise<Bot> {
  const response = await fetch(`${API_BASE_URL}/api/bots`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });
  if (!response.ok) {
    throw new Error('Failed to create bot');
  }
  const data = await response.json();
  return data.data;
}

/**
 * Create bot from template
 */
export async function createBotFromTemplate(
  name: string,
  templateKey: string,
  description?: string
): Promise<Bot> {
  const response = await fetch(`${API_BASE_URL}/api/bots/from-template`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, templateKey, description }),
  });
  if (!response.ok) {
    throw new Error('Failed to create bot from template');
  }
  const data = await response.json();
  return data.data;
}

/**
 * Execute a bot
 */
export async function executeBot(botId: string, input?: unknown): Promise<unknown> {
  const response = await fetch(`${API_BASE_URL}/api/bots/${botId}/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ input }),
  });
  if (!response.ok) {
    throw new Error('Failed to execute bot');
  }
  const data = await response.json();
  return data.data;
}

/**
 * Delete a bot
 */
export async function deleteBot(id: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/bots/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error('Failed to delete bot');
  }
}

/**
 * Create a subscription for a bot
 */
export async function createBotSubscription(
  botId: string,
  criteria: string,
  interaction?: 'create' | 'update' | 'delete'
): Promise<Subscription> {
  const response = await fetch(`${API_BASE_URL}/api/bots/${botId}/subscribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ criteria, interaction }),
  });
  if (!response.ok) {
    throw new Error('Failed to create bot subscription');
  }
  const data = await response.json();
  return data.data;
}

/**
 * Get bot executions
 */
export async function getBotExecutions(botId?: string, limit = 20): Promise<BotExecution[]> {
  const url = botId
    ? `${API_BASE_URL}/api/bots/${botId}/executions?limit=${limit}`
    : `${API_BASE_URL}/api/bots/executions?limit=${limit}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch bot executions');
  }
  const data = await response.json();
  return data.data;
}

// ============================================
// WEBHOOKS API
// ============================================

export interface WebhookEvent {
  id: string;
  timestamp: string;
  resourceType: string;
  resourceId: string;
  action: 'create' | 'update' | 'delete';
  subscriptionId?: string;
  processed: boolean;
}

/**
 * Get recent webhook events
 */
export async function getWebhookEvents(limit = 20): Promise<WebhookEvent[]> {
  const response = await fetch(`${API_BASE_URL}/api/webhooks/events?limit=${limit}`);
  if (!response.ok) {
    throw new Error('Failed to fetch webhook events');
  }
  const data = await response.json();
  return data.data;
}

// EHR System metadata (static, doesn't need API call)
export const ehrSystemMeta: Record<EhrSystem, { name: string; color: string; logo: string; description: string }> = {
  athena: {
    name: 'Athena Health',
    color: '#00857c',
    logo: '/img/integrations/athena.png',
    description: 'Cloud-based EHR with comprehensive revenue cycle management and patient engagement tools.',
  },
  elation: {
    name: 'Elation Health',
    color: '#4f46e5',
    logo: '/img/integrations/elation.png',
    description: 'Primary care-focused EHR designed for independent practices with intuitive workflows.',
  },
  nextgen: {
    name: 'NextGen Healthcare',
    color: '#059669',
    logo: '/img/integrations/nextgen.png',
    description: 'Enterprise EHR solution with specialty-specific templates and interoperability features.',
  },
  medplum: {
    name: 'Medplum',
    color: '#7c3aed',
    logo: '/img/integrations/medplum.png',
    description: 'FHIR-native healthcare platform for building custom healthcare applications.',
  },
};
