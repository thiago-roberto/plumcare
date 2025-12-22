import type { Bot, Subscription, ProjectMembership } from '@medplum/fhirtypes';
import { getMedplumClient } from './medplum.service.js';

/**
 * Bot Service
 *
 * Manages Medplum Bots - serverless functions that execute when triggered.
 * Bots are like "smart butlers" that automatically process data when
 * certain events occur (via Subscriptions) or on a schedule.
 *
 * Note: Bots require:
 * 1. Project-level "bots" feature enabled
 * 2. Bot code deployed to Medplum
 * 3. Subscription to trigger the bot (or manual/scheduled execution)
 */

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

// In-memory store for bot executions (demo purposes)
const botExecutions: BotExecution[] = [];

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
    botExecutions.unshift(execution);

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
    botExecutions.unshift(execution);

    throw error;
  }
}

/**
 * Get bot execution history
 */
export function getBotExecutions(botId?: string, limit = 20): BotExecution[] {
  let filtered = botExecutions;

  if (botId) {
    filtered = botExecutions.filter(e => e.botId === botId);
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
  /**
   * Welcome Email Bot - sends welcome email when new patient is created
   */
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

  // In production: integrate with email service (SendGrid, AWS SES, etc.)
  // await sendEmail({
  //   to: email,
  //   subject: 'Welcome to PlumCare!',
  //   body: \`Hello \${firstName}, welcome to our practice...\`
  // });

  return {
    success: true,
    message: \`Welcome email sent to \${email}\`
  };
}
`.trim(),

  /**
   * Lab Result Alert Bot - creates task for abnormal lab values
   */
  labResultAlert: `
import { BotEvent, MedplumClient } from '@medplum/core';
import { DiagnosticReport, Task } from '@medplum/fhirtypes';

export async function handler(medplum: MedplumClient, event: BotEvent): Promise<any> {
  const report = event.input as DiagnosticReport;

  // Check if the report has critical/abnormal interpretation
  const hasCritical = report.conclusion?.toLowerCase().includes('critical') ||
    report.conclusion?.toLowerCase().includes('abnormal');

  if (!hasCritical) {
    console.log('Lab result is normal - no action needed');
    return { success: true, action: 'none' };
  }

  console.log(\`Critical lab result detected: \${report.code?.text}\`);

  // Create a Task for physician review
  const task: Task = {
    resourceType: 'Task',
    status: 'requested',
    intent: 'order',
    priority: 'urgent',
    code: {
      text: 'Review Critical Lab Result',
    },
    description: \`Critical lab result requires review: \${report.code?.text}. \${report.conclusion || ''}\`,
    focus: {
      reference: \`DiagnosticReport/\${report.id}\`,
    },
    for: report.subject,
    authoredOn: new Date().toISOString(),
  };

  const createdTask = await medplum.createResource(task);

  return {
    success: true,
    action: 'task_created',
    taskId: createdTask.id
  };
}
`.trim(),

  /**
   * Appointment Reminder Bot - creates communication for upcoming appointments
   */
  appointmentReminder: `
import { BotEvent, MedplumClient } from '@medplum/core';
import { Encounter, Communication } from '@medplum/fhirtypes';

export async function handler(medplum: MedplumClient, event: BotEvent): Promise<any> {
  const encounter = event.input as Encounter;

  // Only process scheduled appointments
  if (encounter.status !== 'planned') {
    return { success: true, action: 'skipped', reason: 'Not a planned encounter' };
  }

  const patientRef = encounter.subject?.reference;
  if (!patientRef) {
    return { success: false, reason: 'No patient reference' };
  }

  console.log(\`Creating appointment reminder for \${patientRef}\`);

  // Create a Communication resource for the reminder
  const communication: Communication = {
    resourceType: 'Communication',
    status: 'preparation',
    category: [{
      coding: [{
        system: 'http://terminology.hl7.org/CodeSystem/communication-category',
        code: 'reminder',
        display: 'Reminder',
      }],
    }],
    subject: { reference: patientRef },
    about: [{ reference: \`Encounter/\${encounter.id}\` }],
    payload: [{
      contentString: \`Reminder: You have an upcoming appointment. Please arrive 15 minutes early.\`,
    }],
    sent: new Date().toISOString(),
  };

  const created = await medplum.createResource(communication);

  return {
    success: true,
    action: 'reminder_created',
    communicationId: created.id
  };
}
`.trim(),

  /**
   * Data Validation Bot - validates patient data completeness
   */
  dataValidation: `
import { BotEvent, MedplumClient } from '@medplum/core';
import { Patient, Task } from '@medplum/fhirtypes';

export async function handler(medplum: MedplumClient, event: BotEvent): Promise<any> {
  const patient = event.input as Patient;
  const issues: string[] = [];

  // Check for required fields
  if (!patient.name || patient.name.length === 0) {
    issues.push('Missing patient name');
  }

  if (!patient.birthDate) {
    issues.push('Missing birth date');
  }

  if (!patient.gender) {
    issues.push('Missing gender');
  }

  const hasPhone = patient.telecom?.some(t => t.system === 'phone');
  const hasEmail = patient.telecom?.some(t => t.system === 'email');

  if (!hasPhone && !hasEmail) {
    issues.push('Missing contact information (phone or email)');
  }

  if (!patient.address || patient.address.length === 0) {
    issues.push('Missing address');
  }

  if (issues.length === 0) {
    console.log('Patient data validation passed');
    return { success: true, valid: true };
  }

  console.log(\`Patient data validation failed: \${issues.join(', ')}\`);

  // Create a task for data completion
  const task: Task = {
    resourceType: 'Task',
    status: 'requested',
    intent: 'order',
    priority: 'routine',
    code: {
      text: 'Complete Patient Data',
    },
    description: \`Patient record is incomplete. Missing: \${issues.join(', ')}\`,
    for: { reference: \`Patient/\${patient.id}\` },
    authoredOn: new Date().toISOString(),
  };

  await medplum.createResource(task);

  return {
    success: true,
    valid: false,
    issues,
    taskCreated: true
  };
}
`.trim(),

  /**
   * Audit Logger Bot - logs all changes for compliance
   */
  auditLogger: `
import { BotEvent, MedplumClient } from '@medplum/core';
import { Resource, AuditEvent } from '@medplum/fhirtypes';

export async function handler(medplum: MedplumClient, event: BotEvent): Promise<any> {
  const resource = event.input as Resource;

  console.log(\`Logging audit event for \${resource.resourceType}/\${resource.id}\`);

  const auditEvent: AuditEvent = {
    resourceType: 'AuditEvent',
    type: {
      system: 'http://terminology.hl7.org/CodeSystem/audit-event-type',
      code: 'rest',
      display: 'RESTful Operation',
    },
    action: 'C', // Create
    recorded: new Date().toISOString(),
    outcome: '0', // Success
    outcomeDesc: \`Resource \${resource.resourceType}/\${resource.id} was created/updated\`,
    agent: [{
      who: { display: 'PlumCare Bot' },
      requestor: false,
    }],
    source: {
      observer: { display: 'PlumCare System' },
    },
    entity: [{
      what: { reference: \`\${resource.resourceType}/\${resource.id}\` },
      type: {
        system: 'http://terminology.hl7.org/CodeSystem/audit-entity-type',
        code: '2', // System Object
      },
    }],
  };

  await medplum.createResource(auditEvent);

  return {
    success: true,
    auditLogged: true,
    resourceType: resource.resourceType,
    resourceId: resource.id
  };
}
`.trim(),
};

/**
 * Get available bot templates
 */
export function getBotTemplates(): { name: string; description: string; key: keyof typeof BOT_TEMPLATES }[] {
  return [
    {
      name: 'Welcome Email',
      description: 'Sends welcome email when new patient is created',
      key: 'welcomeEmail',
    },
    {
      name: 'Lab Result Alert',
      description: 'Creates urgent task for critical/abnormal lab values',
      key: 'labResultAlert',
    },
    {
      name: 'Appointment Reminder',
      description: 'Creates reminder communications for scheduled appointments',
      key: 'appointmentReminder',
    },
    {
      name: 'Data Validation',
      description: 'Validates patient data completeness and creates tasks for missing info',
      key: 'dataValidation',
    },
    {
      name: 'Audit Logger',
      description: 'Logs all resource changes for compliance tracking',
      key: 'auditLogger',
    },
  ];
}
