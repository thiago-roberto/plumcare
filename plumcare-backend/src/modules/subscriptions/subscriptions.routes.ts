import { Router } from 'express';
import { container } from '../../core/container.js';
import { TYPES } from '../../core/di-tokens.js';
import { SubscriptionsController } from './subscriptions.controller.js';
import { asyncHandler } from '../../shared/utils/async-handlers.js';

const router = Router();

const controller = container.get<SubscriptionsController>(TYPES.SubscriptionsController);

router.get('/', asyncHandler(controller.getAll.bind(controller)));
router.get('/:id', asyncHandler(controller.getOne.bind(controller)));
router.post('/', asyncHandler(controller.create.bind(controller)));
router.post('/defaults', asyncHandler(controller.createDefaults.bind(controller)));
router.post('/:id/pause', asyncHandler(controller.pause.bind(controller)));
router.post('/:id/resume', asyncHandler(controller.resume.bind(controller)));
router.delete('/:id', asyncHandler(controller.delete.bind(controller)));

export default router;
