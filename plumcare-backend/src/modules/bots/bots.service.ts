import type { Bot, Subscription } from '@medplum/fhirtypes';
import { getMedplumClient } from '../../shared/medplum/index.js';
import { redis, CacheKeys, CacheTTL } from '../../core/database/index.js';
import type { BotConfig, BotExecution, BotTemplate } from './bots.types.js';

// In-memory fallback for bot executions
const botExecutionsFallback: BotExecution[] = [];
const BOT_EXECUTIONS_KEY = 'bot:executions';
const MAX_EXECUTIONS = 100;

/**
 * Create a new bot in Medplum
 */
export async function createBot(botConfig: BotConfig): Promise<Bot> {
  const client = getMedplumClient();

  // Create the Bot resource
  const bot: Bot = {
    resourceType: 'Bot',
    name: botConfig.name,
    description: botConfig.description,
    runtimeVersion: botConfig.runtimeVersion || 'vmcontext',
  };

  const createdBot = await client.createResource(bot);

  // Deploy the bot code - if this fails, clean up the created bot
  if (createdBot.id && botConfig.code) {
    try {
      await updateBotCode(createdBot.id, botConfig.code);
      console.log(`Bot ${createdBot.id} created and code deployed`);
    } catch (error) {
      // Clean up the bot if code deployment fails
      console.error(`Failed to deploy code for bot ${createdBot.id}, cleaning up...`);
      try {
        await client.deleteResource('Bot', createdBot.id);
      } catch (deleteError) {
        console.error('Failed to clean up bot after code deployment failure:', deleteError);
      }
      throw error;
    }
  }

  return createdBot;
}

/**
 * Get all bots from Medplum
 */
export async function getBots(): Promise<Bot[]> {
  const client = getMedplumClient();
  return client.searchResources('Bot', {
    _count: '100',
  });
}

/**
 * Get a specific bot by ID
 */
export async function getBot(id: string): Promise<Bot | undefined> {
  const client = getMedplumClient();
  try {
    return await client.readResource('Bot', id);
  } catch {
    return undefined;
  }
}

/**
 * Update a bot's metadata
 */
export async function updateBot(id: string, updates: Partial<BotConfig>): Promise<Bot> {
  const client = getMedplumClient();
  const existing = await client.readResource('Bot', id);

  const updated: Bot = {
    ...existing,
    name: updates.name || existing.name,
    description: updates.description || existing.description,
  };

  return client.updateResource(updated);
}

/**
 * Update a bot's source code
 */
export async function updateBotCode(botId: string, code: string): Promise<void> {
  const client = getMedplumClient();

  // In Medplum, you update bot code by POSTing to the bot's $deploy endpoint
  // or by updating the sourceCode attachment
  await client.post(client.fhirUrl('Bot', botId, '$deploy'), {
    code,
  });
}

/**
 * Delete a bot
 */
export async function deleteBot(id: string): Promise<void> {
  const client = getMedplumClient();
  await client.deleteResource('Bot', id);
}

/**
 * Store a bot execution (Redis with fallback)
 */
async function storeBotExecution(execution: BotExecution): Promise<void> {
  if (redis.isReady()) {
    await redis.lpush(BOT_EXECUTIONS_KEY, execution);
    await redis.ltrim(BOT_EXECUTIONS_KEY, 0, MAX_EXECUTIONS - 1);
    await redis.expire(BOT_EXECUTIONS_KEY, CacheTTL.BOT_EXECUTIONS);
  } else {
    botExecutionsFallback.unshift(execution);
    if (botExecutionsFallback.length > MAX_EXECUTIONS) {
      botExecutionsFallback.pop();
    }
  }
}

/**
 * Execute a bot manually
 */
export async function executeBot(botId: string, input: unknown): Promise<unknown> {
  const client = getMedplumClient();
  const startTime = Date.now();

  try {
    // Execute the bot via the $execute operation
    const result = await client.post(client.fhirUrl('Bot', botId, '$execute'), {
      input,
    });

    // Record the execution
    const execution: BotExecution = {
      id: `exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      botId,
      timestamp: new Date().toISOString(),
      status: 'success',
      input,
      output: result,
      duration: Date.now() - startTime,
    };
    await storeBotExecution(execution);

    return result;
  } catch (error) {
    const execution: BotExecution = {
      id: `exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      botId,
      timestamp: new Date().toISOString(),
      status: 'error',
      input,
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: Date.now() - startTime,
    };
    await storeBotExecution(execution);

    throw error;
  }
}

/**
 * Get bot execution history
 */
export async function getBotExecutions(botId?: string, limit = 20): Promise<BotExecution[]> {
  let allExecutions: BotExecution[];

  if (redis.isReady()) {
    allExecutions = await redis.lrange<BotExecution>(BOT_EXECUTIONS_KEY, 0, MAX_EXECUTIONS - 1);
  } else {
    allExecutions = botExecutionsFallback;
  }

  let filtered = allExecutions;

  if (botId) {
    filtered = allExecutions.filter(e => e.botId === botId);
  }

  return filtered.slice(0, limit);
}

/**
 * Create a subscription that triggers a bot
 */
export async function createBotSubscription(
  botId: string,
  criteria: string,
  interaction?: 'create' | 'update' | 'delete'
): Promise<Subscription> {
  const client = getMedplumClient();

  const extensions: Subscription['extension'] = [];

  if (interaction) {
    extensions.push({
      url: 'https://medplum.com/fhir/StructureDefinition/subscription-supported-interaction',
      valueCode: interaction,
    });
  }

  const subscription: Subscription = {
    resourceType: 'Subscription',
    status: 'active',
    reason: `Bot trigger for ${criteria}`,
    criteria,
    channel: {
      type: 'rest-hook',
      endpoint: `Bot/${botId}`,
    },
    extension: extensions.length > 0 ? extensions : undefined,
  };

  return client.createResource(subscription);
}

/**
 * Example bot code templates
 */
export const BOT_TEMPLATES = {
  welcomeEmail: `
import { BotEvent, MedplumClient } from '@medplum/core';
import { Patient } from '@medplum/fhirtypes';

export async function handler(medplum: MedplumClient, event: BotEvent): Promise<any> {
  const patient = event.input as Patient;

  const firstName = patient.name?.[0]?.given?.[0] || 'Patient';
  const lastName = patient.name?.[0]?.family || '';
  const email = patient.telecom?.find(t => t.system === 'email')?.value;

  if (!email) {
    console.log('No email address for patient - skipping welcome email');
    return { success: false, reason: 'No email address' };
  }

  console.log(\`Sending welcome email to \${firstName} \${lastName} at \${email}\`);

  return {
    success: true,
    message: \`Welcome email sent to \${email}\`
  };
}
`.trim(),

  labResultAlert: `
import { BotEvent, MedplumClient } from '@medplum/core';
import { DiagnosticReport, Task } from '@medplum/fhirtypes';

export async function handler(medplum: MedplumClient, event: BotEvent): Promise<any> {
  const report = event.input as DiagnosticReport;

  const hasCritical = report.conclusion?.toLowerCase().includes('critical') ||
    report.conclusion?.toLowerCase().includes('abnormal');

  if (!hasCritical) {
    console.log('Lab result is normal - no action needed');
    return { success: true, action: 'none' };
  }

  console.log(\`Critical lab result detected: \${report.code?.text}\`);

  const task: Task = {
    resourceType: 'Task',
    status: 'requested',
    intent: 'order',
    priority: 'urgent',
    code: { text: 'Review Critical Lab Result' },
    description: \`Critical lab result requires review: \${report.code?.text}\`,
    focus: { reference: \`DiagnosticReport/\${report.id}\` },
    for: report.subject,
    authoredOn: new Date().toISOString(),
  };

  const createdTask = await medplum.createResource(task);

  return { success: true, action: 'task_created', taskId: createdTask.id };
}
`.trim(),

  appointmentReminder: `
import { BotEvent, MedplumClient } from '@medplum/core';
import { Encounter, Communication } from '@medplum/fhirtypes';

export async function handler(medplum: MedplumClient, event: BotEvent): Promise<any> {
  const encounter = event.input as Encounter;

  if (encounter.status !== 'planned') {
    return { success: true, action: 'skipped', reason: 'Not a planned encounter' };
  }

  const patientRef = encounter.subject?.reference;
  if (!patientRef) {
    return { success: false, reason: 'No patient reference' };
  }

  const communication: Communication = {
    resourceType: 'Communication',
    status: 'preparation',
    category: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/communication-category', code: 'reminder' }] }],
    subject: { reference: patientRef },
    about: [{ reference: \`Encounter/\${encounter.id}\` }],
    payload: [{ contentString: 'Reminder: You have an upcoming appointment.' }],
    sent: new Date().toISOString(),
  };

  const created = await medplum.createResource(communication);
  return { success: true, action: 'reminder_created', communicationId: created.id };
}
`.trim(),

  dataValidation: `
import { BotEvent, MedplumClient } from '@medplum/core';
import { Patient, Task } from '@medplum/fhirtypes';

export async function handler(medplum: MedplumClient, event: BotEvent): Promise<any> {
  const patient = event.input as Patient;
  const issues: string[] = [];

  if (!patient.name || patient.name.length === 0) issues.push('Missing patient name');
  if (!patient.birthDate) issues.push('Missing birth date');
  if (!patient.gender) issues.push('Missing gender');

  const hasPhone = patient.telecom?.some(t => t.system === 'phone');
  const hasEmail = patient.telecom?.some(t => t.system === 'email');
  if (!hasPhone && !hasEmail) issues.push('Missing contact information');

  if (issues.length === 0) {
    return { success: true, valid: true };
  }

  const task: Task = {
    resourceType: 'Task',
    status: 'requested',
    intent: 'order',
    priority: 'routine',
    code: { text: 'Complete Patient Data' },
    description: \`Patient record is incomplete. Missing: \${issues.join(', ')}\`,
    for: { reference: \`Patient/\${patient.id}\` },
    authoredOn: new Date().toISOString(),
  };

  await medplum.createResource(task);
  return { success: true, valid: false, issues, taskCreated: true };
}
`.trim(),

  auditLogger: `
import { BotEvent, MedplumClient } from '@medplum/core';
import { Resource, AuditEvent } from '@medplum/fhirtypes';

export async function handler(medplum: MedplumClient, event: BotEvent): Promise<any> {
  const resource = event.input as Resource;

  const auditEvent: AuditEvent = {
    resourceType: 'AuditEvent',
    type: { system: 'http://terminology.hl7.org/CodeSystem/audit-event-type', code: 'rest' },
    action: 'C',
    recorded: new Date().toISOString(),
    outcome: '0',
    outcomeDesc: \`Resource \${resource.resourceType}/\${resource.id} was created/updated\`,
    agent: [{ who: { display: 'PlumCare Bot' }, requestor: false }],
    source: { observer: { display: 'PlumCare System' } },
    entity: [{ what: { reference: \`\${resource.resourceType}/\${resource.id}\` } }],
  };

  await medplum.createResource(auditEvent);
  return { success: true, auditLogged: true };
}
`.trim(),
};

/**
 * Get available bot templates
 */
export function getBotTemplates(): BotTemplate[] {
  return [
    { name: 'Welcome Email', description: 'Sends welcome email when new patient is created', key: 'welcomeEmail' },
    { name: 'Lab Result Alert', description: 'Creates urgent task for critical/abnormal lab values', key: 'labResultAlert' },
    { name: 'Appointment Reminder', description: 'Creates reminder communications for scheduled appointments', key: 'appointmentReminder' },
    { name: 'Data Validation', description: 'Validates patient data completeness and creates tasks for missing info', key: 'dataValidation' },
    { name: 'Audit Logger', description: 'Logs all resource changes for compliance tracking', key: 'auditLogger' },
  ];
}

/**
 * Get a specific template by key
 */
export function getBotTemplateByKey(key: string): string | undefined {
  return BOT_TEMPLATES[key as keyof typeof BOT_TEMPLATES];
}
