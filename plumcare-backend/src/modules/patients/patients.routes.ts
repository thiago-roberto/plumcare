import { Router } from 'express';
import { patientsController } from './patients.controller.js';
import { validateRequest } from '../../core/middleware/index.js';
import { SystemParamDto, PatientParamDto, PaginationQueryDto } from './patients.dto.js';

const router = Router();

/**
 * GET /api/:system/patients
 * List patients from Medplum filtered by EHR source
 */
router.get(
  '/:system/patients',
  validateRequest({ params: SystemParamDto, query: PaginationQueryDto }),
  patientsController.list.bind(patientsController)
);

/**
 * GET /api/:system/patients/:id
 * Get a specific patient from Medplum
 */
router.get(
  '/:system/patients/:id',
  validateRequest({ params: PatientParamDto }),
  patientsController.getById.bind(patientsController)
);

/**
 * GET /api/:system/patients/:id/observations
 * Get observations for a patient from Medplum
 */
router.get(
  '/:system/patients/:id/observations',
  validateRequest({ params: PatientParamDto, query: PaginationQueryDto }),
  patientsController.getObservations.bind(patientsController)
);

/**
 * GET /api/:system/patients/:id/conditions
 * Get conditions for a patient from Medplum
 */
router.get(
  '/:system/patients/:id/conditions',
  validateRequest({ params: PatientParamDto, query: PaginationQueryDto }),
  patientsController.getConditions.bind(patientsController)
);

/**
 * GET /api/:system/patients/:id/diagnostic-reports
 * Get diagnostic reports for a patient from Medplum
 */
router.get(
  '/:system/patients/:id/diagnostic-reports',
  validateRequest({ params: PatientParamDto, query: PaginationQueryDto }),
  patientsController.getDiagnosticReports.bind(patientsController)
);

export { router as patientsRouter };
