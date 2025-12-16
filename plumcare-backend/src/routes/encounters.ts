import { Router } from 'express';
import type { EhrSystem } from '../types/index.js';
import { getProvider } from '../providers/base.provider.js';
import { transformToFhirEncounter } from '../services/transform.service.js';
import { config } from '../config/index.js';
import { AppError } from '../middleware/error.js';

const router = Router();

/**
 * GET /api/:system/encounters
 * List encounters from a specific EHR system
 */
router.get('/:system/encounters', async (req, res, next) => {
  try {
    const system = req.params.system as EhrSystem;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = parseInt(req.query.offset as string) || 0;
    const format = req.query.format as string || 'fhir'; // 'fhir' or 'native'

    if (!isValidSystem(system)) {
      throw new AppError(400, `Invalid EHR system: ${system}`, 'INVALID_SYSTEM');
    }

    const providerConfig = config[system] as { baseUrl: string; clientId: string; clientSecret: string };
    const provider = getProvider(system, providerConfig);

    const result = await provider.getEncounters({ limit, offset });

    // Transform to FHIR format if requested
    const data = format === 'native'
      ? result.data
      : result.data.map(transformToFhirEncounter);

    res.json({
      data,
      total: result.total,
      limit: result.limit,
      offset: result.offset,
      hasMore: result.hasMore,
      system,
      format,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/:system/encounters/:id
 * Get a specific encounter from an EHR system
 */
router.get('/:system/encounters/:id', async (req, res, next) => {
  try {
    const system = req.params.system as EhrSystem;
    const id = req.params.id;
    const format = req.query.format as string || 'fhir';

    if (!isValidSystem(system)) {
      throw new AppError(400, `Invalid EHR system: ${system}`, 'INVALID_SYSTEM');
    }

    const providerConfig = config[system] as { baseUrl: string; clientId: string; clientSecret: string };
    const provider = getProvider(system, providerConfig);

    const encounter = await provider.getEncounter(id);

    if (!encounter) {
      throw new AppError(404, `Encounter not found: ${id}`, 'NOT_FOUND');
    }

    const data = format === 'native' ? encounter : transformToFhirEncounter(encounter);

    res.json({
      data,
      system,
      format,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/:system/patients/:patientId/encounters
 * Get encounters for a specific patient
 */
router.get('/:system/patients/:patientId/encounters', async (req, res, next) => {
  try {
    const system = req.params.system as EhrSystem;
    const patientId = req.params.patientId;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = parseInt(req.query.offset as string) || 0;
    const format = req.query.format as string || 'fhir';

    if (!isValidSystem(system)) {
      throw new AppError(400, `Invalid EHR system: ${system}`, 'INVALID_SYSTEM');
    }

    const providerConfig = config[system] as { baseUrl: string; clientId: string; clientSecret: string };
    const provider = getProvider(system, providerConfig);

    const result = await provider.getEncountersByPatient(patientId, { limit, offset });

    const data = format === 'native'
      ? result.data
      : result.data.map(transformToFhirEncounter);

    res.json({
      data,
      total: result.total,
      limit: result.limit,
      offset: result.offset,
      hasMore: result.hasMore,
      system,
      patientId,
      format,
    });
  } catch (error) {
    next(error);
  }
});

// Helper function
function isValidSystem(system: string): system is EhrSystem {
  return ['athena', 'elation', 'nextgen'].includes(system);
}

export { router as encountersRouter };
