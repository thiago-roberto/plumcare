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
  generateCompleteElationPatient,
  type ElationPatient,
  type ElationVisitNote,
  type ElationProblem,
  type ElationAllergy,
  type ElationMedication,
  type ElationLabOrder,
} from '../../generators/elation.generator.js';
import {
  generateCCDADocuments,
  type CCDADocument,
} from '../../generators/ccda.generator.js';
import {
  generateHL7v2Messages,
  type HL7v2Message,
} from '../../generators/hl7v2.generator.js';

// Native format data store - this is what Elation's REST API would actually return
interface ElationNativeData {
  patient: ElationPatient;
  visitNotes: ElationVisitNote[];
  problems: ElationProblem[];
  allergies: ElationAllergy[];
  medications: ElationMedication[];
  labOrders: ElationLabOrder[];
}

// Generate initial mock data in native Elation format
function generateMockData(count: number = 5): ElationNativeData[] {
  return Array.from({ length: count }, () => {
    const completePatient = generateCompleteElationPatient();
    return {
      patient: completePatient.patient,
      visitNotes: completePatient.visitNotes,
      problems: completePatient.problems,
      allergies: completePatient.allergies,
      medications: completePatient.medications,
      labOrders: completePatient.labOrders,
    };
  });
}

// Initialize mock data store with native Elation format
const mockDataStore: ElationNativeData[] = generateMockData(5);

// C-CDA documents received from Elation (clinical document exchange)
const mockCcdaDocuments: CCDADocument[] = generateCCDADocuments(3, 'ELA-');

// HL7v2 messages received from Elation (interface engine)
const mockHl7v2Messages: HL7v2Message[] = generateHL7v2Messages(5, 'ELA-');

// Simulate API latency
const simulateLatency = () => new Promise(resolve => setTimeout(resolve, Math.random() * 200 + 100));

export class ElationMockProvider extends BaseEhrProvider {
  private connectionStatus: EhrConnection;
  private lastSyncTime: Date;

  constructor(config: ProviderConfig) {
    super('elation', config);
    this.lastSyncTime = new Date(Date.now() - 2 * 60 * 1000);
    this.connectionStatus = {
      id: 'elation-001',
      system: 'elation',
      name: 'Elation Health',
      status: 'connected',
      lastSync: this.lastSyncTime.toISOString(),
      patientCount: mockDataStore.length,
      encounterCount: mockDataStore.reduce((sum, d) => sum + d.visitNotes.length, 0),
      pendingRecords: 0,
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
      patientCount: mockDataStore.length,
      encounterCount: mockDataStore.reduce((sum, d) => sum + d.visitNotes.length, 0),
    };
  }

  /**
   * Get all native Elation patient data for transformation
   * This returns the raw Elation REST API format that will be transformed to FHIR
   */
  async getNativePatientData(params?: PaginationParams): Promise<PaginatedResponse<ElationNativeData>> {
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
   * Get native Elation patients (raw API format)
   */
  async getNativePatients(params?: PaginationParams): Promise<PaginatedResponse<ElationPatient>> {
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
   * Get native Elation visit notes (raw API format)
   */
  async getNativeVisitNotes(params?: PaginationParams): Promise<PaginatedResponse<ElationVisitNote>> {
    await simulateLatency();
    const limit = params?.limit || 10;
    const offset = params?.offset || 0;
    const allVisitNotes = mockDataStore.flatMap(d => d.visitNotes);
    const paginatedData = allVisitNotes.slice(offset, offset + limit);

    return {
      data: paginatedData,
      total: allVisitNotes.length,
      limit,
      offset,
      hasMore: offset + limit < allVisitNotes.length,
    };
  }

  /**
   * Get native Elation problems (raw API format)
   */
  async getNativeProblems(params?: PaginationParams): Promise<PaginatedResponse<ElationProblem>> {
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
   * Get native Elation allergies (raw API format)
   */
  async getNativeAllergies(params?: PaginationParams): Promise<PaginatedResponse<ElationAllergy>> {
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
   * Get native Elation medications (raw API format)
   */
  async getNativeMedications(params?: PaginationParams): Promise<PaginatedResponse<ElationMedication>> {
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
   * Get native Elation lab orders (raw API format)
   */
  async getNativeLabOrders(params?: PaginationParams): Promise<PaginatedResponse<ElationLabOrder>> {
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
  // These are XML documents exported from Elation (CCD, Discharge Summary, Progress Notes)
  // =============================================

  /**
   * Get C-CDA documents from Elation's document exchange
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
  // These are pipe-delimited messages from Elation (ADT admissions, ORU lab results)
  // =============================================

  /**
   * Get HL7v2 messages from Elation's interface engine
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
    const patient = mockDataStore.find(d => d.patient.id.toString() === id)?.patient;
    return patient ? this.convertToEhrPatient(patient) : null;
  }

  async getEncounters(params?: PaginationParams): Promise<PaginatedResponse<EhrEncounter>> {
    const nativeResult = await this.getNativeVisitNotes(params);
    return {
      ...nativeResult,
      data: nativeResult.data.map(this.convertToEhrEncounter),
    };
  }

  async getEncounter(id: string): Promise<EhrEncounter | null> {
    const visitNote = mockDataStore.flatMap(d => d.visitNotes).find(v => v.id.toString() === id);
    return visitNote ? this.convertToEhrEncounter(visitNote) : null;
  }

  async getEncountersByPatient(patientId: string, params?: PaginationParams): Promise<PaginatedResponse<EhrEncounter>> {
    await simulateLatency();
    const patientVisitNotes = mockDataStore
      .flatMap(d => d.visitNotes)
      .filter(v => v.patient.toString() === patientId);
    const limit = params?.limit || 10;
    const offset = params?.offset || 0;
    const paginatedData = patientVisitNotes.slice(offset, offset + limit);

    return {
      data: paginatedData.map(this.convertToEhrEncounter),
      total: patientVisitNotes.length,
      limit,
      offset,
      hasMore: offset + limit < patientVisitNotes.length,
    };
  }

  async getObservations(patientId: string, params?: PaginationParams): Promise<PaginatedResponse<Observation>> {
    await simulateLatency();
    const limit = params?.limit || 10;
    const offset = params?.offset || 0;

    // Get vitals from visit notes for this patient and convert to FHIR Observations
    const patientIdNum = patientId.replace('elation-p-', '');
    const patientVisitNotes = mockDataStore
      .filter(d => d.patient.id.toString() === patientIdNum)
      .flatMap(d => d.visitNotes)
      .filter(v => v.vitals);

    const observations: Observation[] = patientVisitNotes.flatMap(visitNote =>
      this.convertVitalsToObservations(visitNote.vitals!, patientId, visitNote)
    );

    const paginatedData = observations.slice(offset, offset + limit);
    return {
      data: paginatedData,
      total: observations.length,
      limit,
      offset,
      hasMore: offset + limit < observations.length,
    };
  }

  async getConditions(patientId: string, params?: PaginationParams): Promise<PaginatedResponse<Condition>> {
    await simulateLatency();
    const limit = params?.limit || 10;
    const offset = params?.offset || 0;

    // Get problems for this patient and convert to FHIR Conditions
    const patientIdNum = patientId.replace('elation-p-', '');
    const patientProblems = mockDataStore
      .filter(d => d.patient.id.toString() === patientIdNum)
      .flatMap(d => d.problems);

    const conditions: Condition[] = patientProblems.map(problem =>
      this.convertProblemToCondition(problem, patientId)
    );

    const paginatedData = conditions.slice(offset, offset + limit);
    return {
      data: paginatedData,
      total: conditions.length,
      limit,
      offset,
      hasMore: offset + limit < conditions.length,
    };
  }

  async getDiagnosticReports(_patientId: string, params?: PaginationParams): Promise<PaginatedResponse<DiagnosticReport>> {
    await simulateLatency();
    return { data: [], total: 0, limit: params?.limit || 10, offset: params?.offset || 0, hasMore: false };
  }

  // Helper: Convert Elation vitals to FHIR Observations
  private convertVitalsToObservations(
    vitals: ElationVisitNote['vitals'],
    patientId: string,
    visitNote: ElationVisitNote
  ): Observation[] {
    if (!vitals) return [];

    const observations: Observation[] = [];
    const vitalCodeMap: Record<string, { code: string; display: string }> = {
      'blood_pressure_systolic': { code: '8480-6', display: 'Systolic blood pressure' },
      'blood_pressure_diastolic': { code: '8462-4', display: 'Diastolic blood pressure' },
      'heart_rate': { code: '8867-4', display: 'Heart rate' },
      'respiratory_rate': { code: '9279-1', display: 'Respiratory rate' },
      'temperature': { code: '8310-5', display: 'Body temperature' },
      'oxygen_saturation': { code: '2708-6', display: 'Oxygen saturation' },
      'weight': { code: '29463-7', display: 'Body weight' },
      'height': { code: '8302-2', display: 'Body height' },
      'bmi': { code: '39156-5', display: 'BMI' },
    };

    const unitMap: Record<string, string> = {
      'blood_pressure_systolic': 'mmHg',
      'blood_pressure_diastolic': 'mmHg',
      'heart_rate': '/min',
      'respiratory_rate': '/min',
      'temperature': vitals.temperature_unit === 'C' ? 'Cel' : '[degF]',
      'oxygen_saturation': '%',
      'weight': vitals.weight_unit === 'kg' ? 'kg' : '[lb_av]',
      'height': vitals.height_unit === 'cm' ? 'cm' : '[in_i]',
      'bmi': 'kg/m2',
    };

    for (const [key, codeInfo] of Object.entries(vitalCodeMap)) {
      const value = vitals[key as keyof typeof vitals];
      if (value !== undefined && typeof value === 'number') {
        observations.push({
          resourceType: 'Observation',
          identifier: [{
            system: 'http://plumcare.io/elation/observation',
            value: `${visitNote.id}-${key}`,
          }],
          status: 'final',
          category: [{
            coding: [{
              system: 'http://terminology.hl7.org/CodeSystem/observation-category',
              code: 'vital-signs',
              display: 'Vital Signs',
            }],
          }],
          code: {
            coding: [{
              system: 'http://loinc.org',
              code: codeInfo.code,
              display: codeInfo.display,
            }],
            text: codeInfo.display,
          },
          subject: { reference: `Patient/${patientId}` },
          effectiveDateTime: visitNote.document_date,
          valueQuantity: {
            value,
            unit: unitMap[key],
            system: 'http://unitsofmeasure.org',
          },
          meta: {
            tag: [{
              system: 'http://plumcare.io/ehr-source',
              code: 'elation',
              display: 'Elation Health',
            }],
          },
        });
      }
    }

    return observations;
  }

  // Helper: Convert Elation problem to FHIR Condition
  private convertProblemToCondition(problem: ElationProblem, patientId: string): Condition {
    const statusMap: Record<string, Condition['clinicalStatus']> = {
      'Active': { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-clinical', code: 'active' }] },
      'Resolved': { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-clinical', code: 'resolved' }] },
      'Inactive': { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-clinical', code: 'inactive' }] },
    };

    return {
      resourceType: 'Condition',
      identifier: [{
        system: 'http://plumcare.io/elation/condition',
        value: problem.id.toString(),
      }],
      clinicalStatus: statusMap[problem.status] || statusMap['Active'],
      code: {
        coding: [{
          system: 'http://hl7.org/fhir/sid/icd-10-cm',
          code: problem.icd10_code,
          display: problem.description,
        }],
        text: problem.description,
      },
      subject: {
        reference: `Patient/${patientId}`,
      },
      onsetDateTime: problem.onset_date,
      abatementDateTime: problem.resolved_date,
      recordedDate: problem.created_date,
      note: problem.notes ? [{ text: problem.notes }] : undefined,
      meta: {
        tag: [{
          system: 'http://plumcare.io/ehr-source',
          code: 'elation',
          display: 'Elation Health',
        }],
      },
    };
  }

  // Helper: Convert native Elation patient to normalized EhrPatient
  private convertToEhrPatient(elationPatient: ElationPatient): EhrPatient {
    const primaryPhone = elationPatient.phones.find(p => p.is_primary)?.phone || elationPatient.phones[0]?.phone;
    const primaryEmail = elationPatient.emails.find(e => e.is_primary)?.email || elationPatient.emails[0]?.email;

    return {
      id: `elation-p-${elationPatient.id}`,
      mrn: elationPatient.mrn || `ELA-${elationPatient.id}`,
      firstName: elationPatient.first_name,
      lastName: elationPatient.last_name,
      middleName: elationPatient.middle_name,
      dateOfBirth: elationPatient.dob,
      gender: elationPatient.sex === 'Male' ? 'male' : elationPatient.sex === 'Female' ? 'female' : elationPatient.sex === 'Other' ? 'other' : 'unknown',
      email: primaryEmail,
      phone: primaryPhone,
      address: elationPatient.address ? {
        street: elationPatient.address.address_line1,
        city: elationPatient.address.city,
        state: elationPatient.address.state,
        postalCode: elationPatient.address.zip,
        country: elationPatient.address.country,
      } : undefined,
      sourceSystem: 'elation',
      sourceId: elationPatient.id.toString(),
      lastUpdated: elationPatient.last_modified_date,
    };
  }

  // Helper: Convert native Elation visit note to normalized EhrEncounter
  private convertToEhrEncounter(visitNote: ElationVisitNote): EhrEncounter {
    return {
      id: `elation-e-${visitNote.id}`,
      patientId: `elation-p-${visitNote.patient}`,
      type: visitNote.visit_type,
      status: visitNote.signed ? 'finished' : 'in-progress',
      startTime: visitNote.document_date,
      reason: visitNote.chief_complaint,
      sourceSystem: 'elation',
      sourceId: visitNote.id.toString(),
      lastUpdated: visitNote.last_modified_date,
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
registerProvider('elation', (config) => new ElationMockProvider(config));
