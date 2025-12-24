import { injectable, inject } from 'inversify';
import { MedplumClient } from '@medplum/core';
import type { Patient, Encounter, Bundle, Resource } from '@medplum/fhirtypes';
import { TYPES } from '../../core/di-tokens.js';
import { ConfigService } from '../config/config.service.js';

@injectable()
export class MedplumService {
  private _client: MedplumClient | null = null;

  constructor(
    @inject(TYPES.ConfigService) private configService: ConfigService
  ) {}

  public get client(): MedplumClient {
    if (!this._client) {
      this._client = new MedplumClient({
        baseUrl: this.configService.medplum.baseUrl,
      });
    }
    return this._client;
  }

  public async authenticate(): Promise<void> {
    const { clientId, clientSecret } = this.configService.medplum;
    if (clientId && clientSecret) {
      await this.client.startClientLogin(clientId, clientSecret);
    }
  }

  public async upsertPatient(patient: Patient): Promise<Patient> {
    if (patient.identifier && patient.identifier.length > 0) {
      const identifier = patient.identifier[0];
      const existing = await this.client.searchOne('Patient', {
        identifier: `${identifier.system}|${identifier.value}`,
      });

      if (existing) {
        return this.client.updateResource({
          ...patient,
          id: existing.id,
        });
      }
    }

    return this.client.createResource(patient);
  }

  public async upsertEncounter(encounter: Encounter): Promise<Encounter> {
    if (encounter.identifier && encounter.identifier.length > 0) {
      const identifier = encounter.identifier[0];
      const existing = await this.client.searchOne('Encounter', {
        identifier: `${identifier.system}|${identifier.value}`,
      });

      if (existing) {
        return this.client.updateResource({
          ...encounter,
          id: existing.id,
        });
      }
    }

    return this.client.createResource(encounter);
  }

  public async batchUpsertResources(resources: Resource[]): Promise<Bundle> {
    const bundle: Bundle = {
      resourceType: 'Bundle',
      type: 'transaction',
      entry: resources.map((resource) => {
        const identifier = (
          resource as { identifier?: Array<{ system?: string; value?: string }> }
        ).identifier?.[0];
        const ifNoneExist = identifier
          ? `identifier=${identifier.system}|${identifier.value}`
          : undefined;

        const resourceWithoutId = { ...resource };
        delete resourceWithoutId.id;

        return {
          resource: resourceWithoutId,
          request: {
            method: 'POST' as const,
            url: resource.resourceType,
            ifNoneExist,
          },
        };
      }),
    };

    return this.client.executeBatch(bundle);
  }

  public async searchPatients(params?: {
    name?: string;
    identifier?: string;
    _count?: number;
    _offset?: number;
  }): Promise<Patient[]> {
    return this.client.searchResources('Patient', params || {});
  }

  public async searchEncounters(params?: {
    patient?: string;
    status?: string;
    date?: string;
    _count?: number;
    _offset?: number;
  }): Promise<Encounter[]> {
    return this.client.searchResources('Encounter', params || {});
  }

  public async getResource<T extends Resource>(
    resourceType: string,
    id: string
  ): Promise<T | undefined> {
    try {
      return (await this.client.readResource(
        resourceType as T['resourceType'],
        id
      )) as T;
    } catch {
      return undefined;
    }
  }

  public async createSyncAuditEvent(params: {
    action: 'C' | 'R' | 'U' | 'D';
    outcome: '0' | '4' | '8' | '12';
    source: string;
    description: string;
    entityType?: string;
    entityId?: string;
  }): Promise<void> {
    await this.client.createResource({
      resourceType: 'AuditEvent',
      type: {
        system: 'http://terminology.hl7.org/CodeSystem/audit-event-type',
        code: 'rest',
        display: 'RESTful Operation',
      },
      action: params.action,
      recorded: new Date().toISOString(),
      outcome: params.outcome,
      outcomeDesc: params.description,
      agent: [
        {
          who: {
            display: `PlumCare Backend - ${params.source}`,
          },
          requestor: true,
        },
      ],
      source: {
        observer: {
          display: 'PlumCare Backend',
        },
      },
      entity:
        params.entityType && params.entityId
          ? [
              {
                what: {
                  reference: `${params.entityType}/${params.entityId}`,
                },
              },
            ]
          : undefined,
    });
  }
}
