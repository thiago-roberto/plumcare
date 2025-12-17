import { Router } from 'express';
import type { EhrSystem } from '../types/index.js';
import { getMedplumClient } from '../services/medplum.service.js';
import { AppError } from '../middleware/error.js';
import type { Encounter } from '@medplum/fhirtypes';

const router = Router();

const EHR_SOURCE_SYSTEM = 'http://plumcare.io/ehr-source';

/**
 * GET /api/:system/encounters
 * List encounters from Medplum filtered by EHR source
 */
router.get('/:system/encounters', async (req, res, next) => {
  try {
    const system = req.params.system as EhrSystem;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = parseInt(req.query.offset as string) || 0;

    if (!isValidSystem(system)) {
      throw new AppError(400, `Invalid EHR system: ${system}`, 'INVALID_SYSTEM');
    }

    const client = getMedplumClient();

    // Query Medplum for encounters tagged with this EHR source
    const encounters = await client.searchResources('Encounter', {
      _tag: `${EHR_SOURCE_SYSTEM}|${system}`,
      _count: limit.toString(),
      _offset: offset.toString(),
      _sort: '-_lastUpdated',
    }) as Encounter[];

    // Get total count
    const bundle = await client.search('Encounter', {
      _tag: `${EHR_SOURCE_SYSTEM}|${system}`,
      _summary: 'count',
    });
    const total = bundle.total || encounters.length;

    res.json({
      data: encounters,
      total,
      limit,
      offset,
      hasMore: offset + encounters.length < total,
      system,
      source: 'medplum',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/:system/encounters/:id
 * Get a specific encounter from Medplum
 */
router.get('/:system/encounters/:id', async (req, res, next) => {
  try {
    const system = req.params.system as EhrSystem;
    const id = req.params.id;

    if (!isValidSystem(system)) {
      throw new AppError(400, `Invalid EHR system: ${system}`, 'INVALID_SYSTEM');
    }

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
      throw new AppError(404, `Encounter not found: ${id}`, 'NOT_FOUND');
    }

    // Verify the encounter belongs to the requested EHR system
    const hasCorrectTag = encounter.meta?.tag?.some(
      t => t.system === EHR_SOURCE_SYSTEM && t.code === system
    );

    if (!hasCorrectTag) {
      throw new AppError(404, `Encounter not found in ${system}: ${id}`, 'NOT_FOUND');
    }

    res.json({
      data: encounter,
      system,
      source: 'medplum',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/:system/patients/:patientId/encounters
 * Get encounters for a specific patient from Medplum
 */
router.get('/:system/patients/:patientId/encounters', async (req, res, next) => {
  try {
    const system = req.params.system as EhrSystem;
    const patientId = req.params.patientId;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = parseInt(req.query.offset as string) || 0;

    if (!isValidSystem(system)) {
      throw new AppError(400, `Invalid EHR system: ${system}`, 'INVALID_SYSTEM');
    }

    const client = getMedplumClient();

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

    res.json({
      data: encounters,
      total,
      limit,
      offset,
      hasMore: offset + encounters.length < total,
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

export { router as encountersRouter };
