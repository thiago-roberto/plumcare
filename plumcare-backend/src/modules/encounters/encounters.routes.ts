import { Router } from 'express';
import { encountersController } from './encounters.controller.js';
import { validateRequest } from '../../core/middleware/index.js';
import {
  SystemParamDto,
  EncounterParamDto,
  PatientEncountersParamDto,
  PaginationQueryDto,
} from './encounters.dto.js';

const router = Router();

/**
 * GET /api/:system/encounters
 * List encounters from Medplum filtered by EHR source
 */
router.get(
  '/:system/encounters',
  validateRequest({ params: SystemParamDto, query: PaginationQueryDto }),
  encountersController.list.bind(encountersController)
);

/**
 * GET /api/:system/encounters/:id
 * Get a specific encounter from Medplum
 */
router.get(
  '/:system/encounters/:id',
  validateRequest({ params: EncounterParamDto }),
  encountersController.getById.bind(encountersController)
);

/**
 * GET /api/:system/patients/:patientId/encounters
 * Get encounters for a specific patient from Medplum
 */
router.get(
  '/:system/patients/:patientId/encounters',
  validateRequest({ params: PatientEncountersParamDto, query: PaginationQueryDto }),
  encountersController.getByPatient.bind(encountersController)
);

export { router as encountersRouter };
