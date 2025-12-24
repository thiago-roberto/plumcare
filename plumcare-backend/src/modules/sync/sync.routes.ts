import { Router } from 'express';
import { container } from '../../core/container.js';
import { TYPES } from '../../core/di-tokens.js';
import { SyncController } from './sync.controller.js';
import { asyncHandler } from '../../shared/utils/async-handlers.js';

const router = Router();

const controller = container.get<SyncController>(TYPES.SyncController);

router.get('/events', asyncHandler(controller.getEvents.bind(controller)));
router.post('/mock-data', asyncHandler(controller.syncMockData.bind(controller)));
router.post('/:system', asyncHandler(controller.triggerSync.bind(controller)));

export default router;
