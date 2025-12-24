import { injectable, inject } from 'inversify';
import type { Repository } from 'typeorm';
import type { Patient, Encounter, Observation, Condition } from '@medplum/fhirtypes';
import { TYPES } from '../../core/di-tokens.js';
import type { EhrSystem, EhrPatient, EhrEncounter } from '../../core/types/index.js';
import { getProvider, getRegisteredSystems, type ProviderConfig } from '../../core/providers/base.provider.js';
import { ConfigService } from '../config/config.service.js';
import { MedplumService } from '../medplum/medplum.service.js';
import { SyncEvent } from '../../database/entities/sync-event.entity.js';

// EHR source system tag URL - must match frontend's EHR_SOURCE_SYSTEM
const EHR_SOURCE_SYSTEM = 'http://plumcare.io/ehr-source';

export interface SyncResult {
  success: boolean;
  syncedResources: number;
  errors: string[];
}

export interface MockDataSyncResult {
  success: boolean;
  summary: {
    athena: ResourceSummary;
    elation: ResourceSummary;
    nextgen: ResourceSummary;
  };
  totalResources: number;
  errors: string[];
}

interface ResourceSummary {
  patients: number;
  encounters: number;
  observations: number;
  conditions: number;
  allergies: number;
  medications: number;
  diagnosticReports: number;
}

@injectable()
export class SyncService {
  constructor(
    @inject(TYPES.ConfigService) private configService: ConfigService,
    @inject(TYPES.MedplumService) private medplumService: MedplumService,
    @inject(TYPES.SyncEventRepository) private syncEventRepository: Repository<SyncEvent>
  ) {}

  async getSyncEvents(params?: {
    system?: EhrSystem;
    limit?: number;
    offset?: number;
  }): Promise<{ events: SyncEvent[]; total: number }> {
    const limit = params?.limit || 20;
    const offset = params?.offset || 0;

    const queryBuilder = this.syncEventRepository.createQueryBuilder('event');

    if (params?.system) {
      queryBuilder.where('event.system = :system', { system: params.system });
    }

    queryBuilder
      .orderBy('event.timestamp', 'DESC')
      .skip(offset)
      .take(limit);

    const [events, total] = await queryBuilder.getManyAndCount();

    return { events, total };
  }

  async triggerSync(system: EhrSystem): Promise<SyncResult> {
    const errors: string[] = [];
    let syncedResources = 0;

    try {
      const providerConfig = this.getProviderConfig(system);
      const provider = getProvider(system, providerConfig);

      // Authenticate with the provider
      await provider.authenticate();

      // Fetch patients from the EHR
      const patientsResult = await provider.getPatients({ limit: 100 });

      // For now, just count the resources - actual sync to Medplum would happen here
      syncedResources = patientsResult.data.length;

      // Log sync event
      await this.logSyncEvent({
        system,
        type: 'patient',
        action: 'created',
        resourceId: 'batch',
        status: 'success',
        details: `Synced ${syncedResources} patients`,
      });

      return {
        success: true,
        syncedResources,
        errors,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      errors.push(errorMessage);

      await this.logSyncEvent({
        system,
        type: 'patient',
        action: 'created',
        resourceId: 'batch',
        status: 'failed',
        details: errorMessage,
      });

      return {
        success: false,
        syncedResources,
        errors,
      };
    }
  }

  async syncMockData(options?: {
    patientCount?: number;
    includeAllData?: boolean;
  }): Promise<MockDataSyncResult> {
    const patientCount = options?.patientCount || 5;
    const errors: string[] = [];
    let totalResources = 0;

    const summary: MockDataSyncResult['summary'] = {
      athena: this.createEmptySummary(),
      elation: this.createEmptySummary(),
      nextgen: this.createEmptySummary(),
    };

    const systems = getRegisteredSystems();

    for (const system of systems) {
      try {
        const providerConfig = this.getProviderConfig(system);
        const provider = getProvider(system, providerConfig);

        // Regenerate mock data with the requested patient count
        if ('regenerateMockData' in provider && typeof provider.regenerateMockData === 'function') {
          (provider as { regenerateMockData: (count: number) => void }).regenerateMockData(patientCount);
        }

        // Get patients from mock provider
        const patientsResult = await provider.getPatients({ limit: patientCount });
        const encountersResult = await provider.getEncounters({ limit: patientCount * 3 });

        // Convert to FHIR and sync to Medplum
        const fhirPatients = patientsResult.data.map(p => this.convertToFhirPatient(p, system));
        const fhirEncounters = encountersResult.data.map(e => this.convertToFhirEncounter(e, system));

        // Batch upsert patients first (other resources reference them)
        if (fhirPatients.length > 0) {
          await this.medplumService.batchUpsertResources(fhirPatients);
        }
        if (fhirEncounters.length > 0) {
          await this.medplumService.batchUpsertResources(fhirEncounters);
        }

        const systemSummary = summary[system as keyof typeof summary];
        systemSummary.patients = fhirPatients.length;
        systemSummary.encounters = fhirEncounters.length;

        // Get clinical data in parallel for all patients
        const patientIds = patientsResult.data.map(p => `${system}-p-${p.sourceId}`);

        const [observationsResults, conditionsResults] = await Promise.all([
          Promise.all(patientIds.map(id => provider.getObservations(id, { limit: 50 }))),
          Promise.all(patientIds.map(id => provider.getConditions(id, { limit: 50 }))),
        ]);

        const allObservations = observationsResults.flatMap(r => r.data);
        const allConditions = conditionsResults.flatMap(r => r.data);

        // Batch upsert observations and conditions
        if (allObservations.length > 0) {
          await this.medplumService.batchUpsertResources(allObservations);
        }
        if (allConditions.length > 0) {
          await this.medplumService.batchUpsertResources(allConditions);
        }

        systemSummary.observations = allObservations.length;
        systemSummary.conditions = allConditions.length;

        totalResources += systemSummary.patients + systemSummary.encounters +
                         systemSummary.observations + systemSummary.conditions;

        await this.logSyncEvent({
          system,
          type: 'patient',
          action: 'created',
          resourceId: 'mock-batch',
          status: 'success',
          details: `Mock sync: ${systemSummary.patients} patients, ${systemSummary.encounters} encounters, ${systemSummary.observations} observations, ${systemSummary.conditions} conditions`,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`${system}: ${errorMessage}`);
        console.error(`Sync error for ${system}:`, error);
      }
    }

    return {
      success: errors.length === 0,
      summary,
      totalResources,
      errors,
    };
  }

  private convertToFhirPatient(ehrPatient: EhrPatient, system: EhrSystem): Patient {
    return {
      resourceType: 'Patient',
      identifier: [
        {
          system: `http://plumcare.io/${system}/patient`,
          value: ehrPatient.sourceId,
        },
      ],
      meta: {
        tag: [
          {
            system: EHR_SOURCE_SYSTEM,
            code: system,
            display: this.getSystemName(system),
          },
        ],
      },
      name: [
        {
          given: [ehrPatient.firstName, ehrPatient.middleName].filter(Boolean) as string[],
          family: ehrPatient.lastName,
        },
      ],
      gender: ehrPatient.gender as Patient['gender'],
      birthDate: ehrPatient.dateOfBirth,
      telecom: [
        ...(ehrPatient.email ? [{ system: 'email' as const, value: ehrPatient.email }] : []),
        ...(ehrPatient.phone ? [{ system: 'phone' as const, value: ehrPatient.phone }] : []),
      ],
      address: ehrPatient.address
        ? [
            {
              line: [ehrPatient.address.street],
              city: ehrPatient.address.city,
              state: ehrPatient.address.state,
              postalCode: ehrPatient.address.postalCode,
              country: ehrPatient.address.country,
            },
          ]
        : [],
    };
  }

  private convertToFhirEncounter(ehrEncounter: EhrEncounter, system: EhrSystem): Encounter {
    return {
      resourceType: 'Encounter',
      identifier: [
        {
          system: `http://plumcare.io/${system}/encounter`,
          value: ehrEncounter.sourceId,
        },
      ],
      meta: {
        tag: [
          {
            system: EHR_SOURCE_SYSTEM,
            code: system,
            display: this.getSystemName(system),
          },
        ],
      },
      status: ehrEncounter.status as Encounter['status'],
      class: {
        system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
        code: 'AMB',
        display: 'ambulatory',
      },
      type: ehrEncounter.type
        ? [
            {
              text: ehrEncounter.type,
            },
          ]
        : undefined,
      subject: {
        reference: `Patient/${ehrEncounter.patientId}`,
      },
      period: {
        start: ehrEncounter.startTime,
        end: ehrEncounter.endTime,
      },
      reasonCode: ehrEncounter.reason
        ? [
            {
              text: ehrEncounter.reason,
            },
          ]
        : undefined,
    };
  }

  private getSystemName(system: EhrSystem): string {
    const names: Record<EhrSystem, string> = {
      athena: 'Athena Health',
      elation: 'Elation Health',
      nextgen: 'NextGen Healthcare',
    };
    return names[system];
  }

  private async logSyncEvent(params: {
    system: EhrSystem;
    type: string;
    action: string;
    resourceId: string;
    status: string;
    details?: string;
  }): Promise<void> {
    try {
      const event = this.syncEventRepository.create(params);
      await this.syncEventRepository.save(event);
    } catch {
      // Silently fail if database is not available
      console.warn('Failed to log sync event - database may not be available');
    }
  }

  private getProviderConfig(system: EhrSystem): ProviderConfig {
    return this.configService[system] as ProviderConfig;
  }

  private createEmptySummary(): ResourceSummary {
    return {
      patients: 0,
      encounters: 0,
      observations: 0,
      conditions: 0,
      allergies: 0,
      medications: 0,
      diagnosticReports: 0,
    };
  }
}
