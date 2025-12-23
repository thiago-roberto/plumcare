import type { Subscription } from '@medplum/fhirtypes';

/**
 * Subscription test fixtures
 */

export const createSubscriptionFixture = (overrides: Partial<Subscription> = {}): Subscription => ({
  resourceType: 'Subscription',
  id: 'test-subscription-001',
  meta: {
    lastUpdated: '2024-01-15T10:00:00Z',
    versionId: '1',
  },
  status: 'active',
  reason: 'Test Subscription',
  criteria: 'Patient',
  channel: {
    type: 'rest-hook',
    endpoint: 'http://localhost:8000/api/webhooks/medplum',
    payload: 'application/fhir+json',
  },
  ...overrides,
});

export const patientCreateSubscriptionFixture = createSubscriptionFixture({
  id: 'patient-create-subscription',
  reason: 'New Patient Notifications',
  criteria: 'Patient',
  extension: [
    {
      url: 'https://medplum.com/fhir/StructureDefinition/subscription-supported-interaction',
      valueCode: 'create',
    },
  ],
});

export const patientUpdateSubscriptionFixture = createSubscriptionFixture({
  id: 'patient-update-subscription',
  reason: 'Patient Update Notifications',
  criteria: 'Patient',
  extension: [
    {
      url: 'https://medplum.com/fhir/StructureDefinition/subscription-supported-interaction',
      valueCode: 'update',
    },
  ],
});

export const encounterCreateSubscriptionFixture = createSubscriptionFixture({
  id: 'encounter-create-subscription',
  reason: 'New Encounter Notifications',
  criteria: 'Encounter',
  extension: [
    {
      url: 'https://medplum.com/fhir/StructureDefinition/subscription-supported-interaction',
      valueCode: 'create',
    },
  ],
});

export const diagnosticReportSubscriptionFixture = createSubscriptionFixture({
  id: 'diagnostic-report-subscription',
  reason: 'Lab Results Notifications',
  criteria: 'DiagnosticReport',
  extension: [
    {
      url: 'https://medplum.com/fhir/StructureDefinition/subscription-supported-interaction',
      valueCode: 'create',
    },
  ],
});

export const pausedSubscriptionFixture = createSubscriptionFixture({
  id: 'paused-subscription',
  reason: 'Paused Subscription',
  criteria: 'Task',
  status: 'off',
});

export const subscriptionListFixture: Subscription[] = [
  patientCreateSubscriptionFixture,
  patientUpdateSubscriptionFixture,
  encounterCreateSubscriptionFixture,
  diagnosticReportSubscriptionFixture,
  pausedSubscriptionFixture,
];
