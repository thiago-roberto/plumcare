import {
  BaseEhrProvider,
  type AuthResult,
  type ProviderConfig,
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

/**
 * Real Elation Health API Provider
 *
 * This provider implements the actual Elation Health API integration.
 * To use this provider, you need:
 * 1. Elation Developer Account: https://www.elationhealth.com/api/
 * 2. API credentials (Client ID & Secret)
 *
 * API Documentation: https://docs.elationhealth.com/reference
 *
 * OAuth Flow:
 * - Elation uses OAuth 2.0
 * - Token endpoint: POST /oauth2/token
 * - Base URL (Sandbox): https://sandbox.elationemr.com/api/2.0
 * - Base URL (Production): https://app.elationemr.com/api/2.0
 */
export class ElationProvider extends BaseEhrProvider {
  constructor(config: ProviderConfig) {
    super('elation', config);
  }

  async authenticate(): Promise<AuthResult> {
    // TODO: Implement real OAuth flow
    // POST https://sandbox.elationemr.com/oauth2/token
    // Body: grant_type=client_credentials
    throw new Error('Real Elation authentication not implemented. Set USE_MOCKS=true or implement OAuth flow.');
  }

  async refreshToken(_refreshToken: string): Promise<AuthResult> {
    return this.authenticate();
  }

  async getConnectionStatus(): Promise<EhrConnection> {
    throw new Error('Not implemented');
  }

  async getPatients(_params?: PaginationParams): Promise<PaginatedResponse<EhrPatient>> {
    // TODO: GET /patients
    throw new Error('Not implemented');
  }

  async getPatient(_id: string): Promise<EhrPatient | null> {
    // TODO: GET /patients/{id}
    throw new Error('Not implemented');
  }

  async getEncounters(_params?: PaginationParams): Promise<PaginatedResponse<EhrEncounter>> {
    // TODO: GET /appointments
    throw new Error('Not implemented');
  }

  async getEncounter(_id: string): Promise<EhrEncounter | null> {
    // TODO: GET /appointments/{id}
    throw new Error('Not implemented');
  }

  async getEncountersByPatient(_patientId: string, _params?: PaginationParams): Promise<PaginatedResponse<EhrEncounter>> {
    // TODO: GET /patients/{id}/appointments
    throw new Error('Not implemented');
  }

  async getObservations(_patientId: string, _params?: PaginationParams): Promise<PaginatedResponse<Observation>> {
    // TODO: GET /patients/{id}/vitals
    throw new Error('Not implemented');
  }

  async getConditions(_patientId: string, _params?: PaginationParams): Promise<PaginatedResponse<Condition>> {
    // TODO: GET /patients/{id}/problems
    throw new Error('Not implemented');
  }

  async getDiagnosticReports(_patientId: string, _params?: PaginationParams): Promise<PaginatedResponse<DiagnosticReport>> {
    // TODO: GET /patients/{id}/lab_orders
    throw new Error('Not implemented');
  }
}
