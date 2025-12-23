import { Router } from 'express';
import { validateRequest } from '../../core/middleware/index.js';
import { botsController } from './bots.controller.js';
import {
  CreateBotDto,
  CreateBotFromTemplateDto,
  UpdateBotDto,
  UpdateBotCodeDto,
  ExecuteBotDto,
  CreateBotSubscriptionDto,
  BotListQueryDto,
  BotExecutionsQueryDto,
  BotIdParamDto,
  TemplateKeyParamDto,
} from './bots.dto.js';

const router = Router();

// List routes (must come before :id routes)
router.get(
  '/',
  validateRequest({ query: BotListQueryDto }),
  botsController.list.bind(botsController)
);

router.get(
  '/templates',
  botsController.getTemplates.bind(botsController)
);

router.get(
  '/templates/:key',
  validateRequest({ params: TemplateKeyParamDto }),
  botsController.getTemplateByKey.bind(botsController)
);

router.get(
  '/executions',
  validateRequest({ query: BotExecutionsQueryDto }),
  botsController.getAllExecutions.bind(botsController)
);

// CRUD routes
router.get(
  '/:id',
  validateRequest({ params: BotIdParamDto }),
  botsController.getById.bind(botsController)
);

router.post(
  '/',
  validateRequest({ body: CreateBotDto }),
  botsController.create.bind(botsController)
);

router.post(
  '/from-template',
  validateRequest({ body: CreateBotFromTemplateDto }),
  botsController.createFromTemplate.bind(botsController)
);

router.put(
  '/:id',
  validateRequest({ params: BotIdParamDto, body: UpdateBotDto }),
  botsController.update.bind(botsController)
);

router.put(
  '/:id/code',
  validateRequest({ params: BotIdParamDto, body: UpdateBotCodeDto }),
  botsController.updateCode.bind(botsController)
);

router.delete(
  '/:id',
  validateRequest({ params: BotIdParamDto }),
  botsController.delete.bind(botsController)
);

// Action routes
router.post(
  '/:id/execute',
  validateRequest({ params: BotIdParamDto, body: ExecuteBotDto }),
  botsController.execute.bind(botsController)
);

router.get(
  '/:id/executions',
  validateRequest({ params: BotIdParamDto, query: BotExecutionsQueryDto }),
  botsController.getExecutions.bind(botsController)
);

router.post(
  '/:id/subscribe',
  validateRequest({ params: BotIdParamDto, body: CreateBotSubscriptionDto }),
  botsController.createSubscription.bind(botsController)
);

export { router as botsRouter };
