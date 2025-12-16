import { MedplumClient } from '@medplum/core';
import type { Patient, Encounter, Bundle, Resource } from '@medplum/fhirtypes';
import { config } from '../config/index.js';

let medplumClient: MedplumClient | null = null;

/**
 * Get or create Medplum client instance
 */
export function getMedplumClient(): MedplumClient {
  if (!medplumClient) {
    medplumClient = new MedplumClient({
      baseUrl: config.medplum.baseUrl,
    });
  }
  return medplumClient;
}

/**
 * Authenticate with Medplum using client credentials
 */
export async function authenticateMedplum(): Promise<void> {
  const client = getMedplumClient();
  if (config.medplum.clientId && config.medplum.clientSecret) {
    await client.startClientLogin(config.medplum.clientId, config.medplum.clientSecret);
  }
}

/**
 * Create or update a Patient in Medplum
 */
export async function upsertPatient(patient: Patient): Promise<Patient> {
  const client = getMedplumClient();

  // Try to find existing patient by identifier
  if (patient.identifier && patient.identifier.length > 0) {
    const identifier = patient.identifier[0];
    const existing = await client.searchOne('Patient', {
      identifier: `${identifier.system}|${identifier.value}`,
    });

    if (existing) {
      // Update existing patient
      return client.updateResource({
        ...patient,
        id: existing.id,
      });
    }
  }

  // Create new patient
  return client.createResource(patient);
}

/**
 * Create or update an Encounter in Medplum
 */
export async function upsertEncounter(encounter: Encounter): Promise<Encounter> {
  const client = getMedplumClient();

  // Try to find existing encounter by identifier
  if (encounter.identifier && encounter.identifier.length > 0) {
    const identifier = encounter.identifier[0];
    const existing = await client.searchOne('Encounter', {
      identifier: `${identifier.system}|${identifier.value}`,
    });

    if (existing) {
      // Update existing encounter
      return client.updateResource({
        ...encounter,
        id: existing.id,
      });
    }
  }

  // Create new encounter
  return client.createResource(encounter);
}

/**
 * Batch upsert multiple resources using FHIR transaction bundle
 */
export async function batchUpsertResources(resources: Resource[]): Promise<Bundle> {
  const client = getMedplumClient();

  const bundle: Bundle = {
    resourceType: 'Bundle',
    type: 'transaction',
    entry: resources.map(resource => ({
      resource,
      request: {
        method: resource.id ? 'PUT' : 'POST',
        url: resource.id
          ? `${resource.resourceType}/${resource.id}`
          : resource.resourceType,
      },
    })),
  };

  return client.executeBatch(bundle);
}

/**
 * Search for patients with optional filters
 */
export async function searchPatients(params?: {
  name?: string;
  identifier?: string;
  _count?: number;
  _offset?: number;
}): Promise<Patient[]> {
  const client = getMedplumClient();
  return client.searchResources('Patient', params || {});
}

/**
 * Search for encounters with optional filters
 */
export async function searchEncounters(params?: {
  patient?: string;
  status?: string;
  date?: string;
  _count?: number;
  _offset?: number;
}): Promise<Encounter[]> {
  const client = getMedplumClient();
  return client.searchResources('Encounter', params || {});
}

/**
 * Get a specific resource by ID
 */
export async function getResource<T extends Resource>(
  resourceType: string,
  id: string
): Promise<T | undefined> {
  const client = getMedplumClient();
  try {
    return await client.readResource(resourceType as T['resourceType'], id) as T;
  } catch {
    return undefined;
  }
}

/**
 * Create an AuditEvent for tracking sync operations
 */
export async function createSyncAuditEvent(params: {
  action: 'C' | 'R' | 'U' | 'D'; // Create, Read, Update, Delete
  outcome: '0' | '4' | '8' | '12'; // Success, Minor failure, Serious failure, Major failure
  source: string;
  description: string;
  entityType?: string;
  entityId?: string;
}): Promise<void> {
  const client = getMedplumClient();

  await client.createResource({
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
    entity: params.entityType && params.entityId
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
