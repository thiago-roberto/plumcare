import type { Encounter } from '@medplum/fhirtypes';
import { getMedplumClient } from '../../shared/medplum/index.js';
import { AppError } from '../../core/middleware/index.js';
import { EHR_SOURCE_SYSTEM, type EhrSystem } from './encounters.types.js';

/**
 * Encounters Service
 *
 * Handles encounter-related queries to Medplum FHIR server.
 * All encounters are tagged with their source EHR system.
 */

export interface PaginationParams {
  limit: number;
  offset: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

/**
 * Get encounters from Medplum filtered by EHR source
 */
export async function getEncounters(
  system: EhrSystem,
  pagination: PaginationParams
): Promise<PaginatedResult<Encounter>> {
  const client = getMedplumClient();
  const { limit, offset } = pagination;

  const encounters = await client.searchResources('Encounter', {
    _tag: `${EHR_SOURCE_SYSTEM}|${system}`,
    _count: limit.toString(),
    _offset: offset.toString(),
    _sort: '-_lastUpdated',
  }) as Encounter[];

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

/**
 * Get a specific encounter by ID from Medplum
 */
export async function getEncounterById(system: EhrSystem, id: string): Promise<Encounter> {
  const client = getMedplumClient();

  let encounter: Encounter | undefined;

  // Try to get by ID first
  try {
    encounter = await client.readResource('Encounter', id);
  } catch {
    // If not found by ID, search by identifier
    const encounters = await client.searchResources('Encounter', {
      _tag: `${EHR_SOURCE_SYSTEM}|${system}`,
      identifier: id,
    }) as Encounter[];
    encounter = encounters[0];
  }

  if (!encounter) {
    throw new AppError(404, `Encounter not found: ${id}`, 'ENCOUNTER_NOT_FOUND');
  }

  // Verify the encounter belongs to the requested EHR system
  const hasCorrectTag = encounter.meta?.tag?.some(
    t => t.system === EHR_SOURCE_SYSTEM && t.code === system
  );

  if (!hasCorrectTag) {
    throw new AppError(404, `Encounter not found in ${system}: ${id}`, 'ENCOUNTER_NOT_FOUND');
  }

  return encounter;
}

/**
 * Get encounters for a specific patient from Medplum
 */
export async function getPatientEncounters(
  system: EhrSystem,
  patientId: string,
  pagination: PaginationParams
): Promise<PaginatedResult<Encounter>> {
  const client = getMedplumClient();
  const { limit, offset } = pagination;

  const encounters = await client.searchResources('Encounter', {
    _tag: `${EHR_SOURCE_SYSTEM}|${system}`,
    subject: `Patient/${patientId}`,
    _count: limit.toString(),
    _offset: offset.toString(),
    _sort: '-_lastUpdated',
  }) as Encounter[];

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
