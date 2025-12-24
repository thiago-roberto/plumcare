import { Router } from 'express';
import { container } from '../../core/container.js';
import { TYPES } from '../../core/di-tokens.js';
import { WebhooksController } from './webhooks.controller.js';
import { asyncHandler } from '../../shared/utils/async-handlers.js';

const router = Router();

const controller = container.get<WebhooksController>(TYPES.WebhooksController);

router.get('/events', asyncHandler(controller.getEvents.bind(controller)));
router.get('/unprocessed', asyncHandler(controller.getUnprocessed.bind(controller)));
router.post('/medplum', asyncHandler(controller.handleMedplumWebhook.bind(controller)));
router.post('/:id/reprocess', asyncHandler(controller.reprocess.bind(controller)));
router.post('/:id/mark-processed', asyncHandler(controller.markProcessed.bind(controller)));

export default router;
