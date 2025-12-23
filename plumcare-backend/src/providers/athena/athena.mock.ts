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
  generateCompleteAthenaPatient,
  type AthenaPatient,
  type AthenaEncounter,
  type AthenaProblem,
  type AthenaAllergy,
  type AthenaMedication,
  type AthenaVitals,
  type AthenaLabResult,
} from '../../generators/athena.generator.js';
import {
  generateCCDADocuments,
  type CCDADocument,
} from '../../generators/ccda.generator.js';
import {
  generateHL7v2Messages,
  type HL7v2Message,
} from '../../generators/hl7v2.generator.js';

// Native format data store - this is what Athena's REST API would actually return
interface AthenaNativeData {
  patient: AthenaPatient;
  encounters: AthenaEncounter[];
  problems: AthenaProblem[];
  allergies: AthenaAllergy[];
  medications: AthenaMedication[];
  vitals: AthenaVitals[];
  labResults: AthenaLabResult[];
}

// Generate initial mock data in native Athena format
function generateMockData(count: number = 5): AthenaNativeData[] {
  return Array.from({ length: count }, () => {
    const completePatient = generateCompleteAthenaPatient();
    return {
      patient: completePatient.patient,
      encounters: completePatient.encounters,
      problems: completePatient.problems,
      allergies: completePatient.allergies,
      medications: completePatient.medications,
      vitals: completePatient.vitals,
      labResults: completePatient.labResults,
    };
  });
}

// Initialize mock data store with native Athena format
const mockDataStore: AthenaNativeData[] = generateMockData(5);

// C-CDA documents received from Athena (clinical document exchange)
const mockCcdaDocuments: CCDADocument[] = generateCCDADocuments(3, 'ATH-');

// HL7v2 messages received from Athena (interface engine)
const mockHl7v2Messages: HL7v2Message[] = generateHL7v2Messages(5, 'ATH-');

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
      patientCount: mockDataStore.length,
      encounterCount: mockDataStore.reduce((sum, d) => sum + d.encounters.length, 0),
      pendingRecords: 0,
      apiVersion: 'v1',
      fhirVersion: 'R4',
      capabilities: ['Patient', 'Encounter', 'Observation', 'Condition', 'DiagnosticReport', 'AllergyIntolerance', 'MedicationRequest'],
    };
  }

  async authenticate(): Promise<AuthResult> {
    await simulateLatency();
    return {
      accessToken: `mock-athena-token-${uuidv4()}`,
      refreshToken: `mock-athena-refresh-${uuidv4()}`,
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
   * Get all native Athena patient data for transformation
   * This returns the raw Athena REST API format that will be transformed to FHIR
   */
  async getNativePatientData(params?: PaginationParams): Promise<PaginatedResponse<AthenaNativeData>> {
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
   * Get native Athena patients (raw API format)
   */
  async getNativePatients(params?: PaginationParams): Promise<PaginatedResponse<AthenaPatient>> {
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
   * Get native Athena encounters (raw API format)
   */
  async getNativeEncounters(params?: PaginationParams): Promise<PaginatedResponse<AthenaEncounter>> {
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
   * Get native Athena problems (raw API format)
   */
  async getNativeProblems(params?: PaginationParams): Promise<PaginatedResponse<AthenaProblem>> {
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
   * Get native Athena allergies (raw API format)
   */
  async getNativeAllergies(params?: PaginationParams): Promise<PaginatedResponse<AthenaAllergy>> {
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
   * Get native Athena medications (raw API format)
   */
  async getNativeMedications(params?: PaginationParams): Promise<PaginatedResponse<AthenaMedication>> {
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
   * Get native Athena vitals (raw API format)
   */
  async getNativeVitals(params?: PaginationParams): Promise<PaginatedResponse<AthenaVitals>> {
    await simulateLatency();
    const limit = params?.limit || 10;
    const offset = params?.offset || 0;
    const allVitals = mockDataStore.flatMap(d => d.vitals);
    const paginatedData = allVitals.slice(offset, offset + limit);

    return {
      data: paginatedData,
      total: allVitals.length,
      limit,
      offset,
      hasMore: offset + limit < allVitals.length,
    };
  }

  /**
   * Get native Athena lab results (raw API format)
   */
  async getNativeLabResults(params?: PaginationParams): Promise<PaginatedResponse<AthenaLabResult>> {
    await simulateLatency();
    const limit = params?.limit || 10;
    const offset = params?.offset || 0;
    const allLabResults = mockDataStore.flatMap(d => d.labResults);
    const paginatedData = allLabResults.slice(offset, offset + limit);

    return {
      data: paginatedData,
      total: allLabResults.length,
      limit,
      offset,
      hasMore: offset + limit < allLabResults.length,
    };
  }

  // =============================================
  // C-CDA Document Access (Clinical Document Exchange)
  // These are XML documents exported from Athena (CCD, Discharge Summary, Progress Notes)
  // =============================================

  /**
   * Get C-CDA documents from Athena's document exchange
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
  // These are pipe-delimited messages from Athena (ADT admissions, ORU lab results)
  // =============================================

  /**
   * Get HL7v2 messages from Athena's interface engine
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
    const patient = mockDataStore.find(d => d.patient.patientid === id)?.patient;
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
    const encounter = mockDataStore.flatMap(d => d.encounters).find(e => e.encounterid === id);
    return encounter ? this.convertToEhrEncounter(encounter) : null;
  }

  async getEncountersByPatient(patientId: string, params?: PaginationParams): Promise<PaginatedResponse<EhrEncounter>> {
    await simulateLatency();
    const patientEncounters = mockDataStore
      .flatMap(d => d.encounters)
      .filter(e => e.patientid === patientId);
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

  async getObservations(patientId: string, params?: PaginationParams): Promise<PaginatedResponse<Observation>> {
    await simulateLatency();
    // Return empty for now - observations come through vitals in native format
    return { data: [], total: 0, limit: params?.limit || 10, offset: params?.offset || 0, hasMore: false };
  }

  async getConditions(patientId: string, params?: PaginationParams): Promise<PaginatedResponse<Condition>> {
    await simulateLatency();
    // Return empty for now - conditions come through problems in native format
    return { data: [], total: 0, limit: params?.limit || 10, offset: params?.offset || 0, hasMore: false };
  }

  async getDiagnosticReports(patientId: string, params?: PaginationParams): Promise<PaginatedResponse<DiagnosticReport>> {
    await simulateLatency();
    // Return empty for now - reports come through labResults in native format
    return { data: [], total: 0, limit: params?.limit || 10, offset: params?.offset || 0, hasMore: false };
  }

  // Helper: Convert native Athena patient to normalized EhrPatient
  private convertToEhrPatient(athenaPatient: AthenaPatient): EhrPatient {
    return {
      id: `athena-p-${athenaPatient.patientid}`,
      mrn: `ATH-${athenaPatient.patientid}`,
      firstName: athenaPatient.firstname,
      lastName: athenaPatient.lastname,
      middleName: athenaPatient.middlename,
      dateOfBirth: athenaPatient.dob,
      gender: athenaPatient.sex === 'M' ? 'male' : athenaPatient.sex === 'F' ? 'female' : athenaPatient.sex === 'O' ? 'other' : 'unknown',
      email: athenaPatient.email,
      phone: athenaPatient.homephone || athenaPatient.mobilephone,
      address: athenaPatient.address1 ? {
        street: athenaPatient.address1,
        city: athenaPatient.city,
        state: athenaPatient.state,
        postalCode: athenaPatient.zip,
        country: athenaPatient.countrycode || 'USA',
      } : undefined,
      sourceSystem: 'athena',
      sourceId: athenaPatient.patientid,
      lastUpdated: new Date().toISOString(),
    };
  }

  // Helper: Convert native Athena encounter to normalized EhrEncounter
  private convertToEhrEncounter(athenaEncounter: AthenaEncounter): EhrEncounter {
    return {
      id: `athena-e-${athenaEncounter.encounterid}`,
      patientId: `athena-p-${athenaEncounter.patientid}`,
      type: athenaEncounter.encountertype,
      status: athenaEncounter.encounterstatus === 'CLOSED' ? 'finished' : athenaEncounter.encounterstatus === 'OPEN' ? 'in-progress' : 'planned',
      startTime: athenaEncounter.encounterdate,
      endTime: athenaEncounter.closeddatetime,
      provider: {
        id: athenaEncounter.providerid,
        name: `${athenaEncounter.providerfirstname} ${athenaEncounter.providerlastname}`,
      },
      reason: athenaEncounter.diagnoses?.[0]?.description,
      sourceSystem: 'athena',
      sourceId: athenaEncounter.encounterid,
      lastUpdated: new Date().toISOString(),
    };
  }

  // Update last sync time (called after sync operations)
  updateLastSync(): void {
    this.lastSyncTime = new Date();
  }

  // Regenerate mock data (useful for testing/demo)
  regenerateMockData(count: number = 5): void {
    mockDataStore.length = 0;
    mockDataStore.push(...generateMockData(count));
  }
}

// Register the mock provider
registerProvider('athena', (config) => new AthenaMockProvider(config));
