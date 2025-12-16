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
    id: 'elation-p-001',
    mrn: 'ELA-67890',
    firstName: 'Elena',
    lastName: 'Martinez',
    middleName: 'Maria',
    dateOfBirth: '1990-01-28',
    gender: 'female',
    email: 'elena.martinez@email.com',
    phone: '415-555-0123',
    address: {
      street: '100 Market Street',
      city: 'San Francisco',
      state: 'CA',
      postalCode: '94102',
      country: 'USA',
    },
    sourceSystem: 'elation',
    sourceId: 'elation-p-001',
    lastUpdated: '2024-12-15T14:00:00Z',
  },
  {
    id: 'elation-p-002',
    mrn: 'ELA-67891',
    firstName: 'David',
    lastName: 'Chen',
    middleName: 'Wei',
    dateOfBirth: '1975-09-14',
    gender: 'male',
    email: 'david.chen@email.com',
    phone: '510-555-0456',
    address: {
      street: '200 Broadway',
      city: 'Oakland',
      state: 'CA',
      postalCode: '94612',
    },
    sourceSystem: 'elation',
    sourceId: 'elation-p-002',
    lastUpdated: '2024-12-14T10:30:00Z',
  },
  {
    id: 'elation-p-003',
    mrn: 'ELA-67892',
    firstName: 'Lisa',
    lastName: 'Wong',
    dateOfBirth: '1982-06-05',
    gender: 'female',
    phone: '415-555-0789',
    address: {
      city: 'San Jose',
      state: 'CA',
      postalCode: '95110',
    },
    sourceSystem: 'elation',
    sourceId: 'elation-p-003',
    lastUpdated: '2024-12-13T09:15:00Z',
  },
];

const mockEncounters: EhrEncounter[] = [
  {
    id: 'elation-e-001',
    patientId: 'elation-p-001',
    type: 'Office Visit',
    status: 'finished',
    startTime: '2024-12-15T14:00:00Z',
    endTime: '2024-12-15T14:45:00Z',
    provider: { id: 'prov-ela-001', name: 'Dr. Jennifer Kim' },
    facility: { id: 'fac-ela-001', name: 'Bay Area Family Practice' },
    reason: 'Diabetes management',
    sourceSystem: 'elation',
    sourceId: 'elation-e-001',
    lastUpdated: '2024-12-15T14:45:00Z',
  },
  {
    id: 'elation-e-002',
    patientId: 'elation-p-002',
    type: 'Telehealth',
    status: 'finished',
    startTime: '2024-12-14T10:00:00Z',
    endTime: '2024-12-14T10:20:00Z',
    provider: { id: 'prov-ela-002', name: 'Dr. Michael Brown' },
    reason: 'Follow-up consultation',
    sourceSystem: 'elation',
    sourceId: 'elation-e-002',
    lastUpdated: '2024-12-14T10:20:00Z',
  },
  {
    id: 'elation-e-003',
    patientId: 'elation-p-001',
    type: 'Lab Visit',
    status: 'finished',
    startTime: '2024-12-10T08:30:00Z',
    endTime: '2024-12-10T08:45:00Z',
    facility: { id: 'fac-ela-002', name: 'LabCorp San Francisco' },
    reason: 'HbA1c and lipid panel',
    sourceSystem: 'elation',
    sourceId: 'elation-e-003',
    lastUpdated: '2024-12-10T08:45:00Z',
  },
];

const mockObservations: Observation[] = [
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
  {
    resourceType: 'Observation',
    id: 'elation-o-002',
    status: 'final',
    category: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/observation-category', code: 'vital-signs' }] }],
    code: { coding: [{ system: 'http://loinc.org', code: '29463-7', display: 'Body weight' }] },
    subject: { reference: 'Patient/elation-p-001' },
    effectiveDateTime: '2024-12-15T14:10:00Z',
    valueQuantity: { value: 68, unit: 'kg', system: 'http://unitsofmeasure.org', code: 'kg' },
  },
  {
    resourceType: 'Observation',
    id: 'elation-o-003',
    status: 'final',
    category: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/observation-category', code: 'vital-signs' }] }],
    code: { coding: [{ system: 'http://loinc.org', code: '8867-4', display: 'Heart rate' }] },
    subject: { reference: 'Patient/elation-p-001' },
    effectiveDateTime: '2024-12-15T14:10:00Z',
    valueQuantity: { value: 76, unit: 'beats/minute', system: 'http://unitsofmeasure.org', code: '/min' },
  },
];

const mockConditions: Condition[] = [
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
  {
    resourceType: 'Condition',
    id: 'elation-c-002',
    clinicalStatus: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-clinical', code: 'active' }] },
    verificationStatus: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-ver-status', code: 'confirmed' }] },
    category: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-category', code: 'problem-list-item' }] }],
    code: { coding: [{ system: 'http://snomed.info/sct', code: '266569009', display: 'Seasonal allergic rhinitis' }], text: 'Seasonal allergies' },
    subject: { reference: 'Patient/elation-p-002' },
    onsetDateTime: '2015-04-01',
  },
];

const mockDiagnosticReports: DiagnosticReport[] = [
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
  {
    resourceType: 'DiagnosticReport',
    id: 'elation-dr-002',
    status: 'final',
    category: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/v2-0074', code: 'LAB' }] }],
    code: { coding: [{ system: 'http://loinc.org', code: '57698-3', display: 'Lipid panel' }], text: 'Lipid Panel' },
    subject: { reference: 'Patient/elation-p-001' },
    effectiveDateTime: '2024-12-10T09:00:00Z',
    issued: '2024-12-10T14:00:00Z',
    conclusion: 'LDL cholesterol mildly elevated at 142 mg/dL',
  },
];

// Simulate API latency
const simulateLatency = () => new Promise(resolve => setTimeout(resolve, Math.random() * 200 + 100));

export class ElationMockProvider extends BaseEhrProvider {
  private connectionStatus: EhrConnection;
  private lastSyncTime: Date;

  constructor(config: ProviderConfig) {
    super('elation', config);
    this.lastSyncTime = new Date(Date.now() - 2 * 60 * 1000); // 2 mins ago
    this.connectionStatus = {
      id: 'elation-001',
      system: 'elation',
      name: 'Elation Health',
      status: 'syncing',
      lastSync: this.lastSyncTime.toISOString(),
      patientCount: 8234,
      encounterCount: 29876,
      pendingRecords: 156,
      apiVersion: 'v2',
      fhirVersion: 'R4',
      capabilities: ['Patient', 'Encounter', 'Observation', 'Condition', 'CarePlan', 'Immunization'],
    };
  }

  async authenticate(): Promise<AuthResult> {
    await simulateLatency();
    return {
      accessToken: `mock-elation-token-${uuidv4()}`,
      refreshToken: `mock-elation-refresh-${uuidv4()}`,
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
registerProvider('elation', (config) => new ElationMockProvider(config));
