import type { Patient, Encounter, Observation, Condition, DiagnosticReport } from '@medplum/fhirtypes';

// EHR System types
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

// Mock EHR Connections
export const mockEhrConnections: EhrConnection[] = [
  {
    id: 'athena-001',
    system: 'athena',
    name: 'Athena Health',
    status: 'connected',
    lastSync: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 mins ago
    patientCount: 12847,
    encounterCount: 45632,
    pendingRecords: 23,
    apiVersion: 'v1',
    fhirVersion: 'R4',
    capabilities: ['Patient', 'Encounter', 'Observation', 'Condition', 'DiagnosticReport', 'AllergyIntolerance', 'MedicationRequest'],
  },
  {
    id: 'elation-001',
    system: 'elation',
    name: 'Elation Health',
    status: 'syncing',
    lastSync: new Date(Date.now() - 2 * 60 * 1000).toISOString(), // 2 mins ago
    patientCount: 8234,
    encounterCount: 29876,
    pendingRecords: 156,
    apiVersion: 'v2',
    fhirVersion: 'R4',
    capabilities: ['Patient', 'Encounter', 'Observation', 'Condition', 'CarePlan', 'Immunization'],
  },
  {
    id: 'nextgen-001',
    system: 'nextgen',
    name: 'NextGen Healthcare',
    status: 'connected',
    lastSync: new Date(Date.now() - 15 * 60 * 1000).toISOString(), // 15 mins ago
    patientCount: 21456,
    encounterCount: 78234,
    pendingRecords: 0,
    apiVersion: 'v3.1',
    fhirVersion: 'R4',
    capabilities: ['Patient', 'Encounter', 'Observation', 'Condition', 'DiagnosticReport', 'Procedure', 'DocumentReference'],
  },
];

// Mock Sync Events
export const mockSyncEvents: SyncEvent[] = [
  {
    id: 'sync-001',
    timestamp: new Date(Date.now() - 1 * 60 * 1000).toISOString(),
    system: 'athena',
    type: 'patient',
    action: 'updated',
    resourceId: 'Patient/athena-12345',
    status: 'success',
    details: 'Demographics updated',
  },
  {
    id: 'sync-002',
    timestamp: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    system: 'elation',
    type: 'encounter',
    action: 'created',
    resourceId: 'Encounter/elation-67890',
    status: 'success',
    details: 'New office visit created',
  },
  {
    id: 'sync-003',
    timestamp: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
    system: 'nextgen',
    type: 'observation',
    action: 'created',
    resourceId: 'Observation/nextgen-11111',
    status: 'success',
    details: 'Vital signs recorded',
  },
  {
    id: 'sync-004',
    timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    system: 'athena',
    type: 'condition',
    action: 'updated',
    resourceId: 'Condition/athena-22222',
    status: 'success',
    details: 'Diagnosis status changed to resolved',
  },
  {
    id: 'sync-005',
    timestamp: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
    system: 'elation',
    type: 'diagnostic_report',
    action: 'created',
    resourceId: 'DiagnosticReport/elation-33333',
    status: 'pending',
    details: 'Lab results pending verification',
  },
  {
    id: 'sync-006',
    timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    system: 'nextgen',
    type: 'patient',
    action: 'created',
    resourceId: 'Patient/nextgen-44444',
    status: 'success',
    details: 'New patient registered',
  },
  {
    id: 'sync-007',
    timestamp: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
    system: 'athena',
    type: 'encounter',
    action: 'updated',
    resourceId: 'Encounter/athena-55555',
    status: 'failed',
    details: 'Validation error: missing required field',
  },
];

// Mock Patients by EHR
export function getMockPatientsByEhr(system: EhrSystem): Patient[] {
  const basePatients: Record<EhrSystem, Patient[]> = {
    athena: [
      {
        resourceType: 'Patient',
        id: 'athena-p-001',
        identifier: [{ system: 'urn:athena:patient', value: 'ATH-12345' }],
        name: [{ family: 'Johnson', given: ['Michael', 'Robert'] }],
        gender: 'male',
        birthDate: '1978-03-15',
        address: [{ city: 'Boston', state: 'MA', postalCode: '02108' }],
        telecom: [{ system: 'phone', value: '617-555-0123' }],
      },
      {
        resourceType: 'Patient',
        id: 'athena-p-002',
        identifier: [{ system: 'urn:athena:patient', value: 'ATH-12346' }],
        name: [{ family: 'Williams', given: ['Sarah', 'Anne'] }],
        gender: 'female',
        birthDate: '1985-07-22',
        address: [{ city: 'Cambridge', state: 'MA', postalCode: '02139' }],
        telecom: [{ system: 'phone', value: '617-555-0456' }],
      },
      {
        resourceType: 'Patient',
        id: 'athena-p-003',
        identifier: [{ system: 'urn:athena:patient', value: 'ATH-12347' }],
        name: [{ family: 'Davis', given: ['James'] }],
        gender: 'male',
        birthDate: '1962-11-08',
        address: [{ city: 'Brookline', state: 'MA', postalCode: '02445' }],
        telecom: [{ system: 'phone', value: '617-555-0789' }],
      },
    ],
    elation: [
      {
        resourceType: 'Patient',
        id: 'elation-p-001',
        identifier: [{ system: 'urn:elation:patient', value: 'ELA-67890' }],
        name: [{ family: 'Martinez', given: ['Elena', 'Maria'] }],
        gender: 'female',
        birthDate: '1990-01-28',
        address: [{ city: 'San Francisco', state: 'CA', postalCode: '94102' }],
        telecom: [{ system: 'phone', value: '415-555-0123' }],
      },
      {
        resourceType: 'Patient',
        id: 'elation-p-002',
        identifier: [{ system: 'urn:elation:patient', value: 'ELA-67891' }],
        name: [{ family: 'Chen', given: ['David', 'Wei'] }],
        gender: 'male',
        birthDate: '1975-09-14',
        address: [{ city: 'Oakland', state: 'CA', postalCode: '94612' }],
        telecom: [{ system: 'phone', value: '510-555-0456' }],
      },
    ],
    nextgen: [
      {
        resourceType: 'Patient',
        id: 'nextgen-p-001',
        identifier: [{ system: 'urn:nextgen:patient', value: 'NXG-11111' }],
        name: [{ family: 'Thompson', given: ['Emily', 'Grace'] }],
        gender: 'female',
        birthDate: '1988-05-03',
        address: [{ city: 'Austin', state: 'TX', postalCode: '78701' }],
        telecom: [{ system: 'phone', value: '512-555-0123' }],
      },
      {
        resourceType: 'Patient',
        id: 'nextgen-p-002',
        identifier: [{ system: 'urn:nextgen:patient', value: 'NXG-11112' }],
        name: [{ family: 'Brown', given: ['Christopher'] }],
        gender: 'male',
        birthDate: '1970-12-20',
        address: [{ city: 'Dallas', state: 'TX', postalCode: '75201' }],
        telecom: [{ system: 'phone', value: '214-555-0456' }],
      },
      {
        resourceType: 'Patient',
        id: 'nextgen-p-003',
        identifier: [{ system: 'urn:nextgen:patient', value: 'NXG-11113' }],
        name: [{ family: 'Garcia', given: ['Maria', 'Isabel'] }],
        gender: 'female',
        birthDate: '1995-08-11',
        address: [{ city: 'Houston', state: 'TX', postalCode: '77001' }],
        telecom: [{ system: 'phone', value: '713-555-0789' }],
      },
    ],
    medplum: [], // Medplum patients are fetched directly from the API
  };

  return basePatients[system];
}

// Mock Encounters by EHR
export function getMockEncountersByEhr(system: EhrSystem): Encounter[] {
  const baseEncounters: Record<EhrSystem, Encounter[]> = {
    athena: [
      {
        resourceType: 'Encounter',
        id: 'athena-e-001',
        status: 'finished',
        class: { system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode', code: 'AMB', display: 'ambulatory' },
        type: [{ coding: [{ system: 'http://snomed.info/sct', code: '185349003', display: 'Office visit' }] }],
        subject: { reference: 'Patient/athena-p-001', display: 'Michael Johnson' },
        period: { start: '2024-12-10T09:00:00Z', end: '2024-12-10T09:30:00Z' },
        reasonCode: [{ text: 'Annual physical examination' }],
      },
      {
        resourceType: 'Encounter',
        id: 'athena-e-002',
        status: 'in-progress',
        class: { system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode', code: 'AMB', display: 'ambulatory' },
        type: [{ coding: [{ system: 'http://snomed.info/sct', code: '185349003', display: 'Office visit' }] }],
        subject: { reference: 'Patient/athena-p-002', display: 'Sarah Williams' },
        period: { start: '2024-12-16T10:00:00Z' },
        reasonCode: [{ text: 'Follow-up for hypertension' }],
      },
    ],
    elation: [
      {
        resourceType: 'Encounter',
        id: 'elation-e-001',
        status: 'finished',
        class: { system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode', code: 'AMB', display: 'ambulatory' },
        type: [{ coding: [{ system: 'http://snomed.info/sct', code: '185349003', display: 'Office visit' }] }],
        subject: { reference: 'Patient/elation-p-001', display: 'Elena Martinez' },
        period: { start: '2024-12-15T14:00:00Z', end: '2024-12-15T14:45:00Z' },
        reasonCode: [{ text: 'Diabetes management' }],
      },
    ],
    nextgen: [
      {
        resourceType: 'Encounter',
        id: 'nextgen-e-001',
        status: 'finished',
        class: { system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode', code: 'AMB', display: 'ambulatory' },
        type: [{ coding: [{ system: 'http://snomed.info/sct', code: '185349003', display: 'Office visit' }] }],
        subject: { reference: 'Patient/nextgen-p-001', display: 'Emily Thompson' },
        period: { start: '2024-12-14T11:00:00Z', end: '2024-12-14T11:30:00Z' },
        reasonCode: [{ text: 'Prenatal checkup' }],
      },
      {
        resourceType: 'Encounter',
        id: 'nextgen-e-002',
        status: 'planned',
        class: { system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode', code: 'AMB', display: 'ambulatory' },
        type: [{ coding: [{ system: 'http://snomed.info/sct', code: '185349003', display: 'Office visit' }] }],
        subject: { reference: 'Patient/nextgen-p-002', display: 'Christopher Brown' },
        period: { start: '2024-12-20T15:00:00Z' },
        reasonCode: [{ text: 'Cardiology consultation' }],
      },
    ],
    medplum: [], // Medplum encounters are fetched directly from the API
  };

  return baseEncounters[system];
}

// Mock Observations (Vitals) by EHR
export function getMockObservationsByEhr(system: EhrSystem): Observation[] {
  const baseObservations: Record<EhrSystem, Observation[]> = {
    athena: [
      {
        resourceType: 'Observation',
        id: 'athena-o-001',
        status: 'final',
        category: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/observation-category', code: 'vital-signs' }] }],
        code: { coding: [{ system: 'http://loinc.org', code: '8867-4', display: 'Heart rate' }] },
        subject: { reference: 'Patient/athena-p-001' },
        effectiveDateTime: '2024-12-10T09:15:00Z',
        valueQuantity: { value: 72, unit: 'beats/minute', system: 'http://unitsofmeasure.org', code: '/min' },
      },
      {
        resourceType: 'Observation',
        id: 'athena-o-002',
        status: 'final',
        category: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/observation-category', code: 'vital-signs' }] }],
        code: { coding: [{ system: 'http://loinc.org', code: '8480-6', display: 'Systolic blood pressure' }] },
        subject: { reference: 'Patient/athena-p-001' },
        effectiveDateTime: '2024-12-10T09:15:00Z',
        valueQuantity: { value: 120, unit: 'mmHg', system: 'http://unitsofmeasure.org', code: 'mm[Hg]' },
      },
    ],
    elation: [
      {
        resourceType: 'Observation',
        id: 'elation-o-001',
        status: 'final',
        category: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/observation-category', code: 'laboratory' }] }],
        code: { coding: [{ system: 'http://loinc.org', code: '4548-4', display: 'Hemoglobin A1c' }] },
        subject: { reference: 'Patient/elation-p-001' },
        effectiveDateTime: '2024-12-15T14:30:00Z',
        valueQuantity: { value: 6.8, unit: '%', system: 'http://unitsofmeasure.org', code: '%' },
      },
    ],
    nextgen: [
      {
        resourceType: 'Observation',
        id: 'nextgen-o-001',
        status: 'final',
        category: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/observation-category', code: 'vital-signs' }] }],
        code: { coding: [{ system: 'http://loinc.org', code: '29463-7', display: 'Body weight' }] },
        subject: { reference: 'Patient/nextgen-p-001' },
        effectiveDateTime: '2024-12-14T11:10:00Z',
        valueQuantity: { value: 68, unit: 'kg', system: 'http://unitsofmeasure.org', code: 'kg' },
      },
    ],
    medplum: [], // Medplum observations are fetched directly from the API
  };

  return baseObservations[system];
}

// Mock Conditions by EHR
export function getMockConditionsByEhr(system: EhrSystem): Condition[] {
  const baseConditions: Record<EhrSystem, Condition[]> = {
    athena: [
      {
        resourceType: 'Condition',
        id: 'athena-c-001',
        clinicalStatus: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-clinical', code: 'active' }] },
        verificationStatus: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-ver-status', code: 'confirmed' }] },
        category: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-category', code: 'problem-list-item' }] }],
        code: { coding: [{ system: 'http://snomed.info/sct', code: '38341003', display: 'Hypertension' }], text: 'Essential hypertension' },
        subject: { reference: 'Patient/athena-p-002' },
        onsetDateTime: '2020-06-15',
      },
    ],
    elation: [
      {
        resourceType: 'Condition',
        id: 'elation-c-001',
        clinicalStatus: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-clinical', code: 'active' }] },
        verificationStatus: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-ver-status', code: 'confirmed' }] },
        category: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-category', code: 'problem-list-item' }] }],
        code: { coding: [{ system: 'http://snomed.info/sct', code: '44054006', display: 'Type 2 diabetes mellitus' }], text: 'Type 2 diabetes mellitus' },
        subject: { reference: 'Patient/elation-p-001' },
        onsetDateTime: '2019-03-20',
      },
    ],
    nextgen: [
      {
        resourceType: 'Condition',
        id: 'nextgen-c-001',
        clinicalStatus: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-clinical', code: 'active' }] },
        verificationStatus: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-ver-status', code: 'confirmed' }] },
        category: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-category', code: 'problem-list-item' }] }],
        code: { coding: [{ system: 'http://snomed.info/sct', code: '77386006', display: 'Pregnancy' }], text: 'Normal pregnancy' },
        subject: { reference: 'Patient/nextgen-p-001' },
        onsetDateTime: '2024-06-01',
      },
    ],
    medplum: [], // Medplum conditions are fetched directly from the API
  };

  return baseConditions[system];
}

// Mock Diagnostic Reports by EHR
export function getMockDiagnosticReportsByEhr(system: EhrSystem): DiagnosticReport[] {
  const baseReports: Record<EhrSystem, DiagnosticReport[]> = {
    athena: [
      {
        resourceType: 'DiagnosticReport',
        id: 'athena-dr-001',
        status: 'final',
        category: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/v2-0074', code: 'LAB' }] }],
        code: { coding: [{ system: 'http://loinc.org', code: '58410-2', display: 'Complete blood count' }], text: 'CBC with differential' },
        subject: { reference: 'Patient/athena-p-001' },
        effectiveDateTime: '2024-12-10T10:00:00Z',
        issued: '2024-12-10T14:00:00Z',
        conclusion: 'All values within normal limits',
      },
    ],
    elation: [
      {
        resourceType: 'DiagnosticReport',
        id: 'elation-dr-001',
        status: 'final',
        category: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/v2-0074', code: 'LAB' }] }],
        code: { coding: [{ system: 'http://loinc.org', code: '24323-8', display: 'Comprehensive metabolic panel' }], text: 'CMP' },
        subject: { reference: 'Patient/elation-p-001' },
        effectiveDateTime: '2024-12-15T15:00:00Z',
        issued: '2024-12-15T18:00:00Z',
        conclusion: 'Glucose slightly elevated, consistent with diabetes diagnosis',
      },
    ],
    nextgen: [
      {
        resourceType: 'DiagnosticReport',
        id: 'nextgen-dr-001',
        status: 'final',
        category: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/v2-0074', code: 'RAD' }] }],
        code: { coding: [{ system: 'http://loinc.org', code: '11525-3', display: 'Obstetric ultrasound' }], text: 'Prenatal ultrasound' },
        subject: { reference: 'Patient/nextgen-p-001' },
        effectiveDateTime: '2024-12-14T12:00:00Z',
        issued: '2024-12-14T13:00:00Z',
        conclusion: 'Normal fetal development at 24 weeks',
      },
    ],
    medplum: [], // Medplum diagnostic reports are fetched directly from the API
  };

  return baseReports[system];
}

// Aggregate stats
export function getAggregateStats() {
  const totalPatients = mockEhrConnections.reduce((sum, conn) => sum + conn.patientCount, 0);
  const totalEncounters = mockEhrConnections.reduce((sum, conn) => sum + conn.encounterCount, 0);
  const totalPending = mockEhrConnections.reduce((sum, conn) => sum + conn.pendingRecords, 0);
  const connectedSystems = mockEhrConnections.filter(conn => conn.status === 'connected' || conn.status === 'syncing').length;

  return {
    totalPatients,
    totalEncounters,
    totalPending,
    connectedSystems,
    totalSystems: mockEhrConnections.length,
  };
}

// EHR System metadata
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
