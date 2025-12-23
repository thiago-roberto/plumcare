import type { Resource } from '@medplum/fhirtypes';
import { batchUpsertResources, authenticateMedplum } from '../../shared/medplum/index.js';
import {
  generateCompleteAthenaPatient,
  generateCompleteElationPatient,
  generateCompleteNextGenPatient,
} from '../../generators/index.js';
import {
  parseAthenaJsonToFhir,
  parseElationJsonToFhir,
  parseNextgenJsonToFhir,
} from '../../transforms/index.js';
import type { MockDataRequest, EhrSummary, MockDataSyncResponse } from './mock-data.types.js';

/**
 * Mock Data Service
 *
 * Generates random patient data for all 3 EHRs, transforms to FHIR R4,
 * and stores in Medplum.
 */

/**
 * Count resources by type
 */
function countResources(resources: Resource[]): EhrSummary {
  return {
    patients: resources.filter(r => r.resourceType === 'Patient').length,
    encounters: resources.filter(r => r.resourceType === 'Encounter').length,
    observations: resources.filter(r => r.resourceType === 'Observation').length,
    conditions: resources.filter(r => r.resourceType === 'Condition').length,
    allergies: resources.filter(r => r.resourceType === 'AllergyIntolerance').length,
    medications: resources.filter(r => r.resourceType === 'MedicationStatement').length,
    diagnosticReports: resources.filter(r => r.resourceType === 'DiagnosticReport').length,
  };
}

/**
 * Sync mock data to Medplum
 */
export async function syncMockData(params: MockDataRequest = {}): Promise<MockDataSyncResponse> {
  const { patientCount = 3, includeAllData = true } = params;

  // Authenticate with Medplum
  await authenticateMedplum();

  const allResources: Resource[] = [];
  const athenaResources: Resource[] = [];
  const elationResources: Resource[] = [];
  const nextgenResources: Resource[] = [];
  const errors: string[] = [];

  // Generate and transform Athena patients
  for (let i = 0; i < patientCount; i++) {
    try {
      const athenaData = generateCompleteAthenaPatient();
      const bundle = parseAthenaJsonToFhir(
        includeAllData
          ? athenaData
          : { patient: athenaData.patient }
      );
      const resources = (bundle.entry || []).map(e => e.resource).filter(Boolean) as Resource[];
      athenaResources.push(...resources);
      allResources.push(...resources);
    } catch (err) {
      errors.push(`Athena patient ${i + 1}: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }

  // Generate and transform Elation patients
  for (let i = 0; i < patientCount; i++) {
    try {
      const elationData = generateCompleteElationPatient();
      const bundle = parseElationJsonToFhir(
        includeAllData
          ? elationData
          : { patient: elationData.patient }
      );
      const resources = (bundle.entry || []).map(e => e.resource).filter(Boolean) as Resource[];
      elationResources.push(...resources);
      allResources.push(...resources);
    } catch (err) {
      errors.push(`Elation patient ${i + 1}: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }

  // Generate and transform NextGen patients
  for (let i = 0; i < patientCount; i++) {
    try {
      const nextgenData = generateCompleteNextGenPatient();
      const bundle = parseNextgenJsonToFhir(
        includeAllData
          ? nextgenData
          : { patient: nextgenData.patient }
      );
      const resources = (bundle.entry || []).map(e => e.resource).filter(Boolean) as Resource[];
      nextgenResources.push(...resources);
      allResources.push(...resources);
    } catch (err) {
      errors.push(`NextGen patient ${i + 1}: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }

  // Batch upsert all resources to Medplum
  if (allResources.length > 0) {
    try {
      await batchUpsertResources(allResources);
    } catch (err) {
      errors.push(`Medplum batch upsert: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }

  return {
    success: errors.length === 0,
    summary: {
      athena: countResources(athenaResources),
      elation: countResources(elationResources),
      nextgen: countResources(nextgenResources),
    },
    totalResources: allResources.length,
    errors: errors.length > 0 ? errors : undefined,
  };
}
