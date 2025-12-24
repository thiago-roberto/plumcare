import { Router } from 'express';
import { container } from '../../core/container.js';
import { TYPES } from '../../core/di-tokens.js';
import { PatientsController } from './patients.controller.js';
import { asyncHandler } from '../../shared/utils/async-handlers.js';

const router = Router();

const controller = container.get<PatientsController>(TYPES.PatientsController);

router.get('/:system/patients', asyncHandler(controller.getAll.bind(controller)));
router.get('/:system/patients/:id', asyncHandler(controller.getOne.bind(controller)));
router.get('/:system/patients/:id/observations', asyncHandler(controller.getObservations.bind(controller)));
router.get('/:system/patients/:id/conditions', asyncHandler(controller.getConditions.bind(controller)));
router.get('/:system/patients/:id/diagnostic-reports', asyncHandler(controller.getDiagnosticReports.bind(controller)));

export default router;
