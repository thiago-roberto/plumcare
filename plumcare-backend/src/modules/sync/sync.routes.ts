import { Router } from 'express';
import { syncController } from './sync.controller.js';
import { validateRequest } from '../../core/middleware/index.js';
import { SyncSystemParamDto, SyncEventsQueryDto } from './sync.dto.js';

const router = Router();

/**
 * GET /api/sync/events
 * Get recent sync events across all systems
 * Note: This must be defined before /:system to avoid conflicts
 */
router.get(
  '/events',
  validateRequest({ query: SyncEventsQueryDto }),
  syncController.getEvents.bind(syncController)
);

/**
 * POST /api/sync/all
 * Trigger sync for all connected EHR systems
 * Note: This must be defined before /:system to avoid conflicts
 */
router.post('/all', syncController.triggerSyncAll.bind(syncController));

/**
 * POST /api/sync/:system
 * Trigger a sync for a specific EHR system
 */
router.post(
  '/:system',
  validateRequest({ params: SyncSystemParamDto }),
  syncController.triggerSync.bind(syncController)
);

export { router as syncRouter };
