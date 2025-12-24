import { Router } from 'express';
import { container } from '../../core/container.js';
import { TYPES } from '../../core/di-tokens.js';
import { BotsController } from './bots.controller.js';
import { asyncHandler } from '../../shared/utils/async-handlers.js';

const router = Router();

const controller = container.get<BotsController>(TYPES.BotsController);

router.get('/', asyncHandler(controller.getAll.bind(controller)));
router.get('/templates', asyncHandler(controller.getTemplates.bind(controller)));
router.get('/templates/:key', asyncHandler(controller.getTemplateCode.bind(controller)));
router.get('/executions', asyncHandler(controller.getAllExecutions.bind(controller)));
router.get('/:id', asyncHandler(controller.getOne.bind(controller)));
router.get('/:id/executions', asyncHandler(controller.getExecutions.bind(controller)));
router.post('/', asyncHandler(controller.create.bind(controller)));
router.post('/from-template', asyncHandler(controller.createFromTemplate.bind(controller)));
router.post('/:id/execute', asyncHandler(controller.execute.bind(controller)));
router.post('/:id/subscribe', asyncHandler(controller.subscribe.bind(controller)));
router.delete('/:id', asyncHandler(controller.delete.bind(controller)));

export default router;
