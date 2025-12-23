import { v4 as uuidv4 } from 'uuid';
import type { Observation, Condition, DiagnosticReport } from '@medplum/fhirtypes';
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
} from '../../types/index.js';
import {
  generateCompleteNextGenPatient,
  type NextGenPatient,
  type NextGenEncounter,
  type NextGenProblem,
  type NextGenAllergy,
  type NextGenMedication,
  type NextGenLabOrder,
} from '../../generators/nextgen.generator.js';
import {
  generateCCDADocuments,
  type CCDADocument,
} from '../../generators/ccda.generator.js';
import {
  generateHL7v2Messages,
  type HL7v2Message,
} from '../../generators/hl7v2.generator.js';

// Native format data store - this is what NextGen's REST API would actually return
interface NextGenNativeData {
  patient: NextGenPatient;
  encounters: NextGenEncounter[];
  problems: NextGenProblem[];
  allergies: NextGenAllergy[];
  medications: NextGenMedication[];
  labOrders: NextGenLabOrder[];
}

// Generate initial mock data in native NextGen format
function generateMockData(count: number = 5): NextGenNativeData[] {
  return Array.from({ length: count }, () => {
    const completePatient = generateCompleteNextGenPatient();
    return {
      patient: completePatient.patient,
      encounters: completePatient.encounters,
      problems: completePatient.problems,
      allergies: completePatient.allergies,
      medications: completePatient.medications,
      labOrders: completePatient.labOrders,
    };
  });
}

// Initialize mock data store with native NextGen format
const mockDataStore: NextGenNativeData[] = generateMockData(5);

// C-CDA documents received from NextGen (clinical document exchange)
const mockCcdaDocuments: CCDADocument[] = generateCCDADocuments(3, 'NXG-');

// HL7v2 messages received from NextGen (interface engine)
const mockHl7v2Messages: HL7v2Message[] = generateHL7v2Messages(5, 'NXG-');

// Simulate API latency
const simulateLatency = () => new Promise(resolve => setTimeout(resolve, Math.random() * 200 + 100));

export class NextGenMockProvider extends BaseEhrProvider {
  private connectionStatus: EhrConnection;
  private lastSyncTime: Date;

  constructor(config: ProviderConfig) {
    super('nextgen', config);
    this.lastSyncTime = new Date(Date.now() - 15 * 60 * 1000);
    this.connectionStatus = {
      id: 'nextgen-001',
      system: 'nextgen',
      name: 'NextGen Healthcare',
      status: 'connected',
      lastSync: this.lastSyncTime.toISOString(),
      patientCount: mockDataStore.length,
      encounterCount: mockDataStore.reduce((sum, d) => sum + d.encounters.length, 0),
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

  /**
   * Get all native NextGen patient data for transformation
   * This returns the raw NextGen REST API format that will be transformed to FHIR
   */
  async getNativePatientData(params?: PaginationParams): Promise<PaginatedResponse<NextGenNativeData>> {
    await simulateLatency();
    const limit = params?.limit || 10;
    const offset = params?.offset || 0;
    const paginatedData = mockDataStore.slice(offset, offset + limit);

    return {
      data: paginatedData,
      total: mockDataStore.length,
      limit,
      offset,
      hasMore: offset + limit < mockDataStore.length,
    };
  }

  /**
   * Get native NextGen patients (raw API format)
   */
  async getNativePatients(params?: PaginationParams): Promise<PaginatedResponse<NextGenPatient>> {
    await simulateLatency();
    const limit = params?.limit || 10;
    const offset = params?.offset || 0;
    const patients = mockDataStore.map(d => d.patient);
    const paginatedData = patients.slice(offset, offset + limit);

    return {
      data: paginatedData,
      total: patients.length,
      limit,
      offset,
      hasMore: offset + limit < patients.length,
    };
  }

  /**
   * Get native NextGen encounters (raw API format)
   */
  async getNativeEncounters(params?: PaginationParams): Promise<PaginatedResponse<NextGenEncounter>> {
    await simulateLatency();
    const limit = params?.limit || 10;
    const offset = params?.offset || 0;
    const allEncounters = mockDataStore.flatMap(d => d.encounters);
    const paginatedData = allEncounters.slice(offset, offset + limit);

    return {
      data: paginatedData,
      total: allEncounters.length,
      limit,
      offset,
      hasMore: offset + limit < allEncounters.length,
    };
  }

  /**
   * Get native NextGen problems (raw API format)
   */
  async getNativeProblems(params?: PaginationParams): Promise<PaginatedResponse<NextGenProblem>> {
    await simulateLatency();
    const limit = params?.limit || 10;
    const offset = params?.offset || 0;
    const allProblems = mockDataStore.flatMap(d => d.problems);
    const paginatedData = allProblems.slice(offset, offset + limit);

    return {
      data: paginatedData,
      total: allProblems.length,
      limit,
      offset,
      hasMore: offset + limit < allProblems.length,
    };
  }

  /**
   * Get native NextGen allergies (raw API format)
   */
  async getNativeAllergies(params?: PaginationParams): Promise<PaginatedResponse<NextGenAllergy>> {
    await simulateLatency();
    const limit = params?.limit || 10;
    const offset = params?.offset || 0;
    const allAllergies = mockDataStore.flatMap(d => d.allergies);
    const paginatedData = allAllergies.slice(offset, offset + limit);

    return {
      data: paginatedData,
      total: allAllergies.length,
      limit,
      offset,
      hasMore: offset + limit < allAllergies.length,
    };
  }

  /**
   * Get native NextGen medications (raw API format)
   */
  async getNativeMedications(params?: PaginationParams): Promise<PaginatedResponse<NextGenMedication>> {
    await simulateLatency();
    const limit = params?.limit || 10;
    const offset = params?.offset || 0;
    const allMedications = mockDataStore.flatMap(d => d.medications);
    const paginatedData = allMedications.slice(offset, offset + limit);

    return {
      data: paginatedData,
      total: allMedications.length,
      limit,
      offset,
      hasMore: offset + limit < allMedications.length,
    };
  }

  /**
   * Get native NextGen lab orders (raw API format)
   */
  async getNativeLabOrders(params?: PaginationParams): Promise<PaginatedResponse<NextGenLabOrder>> {
    await simulateLatency();
    const limit = params?.limit || 10;
    const offset = params?.offset || 0;
    const allLabOrders = mockDataStore.flatMap(d => d.labOrders);
    const paginatedData = allLabOrders.slice(offset, offset + limit);

    return {
      data: paginatedData,
      total: allLabOrders.length,
      limit,
      offset,
      hasMore: offset + limit < allLabOrders.length,
    };
  }

  // =============================================
  // C-CDA Document Access (Clinical Document Exchange)
  // These are XML documents exported from NextGen (CCD, Discharge Summary, Progress Notes)
  // =============================================

  /**
   * Get C-CDA documents from NextGen's document exchange
   */
  async getCcdaDocuments(params?: PaginationParams): Promise<PaginatedResponse<CCDADocument>> {
    await simulateLatency();
    const limit = params?.limit || 10;
    const offset = params?.offset || 0;
    const paginatedData = mockCcdaDocuments.slice(offset, offset + limit);

    return {
      data: paginatedData,
      total: mockCcdaDocuments.length,
      limit,
      offset,
      hasMore: offset + limit < mockCcdaDocuments.length,
    };
  }

  // =============================================
  // HL7v2 Message Access (Interface Engine)
  // These are pipe-delimited messages from NextGen (ADT admissions, ORU lab results)
  // =============================================

  /**
   * Get HL7v2 messages from NextGen's interface engine
   */
  async getHl7v2Messages(params?: PaginationParams): Promise<PaginatedResponse<HL7v2Message>> {
    await simulateLatency();
    const limit = params?.limit || 10;
    const offset = params?.offset || 0;
    const paginatedData = mockHl7v2Messages.slice(offset, offset + limit);

    return {
      data: paginatedData,
      total: mockHl7v2Messages.length,
      limit,
      offset,
      hasMore: offset + limit < mockHl7v2Messages.length,
    };
  }

  // =============================================
  // Abstract method implementations (required by BaseEhrProvider)
  // These convert native data to normalized EhrPatient/EhrEncounter format
  // =============================================

  async getPatients(params?: PaginationParams): Promise<PaginatedResponse<EhrPatient>> {
    const nativeResult = await this.getNativePatients(params);
    return {
      ...nativeResult,
      data: nativeResult.data.map(this.convertToEhrPatient),
    };
  }

  async getPatient(id: string): Promise<EhrPatient | null> {
    const patient = mockDataStore.find(d => d.patient.person_id === id)?.patient;
    return patient ? this.convertToEhrPatient(patient) : null;
  }

  async getEncounters(params?: PaginationParams): Promise<PaginatedResponse<EhrEncounter>> {
    const nativeResult = await this.getNativeEncounters(params);
    return {
      ...nativeResult,
      data: nativeResult.data.map(this.convertToEhrEncounter),
    };
  }

  async getEncounter(id: string): Promise<EhrEncounter | null> {
    const encounter = mockDataStore.flatMap(d => d.encounters).find(e => e.encounter_id === id);
    return encounter ? this.convertToEhrEncounter(encounter) : null;
  }

  async getEncountersByPatient(patientId: string, params?: PaginationParams): Promise<PaginatedResponse<EhrEncounter>> {
    await simulateLatency();
    const patientEncounters = mockDataStore
      .flatMap(d => d.encounters)
      .filter(e => e.person_id === patientId);
    const limit = params?.limit || 10;
    const offset = params?.offset || 0;
    const paginatedData = patientEncounters.slice(offset, offset + limit);

    return {
      data: paginatedData.map(this.convertToEhrEncounter),
      total: patientEncounters.length,
      limit,
      offset,
      hasMore: offset + limit < patientEncounters.length,
    };
  }

  async getObservations(_patientId: string, params?: PaginationParams): Promise<PaginatedResponse<Observation>> {
    await simulateLatency();
    return { data: [], total: 0, limit: params?.limit || 10, offset: params?.offset || 0, hasMore: false };
  }

  async getConditions(_patientId: string, params?: PaginationParams): Promise<PaginatedResponse<Condition>> {
    await simulateLatency();
    return { data: [], total: 0, limit: params?.limit || 10, offset: params?.offset || 0, hasMore: false };
  }

  async getDiagnosticReports(_patientId: string, params?: PaginationParams): Promise<PaginatedResponse<DiagnosticReport>> {
    await simulateLatency();
    return { data: [], total: 0, limit: params?.limit || 10, offset: params?.offset || 0, hasMore: false };
  }

  // Helper: Convert native NextGen patient to normalized EhrPatient
  private convertToEhrPatient(nextgenPatient: NextGenPatient): EhrPatient {
    return {
      id: `nextgen-p-${nextgenPatient.person_id}`,
      mrn: nextgenPatient.mrn || `NXG-${nextgenPatient.person_id.slice(0, 8)}`,
      firstName: nextgenPatient.first_name,
      lastName: nextgenPatient.last_name,
      middleName: nextgenPatient.middle_name,
      dateOfBirth: nextgenPatient.date_of_birth,
      gender: nextgenPatient.gender === 'M' ? 'male' : nextgenPatient.gender === 'F' ? 'female' : nextgenPatient.gender === 'O' ? 'other' : 'unknown',
      email: nextgenPatient.email_address,
      phone: nextgenPatient.home_phone || nextgenPatient.mobile_phone,
      address: nextgenPatient.address ? {
        street: nextgenPatient.address.address_line_1,
        city: nextgenPatient.address.city,
        state: nextgenPatient.address.state_code,
        postalCode: nextgenPatient.address.postal_code,
        country: nextgenPatient.address.country_code || 'USA',
      } : undefined,
      sourceSystem: 'nextgen',
      sourceId: nextgenPatient.person_id,
      lastUpdated: nextgenPatient.modified_timestamp,
    };
  }

  // Helper: Convert native NextGen encounter to normalized EhrEncounter
  private convertToEhrEncounter(nextgenEncounter: NextGenEncounter): EhrEncounter {
    const statusMap: Record<string, 'planned' | 'arrived' | 'in-progress' | 'finished' | 'cancelled'> = {
      'Open': 'in-progress',
      'Closed': 'finished',
      'Billed': 'finished',
      'Void': 'cancelled',
    };

    return {
      id: `nextgen-e-${nextgenEncounter.encounter_id}`,
      patientId: `nextgen-p-${nextgenEncounter.person_id}`,
      type: nextgenEncounter.encounter_type,
      status: statusMap[nextgenEncounter.encounter_status] || 'in-progress',
      startTime: nextgenEncounter.encounter_date,
      endTime: nextgenEncounter.signed_date,
      provider: nextgenEncounter.rendering_provider_id ? {
        id: nextgenEncounter.rendering_provider_id,
        name: nextgenEncounter.signed_by || 'Provider',
      } : undefined,
      reason: nextgenEncounter.chief_complaint,
      sourceSystem: 'nextgen',
      sourceId: nextgenEncounter.encounter_id,
      lastUpdated: nextgenEncounter.modified_timestamp,
    };
  }

  updateLastSync(): void {
    this.lastSyncTime = new Date();
  }

  regenerateMockData(count: number = 5): void {
    mockDataStore.length = 0;
    mockDataStore.push(...generateMockData(count));
  }
}

// Register the mock provider
registerProvider('nextgen', (config) => new NextGenMockProvider(config));
