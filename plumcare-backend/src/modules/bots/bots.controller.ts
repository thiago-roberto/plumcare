import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../../core/middleware/index.js';
import * as botsService from './bots.service.js';
import type {
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

export class BotsController {
  /**
   * GET /api/bots
   * List all bots
   */
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const _query = req.query as unknown as BotListQueryDto;
      const bots = await botsService.getBots();

      res.json({
        success: true,
        data: bots,
        count: bots.length,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/bots/templates
   * Get available bot templates
   */
  async getTemplates(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const templates = botsService.getBotTemplates();
      res.json({
        success: true,
        data: templates,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/bots/templates/:key
   * Get a specific bot template code
   */
  async getTemplateByKey(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { key } = req.params as unknown as TemplateKeyParamDto;
      const template = botsService.getBotTemplateByKey(key);

      if (!template) {
        throw new AppError(404, 'Template not found', 'NOT_FOUND');
      }

      res.json({
        success: true,
        data: { key, code: template },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/bots/executions
   * Get recent bot executions across all bots
   */
  async getAllExecutions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = req.query as unknown as BotExecutionsQueryDto;
      const executions = await botsService.getBotExecutions(undefined, query.limit);

      res.json({
        success: true,
        data: executions,
        count: executions.length,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/bots/:id
   * Get a specific bot
   */
  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params as unknown as BotIdParamDto;
      const bot = await botsService.getBot(id);

      if (!bot) {
        throw new AppError(404, 'Bot not found', 'NOT_FOUND');
      }

      res.json({
        success: true,
        data: bot,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/bots
   * Create a new bot
   */
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const dto = req.body as CreateBotDto;
      const bot = await botsService.createBot({
        name: dto.name,
        description: dto.description,
        code: dto.code,
        runtimeVersion: dto.runtimeVersion,
      });

      res.status(201).json({
        success: true,
        data: bot,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/bots/from-template
   * Create a bot from a predefined template
   */
  async createFromTemplate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const dto = req.body as CreateBotFromTemplateDto;
      const template = botsService.getBotTemplateByKey(dto.templateKey);

      if (!template) {
        throw new AppError(400, `Invalid template key: ${dto.templateKey}`, 'INVALID_TEMPLATE');
      }

      const bot = await botsService.createBot({
        name: dto.name,
        description: dto.description || `Bot created from ${dto.templateKey} template`,
        code: template,
      });

      res.status(201).json({
        success: true,
        data: bot,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/bots/:id
   * Update a bot's metadata
   */
  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params as unknown as BotIdParamDto;
      const dto = req.body as UpdateBotDto;

      const bot = await botsService.updateBot(id, dto);

      res.json({
        success: true,
        data: bot,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/bots/:id/code
   * Update a bot's source code
   */
  async updateCode(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params as unknown as BotIdParamDto;
      const dto = req.body as UpdateBotCodeDto;

      await botsService.updateBotCode(id, dto.code);

      res.json({
        success: true,
        message: 'Bot code updated and deployed',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/bots/:id
   * Delete a bot
   */
  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params as unknown as BotIdParamDto;
      await botsService.deleteBot(id);

      res.json({
        success: true,
        message: 'Bot deleted',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/bots/:id/execute
   * Execute a bot manually
   */
  async execute(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params as unknown as BotIdParamDto;
      const dto = req.body as ExecuteBotDto;

      const result = await botsService.executeBot(id, dto.input || {});

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/bots/:id/executions
   * Get execution history for a specific bot
   */
  async getExecutions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params as unknown as BotIdParamDto;
      const query = req.query as unknown as BotExecutionsQueryDto;

      const executions = await botsService.getBotExecutions(id, query.limit);

      res.json({
        success: true,
        data: executions,
        count: executions.length,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/bots/:id/subscribe
   * Create a subscription that triggers this bot
   */
  async createSubscription(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params as unknown as BotIdParamDto;
      const dto = req.body as CreateBotSubscriptionDto;

      const subscription = await botsService.createBotSubscription(id, dto.criteria, dto.interaction);

      res.status(201).json({
        success: true,
        data: subscription,
      });
    } catch (error) {
      next(error);
    }
  }
}

// Export singleton instance
export const botsController = new BotsController();
