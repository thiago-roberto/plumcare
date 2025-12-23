import type { Request, Response, NextFunction } from 'express';
import {
  getPatients,
  getPatientById,
  getPatientObservations,
  getPatientConditions,
  getPatientDiagnosticReports,
} from './patients.service.js';
import { AppError } from '../../core/middleware/index.js';
import type { EhrSystem } from './patients.types.js';

/**
 * Patients Controller
 *
 * Handles HTTP request/response for patient-related operations.
 * Delegates business logic to the patients service.
 */
export class PatientsController {
  /**
   * GET /api/:system/patients
   * List patients from Medplum filtered by EHR source
   */
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const system = req.params.system as EhrSystem;
      const limit = parseInt(req.query.limit as string) || 10;
      const offset = parseInt(req.query.offset as string) || 0;

      const result = await getPatients(system, { limit, offset });

      res.json({
        ...result,
        system,
        source: 'medplum',
      });
    } catch (error) {
      if (error instanceof AppError) {
        next(error);
      } else {
        next(new AppError(500, 'Failed to fetch patients', 'PATIENTS_FETCH_ERROR', error));
      }
    }
  }

  /**
   * GET /api/:system/patients/:id
   * Get a specific patient from Medplum
   */
  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const system = req.params.system as EhrSystem;
      const id = req.params.id;

      const patient = await getPatientById(system, id);

      res.json({
        data: patient,
        system,
        source: 'medplum',
      });
    } catch (error) {
      if (error instanceof AppError) {
        next(error);
      } else {
        next(new AppError(500, 'Failed to fetch patient', 'PATIENT_FETCH_ERROR', error));
      }
    }
  }

  /**
   * GET /api/:system/patients/:id/observations
   * Get observations for a patient from Medplum
   */
  async getObservations(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const system = req.params.system as EhrSystem;
      const patientId = req.params.id;
      const limit = parseInt(req.query.limit as string) || 10;
      const offset = parseInt(req.query.offset as string) || 0;

      const result = await getPatientObservations(system, patientId, { limit, offset });

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
        next(new AppError(500, 'Failed to fetch observations', 'OBSERVATIONS_FETCH_ERROR', error));
      }
    }
  }

  /**
   * GET /api/:system/patients/:id/conditions
   * Get conditions for a patient from Medplum
   */
  async getConditions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const system = req.params.system as EhrSystem;
      const patientId = req.params.id;
      const limit = parseInt(req.query.limit as string) || 10;
      const offset = parseInt(req.query.offset as string) || 0;

      const result = await getPatientConditions(system, patientId, { limit, offset });

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
        next(new AppError(500, 'Failed to fetch conditions', 'CONDITIONS_FETCH_ERROR', error));
      }
    }
  }

  /**
   * GET /api/:system/patients/:id/diagnostic-reports
   * Get diagnostic reports for a patient from Medplum
   */
  async getDiagnosticReports(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const system = req.params.system as EhrSystem;
      const patientId = req.params.id;
      const limit = parseInt(req.query.limit as string) || 10;
      const offset = parseInt(req.query.offset as string) || 0;

      const result = await getPatientDiagnosticReports(system, patientId, { limit, offset });

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
        next(new AppError(500, 'Failed to fetch diagnostic reports', 'DIAGNOSTIC_REPORTS_FETCH_ERROR', error));
      }
    }
  }
}

export const patientsController = new PatientsController();
