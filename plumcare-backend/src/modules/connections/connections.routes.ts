import { Router } from 'express';
import { connectionsController } from './connections.controller.js';
import { validateRequest } from '../../core/middleware/index.js';
import { ConnectionSystemParamDto } from './connections.dto.js';

const router = Router();

/**
 * GET /api/connections
 * List all EHR connections with their status
 */
router.get('/', connectionsController.list.bind(connectionsController));

/**
 * GET /api/connections/:system
 * Get connection status for a specific EHR system
 */
router.get(
  '/:system',
  validateRequest({ params: ConnectionSystemParamDto }),
  connectionsController.getBySystem.bind(connectionsController)
);

/**
 * POST /api/connections/:system/test
 * Test connection to an EHR system
 */
router.post(
  '/:system/test',
  validateRequest({ params: ConnectionSystemParamDto }),
  connectionsController.test.bind(connectionsController)
);

export { router as connectionsRouter };
