import { v4 as uuidv4 } from 'uuid';
import {
  BaseEhrProvider,
  type AuthResult,
  type ProviderConfig,
  registerProvider,
} from '../base.provider.js';
import type {
  EhrConnection,
  EhrPatient,
  EhrEncounter,
  PaginationParams,
  PaginatedResponse,
  Observation,
  Condition,
  DiagnosticReport,
} from '../../types/index.js';

// Mock data store
const mockPatients: EhrPatient[] = [
  {
    id: 'athena-p-001',
    mrn: 'ATH-12345',
    firstName: 'Michael',
    lastName: 'Johnson',
    middleName: 'Robert',
    dateOfBirth: '1978-03-15',
    gender: 'male',
    email: 'michael.johnson@email.com',
    phone: '617-555-0123',
    address: {
      street: '123 Main Street',
      city: 'Boston',
      state: 'MA',
      postalCode: '02108',
      country: 'USA',
    },
    sourceSystem: 'athena',
    sourceId: 'athena-p-001',
    lastUpdated: '2024-12-10T09:00:00Z',
  },
  {
    id: 'athena-p-002',
    mrn: 'ATH-12346',
    firstName: 'Sarah',
    lastName: 'Williams',
    middleName: 'Anne',
    dateOfBirth: '1985-07-22',
    gender: 'female',
    email: 'sarah.williams@email.com',
    phone: '617-555-0456',
    address: {
      street: '456 Oak Avenue',
      city: 'Cambridge',
      state: 'MA',
      postalCode: '02139',
      country: 'USA',
    },
    sourceSystem: 'athena',
    sourceId: 'athena-p-002',
    lastUpdated: '2024-12-12T14:30:00Z',
  },
  {
    id: 'athena-p-003',
    mrn: 'ATH-12347',
    firstName: 'James',
    lastName: 'Davis',
    dateOfBirth: '1962-11-08',
    gender: 'male',
    phone: '617-555-0789',
    address: {
      city: 'Brookline',
      state: 'MA',
      postalCode: '02445',
    },
    sourceSystem: 'athena',
    sourceId: 'athena-p-003',
    lastUpdated: '2024-12-08T11:00:00Z',
  },
  {
    id: 'athena-p-004',
    mrn: 'ATH-12348',
    firstName: 'Emily',
    lastName: 'Chen',
    dateOfBirth: '1992-04-18',
    gender: 'female',
    email: 'emily.chen@email.com',
    phone: '617-555-1234',
    address: {
      street: '789 Pine Street',
      city: 'Somerville',
      state: 'MA',
      postalCode: '02143',
    },
    sourceSystem: 'athena',
    sourceId: 'athena-p-004',
    lastUpdated: '2024-12-15T10:15:00Z',
  },
  {
    id: 'athena-p-005',
    mrn: 'ATH-12349',
    firstName: 'Robert',
    lastName: 'Martinez',
    middleName: 'Luis',
    dateOfBirth: '1955-09-30',
    gender: 'male',
    phone: '617-555-5678',
    address: {
      city: 'Newton',
      state: 'MA',
      postalCode: '02458',
    },
    sourceSystem: 'athena',
    sourceId: 'athena-p-005',
    lastUpdated: '2024-12-14T16:45:00Z',
  },
];

const mockEncounters: EhrEncounter[] = [
  {
    id: 'athena-e-001',
    patientId: 'athena-p-001',
    type: 'Office Visit',
    status: 'finished',
    startTime: '2024-12-10T09:00:00Z',
    endTime: '2024-12-10T09:30:00Z',
    provider: { id: 'prov-001', name: 'Dr. Amanda Smith' },
    facility: { id: 'fac-001', name: 'Boston Medical Center' },
    reason: 'Annual physical examination',
    sourceSystem: 'athena',
    sourceId: 'athena-e-001',
    lastUpdated: '2024-12-10T09:30:00Z',
  },
  {
    id: 'athena-e-002',
    patientId: 'athena-p-002',
    type: 'Office Visit',
    status: 'in-progress',
    startTime: '2024-12-16T10:00:00Z',
    provider: { id: 'prov-002', name: 'Dr. John Lee' },
    facility: { id: 'fac-001', name: 'Boston Medical Center' },
    reason: 'Follow-up for hypertension',
    sourceSystem: 'athena',
    sourceId: 'athena-e-002',
    lastUpdated: '2024-12-16T10:00:00Z',
  },
  {
    id: 'athena-e-003',
    patientId: 'athena-p-003',
    type: 'Telehealth',
    status: 'finished',
    startTime: '2024-12-14T14:00:00Z',
    endTime: '2024-12-14T14:25:00Z',
    provider: { id: 'prov-001', name: 'Dr. Amanda Smith' },
    reason: 'Medication review',
    sourceSystem: 'athena',
    sourceId: 'athena-e-003',
    lastUpdated: '2024-12-14T14:25:00Z',
  },
  {
    id: 'athena-e-004',
    patientId: 'athena-p-004',
    type: 'Office Visit',
    status: 'planned',
    startTime: '2024-12-20T11:00:00Z',
    provider: { id: 'prov-003', name: 'Dr. Maria Garcia' },
    facility: { id: 'fac-002', name: 'Cambridge Health Alliance' },
    reason: 'New patient consultation',
    sourceSystem: 'athena',
    sourceId: 'athena-e-004',
    lastUpdated: '2024-12-15T09:00:00Z',
  },
  {
    id: 'athena-e-005',
    patientId: 'athena-p-001',
    type: 'Lab Visit',
    status: 'finished',
    startTime: '2024-12-11T08:00:00Z',
    endTime: '2024-12-11T08:15:00Z',
    facility: { id: 'fac-003', name: 'Quest Diagnostics' },
    reason: 'Blood work - CBC, CMP',
    sourceSystem: 'athena',
    sourceId: 'athena-e-005',
    lastUpdated: '2024-12-11T08:15:00Z',
  },
];

const mockObservations: Observation[] = [
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
  {
    resourceType: 'Observation',
    id: 'athena-o-003',
    status: 'final',
    category: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/observation-category', code: 'vital-signs' }] }],
    code: { coding: [{ system: 'http://loinc.org', code: '8462-4', display: 'Diastolic blood pressure' }] },
    subject: { reference: 'Patient/athena-p-001' },
    effectiveDateTime: '2024-12-10T09:15:00Z',
    valueQuantity: { value: 80, unit: 'mmHg', system: 'http://unitsofmeasure.org', code: 'mm[Hg]' },
  },
  {
    resourceType: 'Observation',
    id: 'athena-o-004',
    status: 'final',
    category: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/observation-category', code: 'vital-signs' }] }],
    code: { coding: [{ system: 'http://loinc.org', code: '8310-5', display: 'Body temperature' }] },
    subject: { reference: 'Patient/athena-p-001' },
    effectiveDateTime: '2024-12-10T09:15:00Z',
    valueQuantity: { value: 98.6, unit: 'degF', system: 'http://unitsofmeasure.org', code: '[degF]' },
  },
  {
    resourceType: 'Observation',
    id: 'athena-o-005',
    status: 'final',
    category: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/observation-category', code: 'vital-signs' }] }],
    code: { coding: [{ system: 'http://loinc.org', code: '8867-4', display: 'Heart rate' }] },
    subject: { reference: 'Patient/athena-p-002' },
    effectiveDateTime: '2024-12-16T10:10:00Z',
    valueQuantity: { value: 78, unit: 'beats/minute', system: 'http://unitsofmeasure.org', code: '/min' },
  },
];

const mockConditions: Condition[] = [
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
  {
    resourceType: 'Condition',
    id: 'athena-c-002',
    clinicalStatus: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-clinical', code: 'active' }] },
    verificationStatus: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-ver-status', code: 'confirmed' }] },
    category: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-category', code: 'problem-list-item' }] }],
    code: { coding: [{ system: 'http://snomed.info/sct', code: '73211009', display: 'Diabetes mellitus' }], text: 'Type 2 diabetes mellitus' },
    subject: { reference: 'Patient/athena-p-003' },
    onsetDateTime: '2018-03-20',
  },
  {
    resourceType: 'Condition',
    id: 'athena-c-003',
    clinicalStatus: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-clinical', code: 'resolved' }] },
    verificationStatus: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-ver-status', code: 'confirmed' }] },
    category: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-category', code: 'encounter-diagnosis' }] }],
    code: { coding: [{ system: 'http://snomed.info/sct', code: '195662009', display: 'Acute viral pharyngitis' }], text: 'Pharyngitis' },
    subject: { reference: 'Patient/athena-p-001' },
    onsetDateTime: '2024-11-15',
    abatementDateTime: '2024-11-22',
  },
];

const mockDiagnosticReports: DiagnosticReport[] = [
  {
    resourceType: 'DiagnosticReport',
    id: 'athena-dr-001',
    status: 'final',
    category: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/v2-0074', code: 'LAB' }] }],
    code: { coding: [{ system: 'http://loinc.org', code: '58410-2', display: 'Complete blood count' }], text: 'CBC with differential' },
    subject: { reference: 'Patient/athena-p-001' },
    effectiveDateTime: '2024-12-11T10:00:00Z',
    issued: '2024-12-11T14:00:00Z',
    conclusion: 'All values within normal limits',
  },
  {
    resourceType: 'DiagnosticReport',
    id: 'athena-dr-002',
    status: 'final',
    category: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/v2-0074', code: 'LAB' }] }],
    code: { coding: [{ system: 'http://loinc.org', code: '24323-8', display: 'Comprehensive metabolic panel' }], text: 'CMP' },
    subject: { reference: 'Patient/athena-p-001' },
    effectiveDateTime: '2024-12-11T10:00:00Z',
    issued: '2024-12-11T14:00:00Z',
    conclusion: 'Glucose and lipids within normal range',
  },
  {
    resourceType: 'DiagnosticReport',
    id: 'athena-dr-003',
    status: 'preliminary',
    category: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/v2-0074', code: 'LAB' }] }],
    code: { coding: [{ system: 'http://loinc.org', code: '4548-4', display: 'Hemoglobin A1c' }], text: 'HbA1c' },
    subject: { reference: 'Patient/athena-p-003' },
    effectiveDateTime: '2024-12-14T09:00:00Z',
    issued: '2024-12-14T16:00:00Z',
    conclusion: 'HbA1c: 7.2% - slightly above target',
  },
];

// Simulate API latency
const simulateLatency = () => new Promise(resolve => setTimeout(resolve, Math.random() * 200 + 100));

export class AthenaMockProvider extends BaseEhrProvider {
  private connectionStatus: EhrConnection;
  private lastSyncTime: Date;

  constructor(config: ProviderConfig) {
    super('athena', config);
    this.lastSyncTime = new Date(Date.now() - 5 * 60 * 1000); // 5 mins ago
    this.connectionStatus = {
      id: 'athena-001',
      system: 'athena',
      name: 'Athena Health',
      status: 'connected',
      lastSync: this.lastSyncTime.toISOString(),
      patientCount: 12847,
      encounterCount: 45632,
      pendingRecords: 23,
      apiVersion: 'v1',
      fhirVersion: 'R4',
      capabilities: ['Patient', 'Encounter', 'Observation', 'Condition', 'DiagnosticReport', 'AllergyIntolerance', 'MedicationRequest'],
    };
  }

  async authenticate(): Promise<AuthResult> {
    await simulateLatency();
    // Mock successful authentication
    return {
      accessToken: `mock-athena-token-${uuidv4()}`,
      refreshToken: `mock-athena-refresh-${uuidv4()}`,
      expiresAt: new Date(Date.now() + 3600 * 1000), // 1 hour
    };
  }

  async refreshToken(_refreshToken: string): Promise<AuthResult> {
    return this.authenticate();
  }

  async getConnectionStatus(): Promise<EhrConnection> {
    await simulateLatency();
    return {
      ...this.connectionStatus,
      lastSync: this.lastSyncTime.toISOString(),
    };
  }

  async getPatients(params?: PaginationParams): Promise<PaginatedResponse<EhrPatient>> {
    await simulateLatency();
    const limit = params?.limit || 10;
    const offset = params?.offset || 0;
    const paginatedData = mockPatients.slice(offset, offset + limit);

    return {
      data: paginatedData,
      total: mockPatients.length,
      limit,
      offset,
      hasMore: offset + limit < mockPatients.length,
    };
  }

  async getPatient(id: string): Promise<EhrPatient | null> {
    await simulateLatency();
    return mockPatients.find(p => p.id === id) || null;
  }

  async getEncounters(params?: PaginationParams): Promise<PaginatedResponse<EhrEncounter>> {
    await simulateLatency();
    const limit = params?.limit || 10;
    const offset = params?.offset || 0;
    const paginatedData = mockEncounters.slice(offset, offset + limit);

    return {
      data: paginatedData,
      total: mockEncounters.length,
      limit,
      offset,
      hasMore: offset + limit < mockEncounters.length,
    };
  }

  async getEncounter(id: string): Promise<EhrEncounter | null> {
    await simulateLatency();
    return mockEncounters.find(e => e.id === id) || null;
  }

  async getEncountersByPatient(patientId: string, params?: PaginationParams): Promise<PaginatedResponse<EhrEncounter>> {
    await simulateLatency();
    const patientEncounters = mockEncounters.filter(e => e.patientId === patientId);
    const limit = params?.limit || 10;
    const offset = params?.offset || 0;
    const paginatedData = patientEncounters.slice(offset, offset + limit);

    return {
      data: paginatedData,
      total: patientEncounters.length,
      limit,
      offset,
      hasMore: offset + limit < patientEncounters.length,
    };
  }

  async getObservations(patientId: string, params?: PaginationParams): Promise<PaginatedResponse<Observation>> {
    await simulateLatency();
    const patientObs = mockObservations.filter(o => o.subject?.reference === `Patient/${patientId}`);
    const limit = params?.limit || 10;
    const offset = params?.offset || 0;
    const paginatedData = patientObs.slice(offset, offset + limit);

    return {
      data: paginatedData,
      total: patientObs.length,
      limit,
      offset,
      hasMore: offset + limit < patientObs.length,
    };
  }

  async getConditions(patientId: string, params?: PaginationParams): Promise<PaginatedResponse<Condition>> {
    await simulateLatency();
    const patientConditions = mockConditions.filter(c => c.subject?.reference === `Patient/${patientId}`);
    const limit = params?.limit || 10;
    const offset = params?.offset || 0;
    const paginatedData = patientConditions.slice(offset, offset + limit);

    return {
      data: paginatedData,
      total: patientConditions.length,
      limit,
      offset,
      hasMore: offset + limit < patientConditions.length,
    };
  }

  async getDiagnosticReports(patientId: string, params?: PaginationParams): Promise<PaginatedResponse<DiagnosticReport>> {
    await simulateLatency();
    const patientReports = mockDiagnosticReports.filter(r => r.subject?.reference === `Patient/${patientId}`);
    const limit = params?.limit || 10;
    const offset = params?.offset || 0;
    const paginatedData = patientReports.slice(offset, offset + limit);

    return {
      data: paginatedData,
      total: patientReports.length,
      limit,
      offset,
      hasMore: offset + limit < patientReports.length,
    };
  }

  // Update last sync time (called after sync operations)
  updateLastSync(): void {
    this.lastSyncTime = new Date();
  }
}

// Register the mock provider
registerProvider('athena', (config) => new AthenaMockProvider(config));
