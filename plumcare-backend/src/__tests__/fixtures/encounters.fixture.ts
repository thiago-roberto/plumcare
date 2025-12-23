import type { Encounter } from '@medplum/fhirtypes';

/**
 * Encounter test fixtures
 */

export const createEncounterFixture = (overrides: Partial<Encounter> = {}): Encounter => ({
  resourceType: 'Encounter',
  id: 'test-encounter-001',
  meta: {
    lastUpdated: '2024-01-15T10:00:00Z',
    tag: [
      {
        system: 'http://plumcare.io/ehr-source',
        code: 'athena',
      },
    ],
  },
  status: 'finished',
  class: {
    system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
    code: 'AMB',
    display: 'ambulatory',
  },
  type: [
    {
      coding: [
        {
          system: 'http://snomed.info/sct',
          code: '308335008',
          display: 'Patient encounter procedure',
        },
      ],
    },
  ],
  subject: {
    reference: 'Patient/test-patient-001',
    display: 'John Smith',
  },
  period: {
    start: '2024-01-15T09:00:00Z',
    end: '2024-01-15T09:30:00Z',
  },
  reasonCode: [
    {
      coding: [
        {
          system: 'http://snomed.info/sct',
          code: '185349003',
          display: 'Encounter for check up',
        },
      ],
    },
  ],
  ...overrides,
});

export const athenaEncounterFixture = createEncounterFixture({
  id: 'athena-encounter-001',
  subject: { reference: 'Patient/athena-patient-001', display: 'John Smith' },
  meta: {
    lastUpdated: '2024-01-15T10:00:00Z',
    tag: [{ system: 'http://plumcare.io/ehr-source', code: 'athena' }],
  },
});

export const elationEncounterFixture = createEncounterFixture({
  id: 'elation-encounter-001',
  subject: { reference: 'Patient/elation-patient-001', display: 'Sarah Johnson' },
  status: 'in-progress',
  meta: {
    lastUpdated: '2024-01-15T11:00:00Z',
    tag: [{ system: 'http://plumcare.io/ehr-source', code: 'elation' }],
  },
});

export const nextgenEncounterFixture = createEncounterFixture({
  id: 'nextgen-encounter-001',
  subject: { reference: 'Patient/nextgen-patient-001', display: 'Michael Williams' },
  status: 'planned',
  meta: {
    lastUpdated: '2024-01-15T12:00:00Z',
    tag: [{ system: 'http://plumcare.io/ehr-source', code: 'nextgen' }],
  },
});

export const encounterListFixture: Encounter[] = [
  athenaEncounterFixture,
  elationEncounterFixture,
  nextgenEncounterFixture,
];
