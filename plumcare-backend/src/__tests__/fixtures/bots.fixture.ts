import type { Bot } from '@medplum/fhirtypes';

/**
 * Bot test fixtures
 */

export const createBotFixture = (overrides: Partial<Bot> = {}): Bot => ({
  resourceType: 'Bot',
  id: 'test-bot-001',
  meta: {
    lastUpdated: '2024-01-15T10:00:00Z',
    versionId: '1',
  },
  name: 'Test Bot',
  description: 'A test bot for unit testing',
  runtimeVersion: 'awslambda',
  code: `
    export async function handler(medplum, event) {
      console.log('Bot executed');
      return { success: true };
    }
  `,
  ...overrides,
});

export const patientNotificationBotFixture = createBotFixture({
  id: 'patient-notification-bot',
  name: 'Patient Notification Bot',
  description: 'Sends notifications when new patients are created',
  code: `
    export async function handler(medplum, event) {
      const patient = event.input;
      console.log('New patient:', patient.id);
      // Send notification logic here
      return { notified: true, patientId: patient.id };
    }
  `,
});

export const encounterSyncBotFixture = createBotFixture({
  id: 'encounter-sync-bot',
  name: 'Encounter Sync Bot',
  description: 'Syncs encounters with external systems',
  code: `
    export async function handler(medplum, event) {
      const encounter = event.input;
      console.log('Syncing encounter:', encounter.id);
      // Sync logic here
      return { synced: true, encounterId: encounter.id };
    }
  `,
});

export const labResultProcessorBotFixture = createBotFixture({
  id: 'lab-result-processor-bot',
  name: 'Lab Result Processor',
  description: 'Processes incoming lab results and creates alerts',
  code: `
    export async function handler(medplum, event) {
      const report = event.input;
      console.log('Processing lab result:', report.id);
      // Processing logic here
      return { processed: true, reportId: report.id };
    }
  `,
});

export const botListFixture: Bot[] = [
  patientNotificationBotFixture,
  encounterSyncBotFixture,
  labResultProcessorBotFixture,
];

/**
 * Bot execution result fixtures
 */
export const botExecutionSuccessFixture = {
  success: true,
  result: { message: 'Bot executed successfully' },
  logs: ['Bot started', 'Processing complete', 'Bot finished'],
  duration: 150,
};

export const botExecutionErrorFixture = {
  success: false,
  error: 'Bot execution failed: Invalid input',
  logs: ['Bot started', 'Error: Invalid input'],
  duration: 50,
};
