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
    id: 'nextgen-p-001',
    mrn: 'NXG-11111',
    firstName: 'Emily',
    lastName: 'Thompson',
    middleName: 'Grace',
    dateOfBirth: '1988-05-03',
    gender: 'female',
    email: 'emily.thompson@email.com',
    phone: '512-555-0123',
    address: {
      street: '500 Congress Avenue',
      city: 'Austin',
      state: 'TX',
      postalCode: '78701',
      country: 'USA',
    },
    sourceSystem: 'nextgen',
    sourceId: 'nextgen-p-001',
    lastUpdated: '2024-12-14T11:00:00Z',
  },
  {
    id: 'nextgen-p-002',
    mrn: 'NXG-11112',
    firstName: 'Christopher',
    lastName: 'Brown',
    dateOfBirth: '1970-12-20',
    gender: 'male',
    phone: '214-555-0456',
    address: {
      street: '1500 Main Street',
      city: 'Dallas',
      state: 'TX',
      postalCode: '75201',
    },
    sourceSystem: 'nextgen',
    sourceId: 'nextgen-p-002',
    lastUpdated: '2024-12-13T15:30:00Z',
  },
  {
    id: 'nextgen-p-003',
    mrn: 'NXG-11113',
    firstName: 'Maria',
    lastName: 'Garcia',
    middleName: 'Isabel',
    dateOfBirth: '1995-08-11',
    gender: 'female',
    email: 'maria.garcia@email.com',
    phone: '713-555-0789',
    address: {
      city: 'Houston',
      state: 'TX',
      postalCode: '77001',
    },
    sourceSystem: 'nextgen',
    sourceId: 'nextgen-p-003',
    lastUpdated: '2024-12-15T09:00:00Z',
  },
  {
    id: 'nextgen-p-004',
    mrn: 'NXG-11114',
    firstName: 'William',
    lastName: 'Taylor',
    dateOfBirth: '1958-02-28',
    gender: 'male',
    phone: '210-555-1234',
    address: {
      city: 'San Antonio',
      state: 'TX',
      postalCode: '78201',
    },
    sourceSystem: 'nextgen',
    sourceId: 'nextgen-p-004',
    lastUpdated: '2024-12-12T14:00:00Z',
  },
];

const mockEncounters: EhrEncounter[] = [
  {
    id: 'nextgen-e-001',
    patientId: 'nextgen-p-001',
    type: 'Office Visit',
    status: 'finished',
    startTime: '2024-12-14T11:00:00Z',
    endTime: '2024-12-14T11:30:00Z',
    provider: { id: 'prov-nxg-001', name: 'Dr. Sarah Mitchell' },
    facility: { id: 'fac-nxg-001', name: 'Austin Women\'s Health' },
    reason: 'Prenatal checkup',
    sourceSystem: 'nextgen',
    sourceId: 'nextgen-e-001',
    lastUpdated: '2024-12-14T11:30:00Z',
  },
  {
    id: 'nextgen-e-002',
    patientId: 'nextgen-p-002',
    type: 'Office Visit',
    status: 'planned',
    startTime: '2024-12-20T15:00:00Z',
    provider: { id: 'prov-nxg-002', name: 'Dr. Robert Harris' },
    facility: { id: 'fac-nxg-002', name: 'Dallas Cardiology Associates' },
    reason: 'Cardiology consultation',
    sourceSystem: 'nextgen',
    sourceId: 'nextgen-e-002',
    lastUpdated: '2024-12-15T09:00:00Z',
  },
  {
    id: 'nextgen-e-003',
    patientId: 'nextgen-p-003',
    type: 'Urgent Care',
    status: 'finished',
    startTime: '2024-12-13T18:00:00Z',
    endTime: '2024-12-13T18:45:00Z',
    provider: { id: 'prov-nxg-003', name: 'Dr. Lisa Anderson' },
    facility: { id: 'fac-nxg-003', name: 'Houston Urgent Care' },
    reason: 'Acute bronchitis symptoms',
    sourceSystem: 'nextgen',
    sourceId: 'nextgen-e-003',
    lastUpdated: '2024-12-13T18:45:00Z',
  },
  {
    id: 'nextgen-e-004',
    patientId: 'nextgen-p-004',
    type: 'Office Visit',
    status: 'finished',
    startTime: '2024-12-12T10:00:00Z',
    endTime: '2024-12-12T10:45:00Z',
    provider: { id: 'prov-nxg-002', name: 'Dr. Robert Harris' },
    facility: { id: 'fac-nxg-004', name: 'San Antonio Heart Center' },
    reason: 'Cardiac follow-up, post-stent placement',
    sourceSystem: 'nextgen',
    sourceId: 'nextgen-e-004',
    lastUpdated: '2024-12-12T10:45:00Z',
  },
];

const mockObservations: Observation[] = [
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
  {
    resourceType: 'Observation',
    id: 'nextgen-o-002',
    status: 'final',
    category: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/observation-category', code: 'vital-signs' }] }],
    code: { coding: [{ system: 'http://loinc.org', code: '8480-6', display: 'Systolic blood pressure' }] },
    subject: { reference: 'Patient/nextgen-p-002' },
    effectiveDateTime: '2024-12-12T10:15:00Z',
    valueQuantity: { value: 138, unit: 'mmHg', system: 'http://unitsofmeasure.org', code: 'mm[Hg]' },
  },
  {
    resourceType: 'Observation',
    id: 'nextgen-o-003',
    status: 'final',
    category: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/observation-category', code: 'vital-signs' }] }],
    code: { coding: [{ system: 'http://loinc.org', code: '8462-4', display: 'Diastolic blood pressure' }] },
    subject: { reference: 'Patient/nextgen-p-002' },
    effectiveDateTime: '2024-12-12T10:15:00Z',
    valueQuantity: { value: 88, unit: 'mmHg', system: 'http://unitsofmeasure.org', code: 'mm[Hg]' },
  },
  {
    resourceType: 'Observation',
    id: 'nextgen-o-004',
    status: 'final',
    category: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/observation-category', code: 'vital-signs' }] }],
    code: { coding: [{ system: 'http://loinc.org', code: '8310-5', display: 'Body temperature' }] },
    subject: { reference: 'Patient/nextgen-p-003' },
    effectiveDateTime: '2024-12-13T18:10:00Z',
    valueQuantity: { value: 100.4, unit: 'degF', system: 'http://unitsofmeasure.org', code: '[degF]' },
  },
];

const mockConditions: Condition[] = [
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
  {
    resourceType: 'Condition',
    id: 'nextgen-c-002',
    clinicalStatus: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-clinical', code: 'active' }] },
    verificationStatus: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-ver-status', code: 'confirmed' }] },
    category: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-category', code: 'problem-list-item' }] }],
    code: { coding: [{ system: 'http://snomed.info/sct', code: '53741008', display: 'Coronary arteriosclerosis' }], text: 'Coronary artery disease' },
    subject: { reference: 'Patient/nextgen-p-002' },
    onsetDateTime: '2022-08-15',
  },
  {
    resourceType: 'Condition',
    id: 'nextgen-c-003',
    clinicalStatus: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-clinical', code: 'active' }] },
    verificationStatus: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-ver-status', code: 'confirmed' }] },
    category: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-category', code: 'problem-list-item' }] }],
    code: { coding: [{ system: 'http://snomed.info/sct', code: '38341003', display: 'Hypertension' }], text: 'Essential hypertension' },
    subject: { reference: 'Patient/nextgen-p-004' },
    onsetDateTime: '2018-03-10',
  },
];

const mockDiagnosticReports: DiagnosticReport[] = [
  {
    resourceType: 'DiagnosticReport',
    id: 'nextgen-dr-001',
    status: 'final',
    category: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/v2-0074', code: 'RAD' }] }],
    code: { coding: [{ system: 'http://loinc.org', code: '11525-3', display: 'Obstetric ultrasound' }], text: 'Prenatal ultrasound' },
    subject: { reference: 'Patient/nextgen-p-001' },
    effectiveDateTime: '2024-12-14T12:00:00Z',
    issued: '2024-12-14T13:00:00Z',
    conclusion: 'Normal fetal development at 28 weeks',
  },
  {
    resourceType: 'DiagnosticReport',
    id: 'nextgen-dr-002',
    status: 'final',
    category: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/v2-0074', code: 'LAB' }] }],
    code: { coding: [{ system: 'http://loinc.org', code: '2093-3', display: 'Cholesterol total' }], text: 'Lipid Panel' },
    subject: { reference: 'Patient/nextgen-p-002' },
    effectiveDateTime: '2024-12-11T08:00:00Z',
    issued: '2024-12-11T14:00:00Z',
    conclusion: 'Total cholesterol 195 mg/dL, within target range for high-risk patient',
  },
  {
    resourceType: 'DiagnosticReport',
    id: 'nextgen-dr-003',
    status: 'final',
    category: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/v2-0074', code: 'RAD' }] }],
    code: { coding: [{ system: 'http://loinc.org', code: '30746-2', display: 'Chest X-ray' }], text: 'Chest X-ray PA and lateral' },
    subject: { reference: 'Patient/nextgen-p-003' },
    effectiveDateTime: '2024-12-13T18:30:00Z',
    issued: '2024-12-13T19:00:00Z',
    conclusion: 'Mild bronchial wall thickening consistent with acute bronchitis. No pneumonia.',
  },
];

// Simulate API latency
const simulateLatency = () => new Promise(resolve => setTimeout(resolve, Math.random() * 200 + 100));

export class NextGenMockProvider extends BaseEhrProvider {
  private connectionStatus: EhrConnection;
  private lastSyncTime: Date;

  constructor(config: ProviderConfig) {
    super('nextgen', config);
    this.lastSyncTime = new Date(Date.now() - 15 * 60 * 1000); // 15 mins ago
    this.connectionStatus = {
      id: 'nextgen-001',
      system: 'nextgen',
      name: 'NextGen Healthcare',
      status: 'connected',
      lastSync: this.lastSyncTime.toISOString(),
      patientCount: 21456,
      encounterCount: 78234,
      pendingRecords: 0,
      apiVersion: 'v3.1',
      fhirVersion: 'R4',
      capabilities: ['Patient', 'Encounter', 'Observation', 'Condition', 'DiagnosticReport', 'Procedure', 'DocumentReference'],
    };
  }

  async authenticate(): Promise<AuthResult> {
    await simulateLatency();
    return {
      accessToken: `mock-nextgen-token-${uuidv4()}`,
      refreshToken: `mock-nextgen-refresh-${uuidv4()}`,
      expiresAt: new Date(Date.now() + 3600 * 1000),
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

  updateLastSync(): void {
    this.lastSyncTime = new Date();
  }
}

// Register the mock provider
registerProvider('nextgen', (config) => new NextGenMockProvider(config));
