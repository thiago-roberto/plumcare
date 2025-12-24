import { Router } from 'express';
import { container } from '../../core/container.js';
import { TYPES } from '../../core/di-tokens.js';
import { HealthController } from './health.controller.js';
import { asyncHandler } from '../../shared/utils/async-handlers.js';

const router = Router();

const controller = container.get<HealthController>(TYPES.HealthController);

router.get('/', asyncHandler(controller.check.bind(controller)));

export default router;
