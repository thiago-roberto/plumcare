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
 * Real NextGen Healthcare API Provider
 *
 * This provider implements the actual NextGen Healthcare API integration.
 * To use this provider, you need:
 * 1. NextGen Developer Account: https://developer.nextgen.com/
 * 2. API credentials (Client ID & Secret)
 *
 * API Documentation: https://developer.nextgen.com/docs
 *
 * OAuth Flow:
 * - NextGen uses OAuth 2.0
 * - Token endpoint varies by environment
 * - Base URL (Production): https://api.nextgen.com/nge/prod/nge-api
 */
export class NextGenProvider extends BaseEhrProvider {
  constructor(config: ProviderConfig) {
    super('nextgen', config);
  }

  async authenticate(): Promise<AuthResult> {
    // TODO: Implement real OAuth flow
    // POST to token endpoint
    throw new Error('Real NextGen authentication not implemented. Set USE_MOCKS=true or implement OAuth flow.');
  }

  async refreshToken(_refreshToken: string): Promise<AuthResult> {
    return this.authenticate();
  }

  async getConnectionStatus(): Promise<EhrConnection> {
    throw new Error('Not implemented');
  }

  async getPatients(_params?: PaginationParams): Promise<PaginatedResponse<EhrPatient>> {
    // TODO: GET /persons
    throw new Error('Not implemented');
  }

  async getPatient(_id: string): Promise<EhrPatient | null> {
    // TODO: GET /persons/{personId}
    throw new Error('Not implemented');
  }

  async getEncounters(_params?: PaginationParams): Promise<PaginatedResponse<EhrEncounter>> {
    // TODO: GET /encounters
    throw new Error('Not implemented');
  }

  async getEncounter(_id: string): Promise<EhrEncounter | null> {
    // TODO: GET /encounters/{encounterId}
    throw new Error('Not implemented');
  }

  async getEncountersByPatient(_patientId: string, _params?: PaginationParams): Promise<PaginatedResponse<EhrEncounter>> {
    // TODO: GET /persons/{personId}/encounters
    throw new Error('Not implemented');
  }

  async getObservations(_patientId: string, _params?: PaginationParams): Promise<PaginatedResponse<Observation>> {
    // TODO: GET /persons/{personId}/vitals
    throw new Error('Not implemented');
  }

  async getConditions(_patientId: string, _params?: PaginationParams): Promise<PaginatedResponse<Condition>> {
    // TODO: GET /persons/{personId}/problems
    throw new Error('Not implemented');
  }

  async getDiagnosticReports(_patientId: string, _params?: PaginationParams): Promise<PaginatedResponse<DiagnosticReport>> {
    // TODO: GET /persons/{personId}/labResults
    throw new Error('Not implemented');
  }
}
