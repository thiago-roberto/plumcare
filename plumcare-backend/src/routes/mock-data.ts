import { Router } from 'express';
import { AppError } from '../middleware/error.js';
import { batchUpsertResources, authenticateMedplum } from '../services/medplum.service.js';
import {
  generateCompleteAthenaPatient,
  generateCompleteElationPatient,
  generateCompleteNextGenPatient,
} from '../generators/index.js';
import {
  parseAthenaJsonToFhir,
  parseElationJsonToFhir,
  parseNextgenJsonToFhir,
} from '../transforms/index.js';
import type { Resource } from '@medplum/fhirtypes';

const router = Router();

interface MockDataRequest {
  patientCount?: number;
  includeAllData?: boolean;
}

interface EhrSummary {
  patients: number;
  encounters: number;
  observations: number;
  conditions: number;
  allergies: number;
  medications: number;
  diagnosticReports: number;
}

interface SyncResponse {
  success: boolean;
  summary: {
    athena: EhrSummary;
    elation: EhrSummary;
    nextgen: EhrSummary;
  };
  totalResources: number;
  errors?: string[];
}

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
 * POST /api/sync/mock-data
 * Generate random patient data for all 3 EHRs, transform to FHIR R4, and store in Medplum
 */
router.post('/', async (req, res, next) => {
  try {
    const { patientCount = 3, includeAllData = true }: MockDataRequest = req.body || {};

    // Validate patient count
    if (patientCount < 1 || patientCount > 50) {
      throw new AppError(400, 'patientCount must be between 1 and 50', 'INVALID_PATIENT_COUNT');
    }

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

    const response: SyncResponse = {
      success: errors.length === 0,
      summary: {
        athena: countResources(athenaResources),
        elation: countResources(elationResources),
        nextgen: countResources(nextgenResources),
      },
      totalResources: allResources.length,
      errors: errors.length > 0 ? errors : undefined,
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

export { router as mockDataRouter };
