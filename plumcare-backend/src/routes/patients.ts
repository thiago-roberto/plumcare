import { Router } from 'express';
import type { EhrSystem } from '../types/index.js';
import { getMedplumClient } from '../services/medplum.service.js';
import { AppError } from '../middleware/error.js';
import type { Patient, Observation, Condition, DiagnosticReport } from '@medplum/fhirtypes';

const router = Router();

const EHR_SOURCE_SYSTEM = 'http://plumcare.io/ehr-source';

/**
 * GET /api/:system/patients
 * List patients from Medplum filtered by EHR source
 */
router.get('/:system/patients', async (req, res, next) => {
  try {
    const system = req.params.system as EhrSystem;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = parseInt(req.query.offset as string) || 0;

    if (!isValidSystem(system)) {
      throw new AppError(400, `Invalid EHR system: ${system}`, 'INVALID_SYSTEM');
    }

    const client = getMedplumClient();

    // Query Medplum for patients tagged with this EHR source
    const patients = await client.searchResources('Patient', {
      _tag: `${EHR_SOURCE_SYSTEM}|${system}`,
      _count: limit.toString(),
      _offset: offset.toString(),
      _sort: '-_lastUpdated',
    });

    // Get total count
    const bundle = await client.search('Patient', {
      _tag: `${EHR_SOURCE_SYSTEM}|${system}`,
      _summary: 'count',
    });
    const total = bundle.total || patients.length;

    res.json({
      data: patients,
      total,
      limit,
      offset,
      hasMore: offset + patients.length < total,
      system,
      source: 'medplum',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/:system/patients/:id
 * Get a specific patient from Medplum
 */
router.get('/:system/patients/:id', async (req, res, next) => {
  try {
    const system = req.params.system as EhrSystem;
    const id = req.params.id;

    if (!isValidSystem(system)) {
      throw new AppError(400, `Invalid EHR system: ${system}`, 'INVALID_SYSTEM');
    }

    const client = getMedplumClient();

    let patient: Patient | undefined;

    // Try to get by ID first
    try {
      patient = await client.readResource('Patient', id);
    } catch {
      // If not found by ID, search by identifier
      const patients = await client.searchResources('Patient', {
        _tag: `${EHR_SOURCE_SYSTEM}|${system}`,
        identifier: id,
      });
      patient = patients[0];
    }

    if (!patient) {
      throw new AppError(404, `Patient not found: ${id}`, 'NOT_FOUND');
    }

    // Verify the patient belongs to the requested EHR system
    const hasCorrectTag = patient.meta?.tag?.some(
      t => t.system === EHR_SOURCE_SYSTEM && t.code === system
    );

    if (!hasCorrectTag) {
      throw new AppError(404, `Patient not found in ${system}: ${id}`, 'NOT_FOUND');
    }

    res.json({
      data: patient,
      system,
      source: 'medplum',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/:system/patients/:id/observations
 * Get observations for a patient from Medplum
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

    const client = getMedplumClient();

    const observations = await client.searchResources('Observation', {
      _tag: `${EHR_SOURCE_SYSTEM}|${system}`,
      subject: `Patient/${patientId}`,
      _count: limit.toString(),
      _offset: offset.toString(),
      _sort: '-_lastUpdated',
    }) as Observation[];

    const bundle = await client.search('Observation', {
      _tag: `${EHR_SOURCE_SYSTEM}|${system}`,
      subject: `Patient/${patientId}`,
      _summary: 'count',
    });
    const total = bundle.total || observations.length;

    res.json({
      data: observations,
      total,
      limit,
      offset,
      hasMore: offset + observations.length < total,
      system,
      patientId,
      source: 'medplum',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/:system/patients/:id/conditions
 * Get conditions for a patient from Medplum
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

    const client = getMedplumClient();

    const conditions = await client.searchResources('Condition', {
      _tag: `${EHR_SOURCE_SYSTEM}|${system}`,
      subject: `Patient/${patientId}`,
      _count: limit.toString(),
      _offset: offset.toString(),
      _sort: '-_lastUpdated',
    }) as Condition[];

    const bundle = await client.search('Condition', {
      _tag: `${EHR_SOURCE_SYSTEM}|${system}`,
      subject: `Patient/${patientId}`,
      _summary: 'count',
    });
    const total = bundle.total || conditions.length;

    res.json({
      data: conditions,
      total,
      limit,
      offset,
      hasMore: offset + conditions.length < total,
      system,
      patientId,
      source: 'medplum',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/:system/patients/:id/diagnostic-reports
 * Get diagnostic reports for a patient from Medplum
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

    const client = getMedplumClient();

    const reports = await client.searchResources('DiagnosticReport', {
      _tag: `${EHR_SOURCE_SYSTEM}|${system}`,
      subject: `Patient/${patientId}`,
      _count: limit.toString(),
      _offset: offset.toString(),
      _sort: '-_lastUpdated',
    }) as DiagnosticReport[];

    const bundle = await client.search('DiagnosticReport', {
      _tag: `${EHR_SOURCE_SYSTEM}|${system}`,
      subject: `Patient/${patientId}`,
      _summary: 'count',
    });
    const total = bundle.total || reports.length;

    res.json({
      data: reports,
      total,
      limit,
      offset,
      hasMore: offset + reports.length < total,
      system,
      patientId,
      source: 'medplum',
    });
  } catch (error) {
    next(error);
  }
});

// Helper function
function isValidSystem(system: string): system is EhrSystem {
  return ['athena', 'elation', 'nextgen', 'medplum'].includes(system);
}

export { router as patientsRouter };
