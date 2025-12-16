import type {
  EhrSystem,
  EhrConnection,
  EhrPatient,
  EhrEncounter,
  PaginationParams,
  PaginatedResponse,
  Patient,
  Encounter,
  Observation,
  Condition,
  DiagnosticReport,
} from '../types/index.js';

export interface AuthResult {
  accessToken: string;
  refreshToken?: string;
  expiresAt: Date;
}

export interface ProviderConfig {
  baseUrl: string;
  clientId: string;
  clientSecret: string;
  [key: string]: string;
}

export abstract class BaseEhrProvider {
  protected system: EhrSystem;
  protected config: ProviderConfig;
  protected accessToken?: string;
  protected tokenExpiresAt?: Date;

  constructor(system: EhrSystem, config: ProviderConfig) {
    this.system = system;
    this.config = config;
  }

  // Authentication
  abstract authenticate(): Promise<AuthResult>;
  abstract refreshToken(refreshToken: string): Promise<AuthResult>;

  // Connection status
  abstract getConnectionStatus(): Promise<EhrConnection>;

  // Patient operations (returns EHR-native format)
  abstract getPatients(params?: PaginationParams): Promise<PaginatedResponse<EhrPatient>>;
  abstract getPatient(id: string): Promise<EhrPatient | null>;

  // Encounter operations (returns EHR-native format)
  abstract getEncounters(params?: PaginationParams): Promise<PaginatedResponse<EhrEncounter>>;
  abstract getEncounter(id: string): Promise<EhrEncounter | null>;
  abstract getEncountersByPatient(patientId: string, params?: PaginationParams): Promise<PaginatedResponse<EhrEncounter>>;

  // Clinical data (returns FHIR format directly as most EHRs support FHIR)
  abstract getObservations(patientId: string, params?: PaginationParams): Promise<PaginatedResponse<Observation>>;
  abstract getConditions(patientId: string, params?: PaginationParams): Promise<PaginatedResponse<Condition>>;
  abstract getDiagnosticReports(patientId: string, params?: PaginationParams): Promise<PaginatedResponse<DiagnosticReport>>;

  // Utility methods
  protected isTokenValid(): boolean {
    if (!this.accessToken || !this.tokenExpiresAt) {
      return false;
    }
    // Consider token invalid if it expires in less than 5 minutes
    const buffer = 5 * 60 * 1000;
    return this.tokenExpiresAt.getTime() > Date.now() + buffer;
  }

  protected async ensureAuthenticated(): Promise<void> {
    if (!this.isTokenValid()) {
      const result = await this.authenticate();
      this.accessToken = result.accessToken;
      this.tokenExpiresAt = result.expiresAt;
    }
  }

  getSystem(): EhrSystem {
    return this.system;
  }
}

// Provider registry to get the right provider for each system
export type ProviderFactory = (config: ProviderConfig) => BaseEhrProvider;

const providerRegistry = new Map<EhrSystem, ProviderFactory>();

export function registerProvider(system: EhrSystem, factory: ProviderFactory): void {
  providerRegistry.set(system, factory);
}

export function getProvider(system: EhrSystem, config: ProviderConfig): BaseEhrProvider {
  const factory = providerRegistry.get(system);
  if (!factory) {
    throw new Error(`No provider registered for system: ${system}`);
  }
  return factory(config);
}

export function getRegisteredSystems(): EhrSystem[] {
  return Array.from(providerRegistry.keys());
}
