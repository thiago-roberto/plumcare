import { injectable, inject } from 'inversify';
import type { Repository } from 'typeorm';
import type { Patient, Encounter, Observation, Condition, Resource } from '@medplum/fhirtypes';
import { TYPES } from '../../core/di-tokens.js';
import type { EhrSystem, EhrPatient, EhrEncounter } from '../../core/types/index.js';
import { getProvider, getRegisteredSystems, type ProviderConfig } from '../../core/providers/base.provider.js';
import { ConfigService } from '../config/config.service.js';
import { MedplumService } from '../medplum/medplum.service.js';
import { WebhooksService } from '../webhooks/webhooks.service.js';
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
    @inject(TYPES.WebhooksService) private webhooksService: WebhooksService,
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
          await this.logWebhookEventsForResources(fhirPatients);
        }
        if (fhirEncounters.length > 0) {
          await this.medplumService.batchUpsertResources(fhirEncounters);
          await this.logWebhookEventsForResources(fhirEncounters);
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
          await this.logWebhookEventsForResources(allObservations as Resource[]);
        }
        if (allConditions.length > 0) {
          await this.medplumService.batchUpsertResources(allConditions);
          await this.logWebhookEventsForResources(allConditions as Resource[]);
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
              line: ehrPatient.address.street ? [ehrPatient.address.street] : undefined,
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

  /**
   * Log webhook events for synced resources
   * This simulates webhook events that would occur in a real EHR integration
   */
  private async logWebhookEventsForResources(resources: Resource[]): Promise<void> {
    if (resources.length === 0) return;

    const events = resources.map(resource => {
      const payload = this.extractResourceDetails(resource);

      return {
        resourceType: resource.resourceType,
        resourceId: String(payload.resourceId),
        action: 'create' as const,
        payload,
      };
    });

    await this.webhooksService.logSyncEventsBatch(events);
  }

  /**
   * Extract detailed information from a FHIR resource for webhook logging
   */
  private extractResourceDetails(resource: Resource): Record<string, unknown> {
    // Get common fields
    const resourceWithIdentifier = resource as { identifier?: Array<{ value?: string; system?: string }> };
    const identifier = resourceWithIdentifier.identifier?.[0];
    const ehrSource = resource.meta?.tag?.find(t => t.system === EHR_SOURCE_SYSTEM);

    const baseDetails: Record<string, unknown> = {
      resourceType: resource.resourceType,
      resourceId: identifier?.value || resource.id || 'unknown',
      ehrSystem: ehrSource?.code || 'unknown',
      ehrSystemDisplay: ehrSource?.display || 'Unknown System',
    };

    // Extract type-specific details
    switch (resource.resourceType) {
      case 'Patient': {
        const patient = resource as Patient;
        const name = patient.name?.[0];
        return {
          ...baseDetails,
          patientName: name ? `${name.given?.join(' ') || ''} ${name.family || ''}`.trim() : 'Unknown',
          gender: patient.gender,
          birthDate: patient.birthDate,
          mrn: identifier?.value,
        };
      }
      case 'Encounter': {
        const encounter = resource as Encounter;
        return {
          ...baseDetails,
          status: encounter.status,
          type: encounter.type?.[0]?.text,
          reason: encounter.reasonCode?.[0]?.text,
          patientReference: encounter.subject?.reference,
          period: encounter.period,
        };
      }
      case 'Observation': {
        const observation = resource as Observation;
        return {
          ...baseDetails,
          status: observation.status,
          category: observation.category?.[0]?.coding?.[0]?.display || observation.category?.[0]?.coding?.[0]?.code,
          code: observation.code?.text || observation.code?.coding?.[0]?.display,
          loincCode: observation.code?.coding?.[0]?.code,
          value: observation.valueQuantity
            ? `${observation.valueQuantity.value} ${observation.valueQuantity.unit}`
            : observation.valueString,
          patientReference: observation.subject?.reference,
          effectiveDateTime: observation.effectiveDateTime,
        };
      }
      case 'Condition': {
        const condition = resource as Condition;
        return {
          ...baseDetails,
          clinicalStatus: condition.clinicalStatus?.coding?.[0]?.code,
          code: condition.code?.text || condition.code?.coding?.[0]?.display,
          icdCode: condition.code?.coding?.[0]?.code,
          patientReference: condition.subject?.reference,
          onsetDateTime: condition.onsetDateTime,
        };
      }
      default:
        return baseDetails;
    }
  }
}
