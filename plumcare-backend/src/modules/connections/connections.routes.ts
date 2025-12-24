import { Router } from 'express';
import { container } from '../../core/container.js';
import { TYPES } from '../../core/di-tokens.js';
import { ConnectionsController } from './connections.controller.js';
import { asyncHandler } from '../../shared/utils/async-handlers.js';

const router = Router();

const controller = container.get<ConnectionsController>(TYPES.ConnectionsController);

router.get('/', asyncHandler(controller.getAll.bind(controller)));
router.get('/:system', asyncHandler(controller.getOne.bind(controller)));
router.post('/:system/test', asyncHandler(controller.test.bind(controller)));

export default router;
