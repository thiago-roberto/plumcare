import { injectable, inject } from 'inversify';
import type { Encounter } from '@medplum/fhirtypes';
import { TYPES } from '../../core/di-tokens.js';
import type { EhrSystem, PaginatedResponse } from '../../core/types/index.js';
import { MedplumService } from '../medplum/medplum.service.js';

const EHR_SOURCE_SYSTEM = 'http://plumcare.io/ehr-source';

@injectable()
export class EncountersService {
  constructor(
    @inject(TYPES.MedplumService) private medplumService: MedplumService
  ) {}

  async getEncounters(
    system: EhrSystem,
    limit = 10,
    offset = 0
  ): Promise<PaginatedResponse<Encounter>> {
    const client = this.medplumService.client;

    const encounters = (await client.searchResources('Encounter', {
      _tag: `${EHR_SOURCE_SYSTEM}|${system}`,
      _count: limit.toString(),
      _offset: offset.toString(),
      _sort: '-_lastUpdated',
    })) as Encounter[];

    const bundle = await client.search('Encounter', {
      _tag: `${EHR_SOURCE_SYSTEM}|${system}`,
      _summary: 'count',
    });
    const total = bundle.total || encounters.length;

    return {
      data: encounters,
      total,
      limit,
      offset,
      hasMore: offset + encounters.length < total,
    };
  }

  async getEncounter(system: EhrSystem, id: string): Promise<Encounter | null> {
    const client = this.medplumService.client;

    let encounter: Encounter | undefined;

    try {
      encounter = await client.readResource('Encounter', id);
    } catch {
      const encounters = (await client.searchResources('Encounter', {
        _tag: `${EHR_SOURCE_SYSTEM}|${system}`,
        identifier: id,
      })) as Encounter[];
      encounter = encounters[0];
    }

    if (!encounter) {
      return null;
    }

    const hasCorrectTag = encounter.meta?.tag?.some(
      (t) => t.system === EHR_SOURCE_SYSTEM && t.code === system
    );

    if (!hasCorrectTag) {
      return null;
    }

    return encounter;
  }

  async getEncountersByPatient(
    system: EhrSystem,
    patientId: string,
    limit = 10,
    offset = 0
  ): Promise<PaginatedResponse<Encounter>> {
    const client = this.medplumService.client;

    const encounters = (await client.searchResources('Encounter', {
      _tag: `${EHR_SOURCE_SYSTEM}|${system}`,
      subject: `Patient/${patientId}`,
      _count: limit.toString(),
      _offset: offset.toString(),
      _sort: '-_lastUpdated',
    })) as Encounter[];

    const bundle = await client.search('Encounter', {
      _tag: `${EHR_SOURCE_SYSTEM}|${system}`,
      subject: `Patient/${patientId}`,
      _summary: 'count',
    });
    const total = bundle.total || encounters.length;

    return {
      data: encounters,
      total,
      limit,
      offset,
      hasMore: offset + encounters.length < total,
    };
  }
}
