import type { Request, Response, NextFunction } from 'express';
import {
  getEncounters,
  getEncounterById,
  getPatientEncounters,
} from './encounters.service.js';
import { AppError } from '../../core/middleware/index.js';
import type { EhrSystem } from './encounters.types.js';

/**
 * Encounters Controller
 *
 * Handles HTTP request/response for encounter-related operations.
 * Delegates business logic to the encounters service.
 */
export class EncountersController {
  /**
   * GET /api/:system/encounters
   * List encounters from Medplum filtered by EHR source
   */
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const system = req.params.system as EhrSystem;
      const limit = parseInt(req.query.limit as string) || 10;
      const offset = parseInt(req.query.offset as string) || 0;

      const result = await getEncounters(system, { limit, offset });

      res.json({
        ...result,
        system,
        source: 'medplum',
      });
    } catch (error) {
      if (error instanceof AppError) {
        next(error);
      } else {
        next(new AppError(500, 'Failed to fetch encounters', 'ENCOUNTERS_FETCH_ERROR', error));
      }
    }
  }

  /**
   * GET /api/:system/encounters/:id
   * Get a specific encounter from Medplum
   */
  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const system = req.params.system as EhrSystem;
      const id = req.params.id;

      const encounter = await getEncounterById(system, id);

      res.json({
        data: encounter,
        system,
        source: 'medplum',
      });
    } catch (error) {
      if (error instanceof AppError) {
        next(error);
      } else {
        next(new AppError(500, 'Failed to fetch encounter', 'ENCOUNTER_FETCH_ERROR', error));
      }
    }
  }

  /**
   * GET /api/:system/patients/:patientId/encounters
   * Get encounters for a specific patient from Medplum
   */
  async getByPatient(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const system = req.params.system as EhrSystem;
      const patientId = req.params.patientId;
      const limit = parseInt(req.query.limit as string) || 10;
      const offset = parseInt(req.query.offset as string) || 0;

      const result = await getPatientEncounters(system, patientId, { limit, offset });

      res.json({
        ...result,
        system,
        patientId,
        source: 'medplum',
      });
    } catch (error) {
      if (error instanceof AppError) {
        next(error);
      } else {
        next(new AppError(500, 'Failed to fetch patient encounters', 'PATIENT_ENCOUNTERS_FETCH_ERROR', error));
      }
    }
  }
}

export const encountersController = new EncountersController();
