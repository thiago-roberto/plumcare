import { Router } from 'express';
import { container } from '../../core/container.js';
import { TYPES } from '../../core/di-tokens.js';
import { EncountersController } from './encounters.controller.js';
import { asyncHandler } from '../../shared/utils/async-handlers.js';

const router = Router();

const controller = container.get<EncountersController>(TYPES.EncountersController);

router.get('/:system/encounters', asyncHandler(controller.getAll.bind(controller)));
router.get('/:system/encounters/:id', asyncHandler(controller.getOne.bind(controller)));
router.get('/:system/patients/:patientId/encounters', asyncHandler(controller.getByPatient.bind(controller)));

export default router;
