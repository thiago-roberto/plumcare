import type { Patient } from '@medplum/fhirtypes';

/**
 * Patient test fixtures
 */

export const createPatientFixture = (overrides: Partial<Patient> = {}): Patient => ({
  resourceType: 'Patient',
  id: 'test-patient-001',
  meta: {
    lastUpdated: '2024-01-15T10:00:00Z',
    tag: [
      {
        system: 'http://plumcare.io/ehr-source',
        code: 'athena',
      },
    ],
  },
  identifier: [
    {
      system: 'http://athena.com/patient-id',
      value: 'ATH-12345',
    },
  ],
  active: true,
  name: [
    {
      use: 'official',
      family: 'Smith',
      given: ['John', 'Robert'],
    },
  ],
  gender: 'male',
  birthDate: '1985-03-15',
  telecom: [
    {
      system: 'phone',
      value: '555-123-4567',
      use: 'mobile',
    },
    {
      system: 'email',
      value: 'john.smith@example.com',
    },
  ],
  address: [
    {
      use: 'home',
      line: ['123 Main Street'],
      city: 'Boston',
      state: 'MA',
      postalCode: '02101',
      country: 'USA',
    },
  ],
  ...overrides,
});

export const athenaPatientFixture = createPatientFixture({
  id: 'athena-patient-001',
  meta: {
    lastUpdated: '2024-01-15T10:00:00Z',
    tag: [{ system: 'http://plumcare.io/ehr-source', code: 'athena' }],
  },
});

export const elationPatientFixture = createPatientFixture({
  id: 'elation-patient-001',
  name: [{ use: 'official', family: 'Johnson', given: ['Sarah'] }],
  gender: 'female',
  birthDate: '1990-07-22',
  meta: {
    lastUpdated: '2024-01-15T11:00:00Z',
    tag: [{ system: 'http://plumcare.io/ehr-source', code: 'elation' }],
  },
});

export const nextgenPatientFixture = createPatientFixture({
  id: 'nextgen-patient-001',
  name: [{ use: 'official', family: 'Williams', given: ['Michael'] }],
  gender: 'male',
  birthDate: '1978-11-08',
  meta: {
    lastUpdated: '2024-01-15T12:00:00Z',
    tag: [{ system: 'http://plumcare.io/ehr-source', code: 'nextgen' }],
  },
});

export const patientListFixture: Patient[] = [
  athenaPatientFixture,
  elationPatientFixture,
  nextgenPatientFixture,
];
