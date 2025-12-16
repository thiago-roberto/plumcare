import { Router } from 'express';
import type { EhrSystem } from '../types/index.js';
import { getProvider } from '../providers/base.provider.js';
import { transformToFhirPatient } from '../services/transform.service.js';
import { config } from '../config/index.js';
import { AppError } from '../middleware/error.js';

const router = Router();

/**
 * GET /api/:system/patients
 * List patients from a specific EHR system
 */
router.get('/:system/patients', async (req, res, next) => {
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

    const result = await provider.getPatients({ limit, offset });

    // Transform to FHIR format if requested
    const data = format === 'native'
      ? result.data
      : result.data.map(transformToFhirPatient);

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
 * GET /api/:system/patients/:id
 * Get a specific patient from an EHR system
 */
router.get('/:system/patients/:id', async (req, res, next) => {
  try {
    const system = req.params.system as EhrSystem;
    const id = req.params.id;
    const format = req.query.format as string || 'fhir';

    if (!isValidSystem(system)) {
      throw new AppError(400, `Invalid EHR system: ${system}`, 'INVALID_SYSTEM');
    }

    const providerConfig = config[system] as { baseUrl: string; clientId: string; clientSecret: string };
    const provider = getProvider(system, providerConfig);

    const patient = await provider.getPatient(id);

    if (!patient) {
      throw new AppError(404, `Patient not found: ${id}`, 'NOT_FOUND');
    }

    const data = format === 'native' ? patient : transformToFhirPatient(patient);

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
 * GET /api/:system/patients/:id/observations
 * Get observations for a patient
 */
router.get('/:system/patients/:id/observations', async (req, res, next) => {
  try {
    const system = req.params.system as EhrSystem;
    const patientId = req.params.id;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = parseInt(req.query.offset as string) || 0;

    if (!isValidSystem(system)) {
      throw new AppError(400, `Invalid EHR system: ${system}`, 'INVALID_SYSTEM');
    }

    const providerConfig = config[system] as { baseUrl: string; clientId: string; clientSecret: string };
    const provider = getProvider(system, providerConfig);

    const result = await provider.getObservations(patientId, { limit, offset });

    res.json({
      data: result.data,
      total: result.total,
      limit: result.limit,
      offset: result.offset,
      hasMore: result.hasMore,
      system,
      patientId,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/:system/patients/:id/conditions
 * Get conditions for a patient
 */
router.get('/:system/patients/:id/conditions', async (req, res, next) => {
  try {
    const system = req.params.system as EhrSystem;
    const patientId = req.params.id;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = parseInt(req.query.offset as string) || 0;

    if (!isValidSystem(system)) {
      throw new AppError(400, `Invalid EHR system: ${system}`, 'INVALID_SYSTEM');
    }

    const providerConfig = config[system] as { baseUrl: string; clientId: string; clientSecret: string };
    const provider = getProvider(system, providerConfig);

    const result = await provider.getConditions(patientId, { limit, offset });

    res.json({
      data: result.data,
      total: result.total,
      limit: result.limit,
      offset: result.offset,
      hasMore: result.hasMore,
      system,
      patientId,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/:system/patients/:id/diagnostic-reports
 * Get diagnostic reports for a patient
 */
router.get('/:system/patients/:id/diagnostic-reports', async (req, res, next) => {
  try {
    const system = req.params.system as EhrSystem;
    const patientId = req.params.id;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = parseInt(req.query.offset as string) || 0;

    if (!isValidSystem(system)) {
      throw new AppError(400, `Invalid EHR system: ${system}`, 'INVALID_SYSTEM');
    }

    const providerConfig = config[system] as { baseUrl: string; clientId: string; clientSecret: string };
    const provider = getProvider(system, providerConfig);

    const result = await provider.getDiagnosticReports(patientId, { limit, offset });

    res.json({
      data: result.data,
      total: result.total,
      limit: result.limit,
      offset: result.offset,
      hasMore: result.hasMore,
      system,
      patientId,
    });
  } catch (error) {
    next(error);
  }
});

// Helper function
function isValidSystem(system: string): system is EhrSystem {
  return ['athena', 'elation', 'nextgen'].includes(system);
}

export { router as patientsRouter };
