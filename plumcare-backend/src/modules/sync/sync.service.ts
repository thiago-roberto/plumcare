import { injectable, inject } from 'inversify';
import type { Repository } from 'typeorm';
import type { Patient, Encounter, Observation, Condition, Resource, ServiceRequest } from '@medplum/fhirtypes';
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
  serviceRequests: number;
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

        // Batch upsert patients first and build a mapping from EHR ID to Medplum ID
        const ehrToMedplumPatientMap = new Map<string, string>();

        if (fhirPatients.length > 0) {
          const patientBundle = await this.medplumService.batchUpsertResources(fhirPatients);
          await this.logWebhookEventsForResources(fhirPatients);

          // Build mapping from EHR patient ID to Medplum patient ID
          patientBundle.entry?.forEach((entry, index) => {
            const medplumId = entry.resource?.id || entry.response?.location?.split('/').pop()?.split('?')[0];
            if (medplumId && patientsResult.data[index]) {
              const ehrPatientId = `${system}-p-${patientsResult.data[index].sourceId}`;
              ehrToMedplumPatientMap.set(ehrPatientId, medplumId);
              // Also map the direct reference format
              ehrToMedplumPatientMap.set(`Patient/${ehrPatientId}`, `Patient/${medplumId}`);
            }
          });
        }

        // Update encounter patient references to use Medplum IDs
        const updatedEncounters = fhirEncounters.map(encounter => {
          const ehrRef = encounter.subject?.reference;
          if (ehrRef && ehrToMedplumPatientMap.has(ehrRef)) {
            return {
              ...encounter,
              subject: { reference: ehrToMedplumPatientMap.get(ehrRef) },
            };
          }
          return encounter;
        });

        if (updatedEncounters.length > 0) {
          await this.medplumService.batchUpsertResources(updatedEncounters);
          await this.logWebhookEventsForResources(updatedEncounters);
        }

        const systemSummary = summary[system as keyof typeof summary];
        systemSummary.patients = fhirPatients.length;
        systemSummary.encounters = updatedEncounters.length;

        // Get clinical data in parallel for all patients
        const patientIds = patientsResult.data.map(p => `${system}-p-${p.sourceId}`);

        const [observationsResults, conditionsResults] = await Promise.all([
          Promise.all(patientIds.map(id => provider.getObservations(id, { limit: 50 }))),
          Promise.all(patientIds.map(id => provider.getConditions(id, { limit: 50 }))),
        ]);

        const allObservations = observationsResults.flatMap(r => r.data);
        const allConditions = conditionsResults.flatMap(r => r.data);

        // Update observation patient references to use Medplum IDs
        const updatedObservations = allObservations.map(obs => {
          const ehrRef = obs.subject?.reference;
          if (ehrRef && ehrToMedplumPatientMap.has(ehrRef)) {
            return {
              ...obs,
              subject: { reference: ehrToMedplumPatientMap.get(ehrRef) },
            };
          }
          return obs;
        });

        // Update condition patient references to use Medplum IDs
        const updatedConditions = allConditions.map(cond => {
          const ehrRef = cond.subject?.reference;
          if (ehrRef && ehrToMedplumPatientMap.has(ehrRef)) {
            return {
              ...cond,
              subject: { reference: ehrToMedplumPatientMap.get(ehrRef) },
            };
          }
          return cond;
        });

        // Batch upsert observations and conditions with corrected references
        if (updatedObservations.length > 0) {
          await this.medplumService.batchUpsertResources(updatedObservations);
          await this.logWebhookEventsForResources(updatedObservations as Resource[]);
        }
        if (updatedConditions.length > 0) {
          await this.medplumService.batchUpsertResources(updatedConditions);
          await this.logWebhookEventsForResources(updatedConditions as Resource[]);
        }

        systemSummary.observations = updatedObservations.length;
        systemSummary.conditions = updatedConditions.length;

        // Sync lab orders as ServiceRequests (Elation and NextGen have native lab orders)
        if ('getNativeLabOrders' in provider && typeof provider.getNativeLabOrders === 'function') {
          const labOrdersResult = await (provider as { getNativeLabOrders: (params?: { limit?: number }) => Promise<{ data: unknown[] }> }).getNativeLabOrders({ limit: patientCount * 5 });
          const serviceRequests = labOrdersResult.data.map((labOrder: unknown) =>
            this.convertLabOrderToServiceRequest(labOrder, system, patientsResult.data)
          );

          // Update ServiceRequest patient references to use Medplum IDs
          const updatedServiceRequests = serviceRequests.map(sr => {
            const ehrRef = sr.subject?.reference;
            if (ehrRef && ehrToMedplumPatientMap.has(ehrRef)) {
              return {
                ...sr,
                subject: { reference: ehrToMedplumPatientMap.get(ehrRef) },
              };
            }
            return sr;
          });

          if (updatedServiceRequests.length > 0) {
            await this.medplumService.batchUpsertResources(updatedServiceRequests);
            await this.logWebhookEventsForResources(updatedServiceRequests as Resource[]);
          }
          systemSummary.serviceRequests = updatedServiceRequests.length;
        }

        totalResources += systemSummary.patients + systemSummary.encounters +
                         systemSummary.observations + systemSummary.conditions +
                         systemSummary.serviceRequests;

        await this.logSyncEvent({
          system,
          type: 'patient',
          action: 'created',
          resourceId: 'mock-batch',
          status: 'success',
          details: `Mock sync: ${systemSummary.patients} patients, ${systemSummary.encounters} encounters, ${systemSummary.observations} observations, ${systemSummary.conditions} conditions, ${systemSummary.serviceRequests} lab orders`,
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

  private convertLabOrderToServiceRequest(
    labOrder: unknown,
    system: EhrSystem,
    patients: EhrPatient[]
  ): ServiceRequest {
    // Handle both Elation and NextGen lab order formats
    // Elation uses: id (number), patient (number), status, priority, lab_name, tests
    // NextGen uses: order_id (string), person_id (string), order_status, priority, performing_lab_name, order_tests
    const order = labOrder as {
      // Elation fields
      id?: number;
      patient?: number;
      status?: string;
      lab_name?: string;
      tests?: Array<{ code: string; name: string; loinc_code?: string }>;
      notes?: string;
      // NextGen fields
      order_id?: string;
      person_id?: string;
      order_status?: string;
      performing_lab_name?: string;
      order_tests?: Array<{ test_code: string; test_name: string; loinc_code?: string }>;
      special_instructions?: string;
      // Shared fields
      order_date?: string;
      priority: string;
    };

    // Get ID - Elation uses numeric id, NextGen uses order_id string
    const orderId = order.id?.toString() || order.order_id || 'unknown';

    // Get patient ID - Elation uses patient (number), NextGen uses person_id (string)
    const patientId = order.patient?.toString() || order.person_id || '';

    // Find the patient to get the correct EHR patient ID format
    const patientData = patients.find(p => p.sourceId === patientId);
    const patientRef = patientData ? `Patient/${system}-p-${patientData.sourceId}` : `Patient/${system}-p-${patientId}`;

    // Map status to FHIR ServiceRequest status
    const statusMap: Record<string, ServiceRequest['status']> = {
      'Ordered': 'active',
      'Collected': 'active',
      'In Progress': 'active',
      'Final': 'completed',
      'Cancelled': 'revoked',
      'Pending': 'draft',
      'Completed': 'completed',
    };

    // Map priority to FHIR request priority
    const priorityMap: Record<string, ServiceRequest['priority']> = {
      'Routine': 'routine',
      'Urgent': 'urgent',
      'STAT': 'stat',
      'Normal': 'routine',
      'High': 'urgent',
    };

    const orderDate = order.order_date;
    const labName = order.lab_name || order.performing_lab_name;
    const status = order.status || order.order_status || 'active';
    const notes = order.notes || order.special_instructions;

    // Handle tests from both Elation (tests) and NextGen (order_tests)
    const elationTests = order.tests || [];
    const nextgenTests = order.order_tests || [];

    // Build code coding array from available tests
    const codeCoding = elationTests.length > 0
      ? elationTests.map(test => ({
          system: 'http://loinc.org',
          code: test.loinc_code || test.code,
          display: test.name,
        }))
      : nextgenTests.map(test => ({
          system: 'http://loinc.org',
          code: test.loinc_code || test.test_code,
          display: test.test_name,
        }));

    const codeText = elationTests.length > 0
      ? elationTests.map(t => t.name).join(', ')
      : nextgenTests.map(t => t.test_name).join(', ');

    return {
      resourceType: 'ServiceRequest',
      identifier: [
        {
          system: `http://plumcare.io/${system}/service-request`,
          value: orderId,
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
      status: statusMap[status] || 'active',
      intent: 'order',
      priority: priorityMap[order.priority] || 'routine',
      category: [
        {
          coding: [
            {
              system: 'http://snomed.info/sct',
              code: '108252007',
              display: 'Laboratory procedure',
            },
          ],
        },
      ],
      code: {
        coding: codeCoding,
        text: codeText || 'Lab Order',
      },
      subject: {
        reference: patientRef,
      },
      authoredOn: orderDate,
      performer: labName
        ? [
            {
              display: labName,
            },
          ]
        : undefined,
      note: notes ? [{ text: notes }] : undefined,
    };
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
      serviceRequests: 0,
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
      case 'ServiceRequest': {
        const serviceRequest = resource as ServiceRequest;
        return {
          ...baseDetails,
          status: serviceRequest.status,
          intent: serviceRequest.intent,
          priority: serviceRequest.priority,
          code: serviceRequest.code?.text || serviceRequest.code?.coding?.[0]?.display,
          patientReference: serviceRequest.subject?.reference,
          authoredOn: serviceRequest.authoredOn,
          performer: serviceRequest.performer?.[0]?.display,
        };
      }
      default:
        return baseDetails;
    }
  }
}
