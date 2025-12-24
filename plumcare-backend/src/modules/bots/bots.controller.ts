import { injectable, inject } from 'inversify';
import type { Request, Response } from 'express';
import { Controller } from '../../core/controller.js';
import { TYPES } from '../../core/di-tokens.js';
import { NotFoundError } from '../../core/errors.js';
import { BotsService, type BotConfig } from './bots.service.js';

@injectable()
export class BotsController extends Controller {
  constructor(
    @inject(TYPES.BotsService) private botsService: BotsService
  ) {
    super();
  }

  async getAll(_req: Request, res: Response): Promise<Response> {
    const bots = await this.botsService.getBots();
    return res.json({ data: bots });
  }

  async getOne(req: Request, res: Response): Promise<Response> {
    const bot = await this.botsService.getBot(req.params.id);
    return res.json({ data: bot });
  }

  async create(req: Request, res: Response): Promise<Response> {
    const config: BotConfig = req.body;
    const bot = await this.botsService.createBot(config);
    return res.status(201).json({ data: bot });
  }

  async delete(req: Request, res: Response): Promise<Response> {
    await this.botsService.deleteBot(req.params.id);
    return res.status(204).send();
  }

  async getTemplates(_req: Request, res: Response): Promise<Response> {
    const templates = this.botsService.getTemplates();
    return res.json({ data: templates });
  }

  async getTemplateCode(req: Request, res: Response): Promise<Response> {
    const code = this.botsService.getTemplateCode(req.params.key);
    if (!code) {
      throw new NotFoundError({ message: `Template ${req.params.key} not found` });
    }
    return res.json({ data: { code } });
  }

  async createFromTemplate(req: Request, res: Response): Promise<Response> {
    const { name, templateKey, description } = req.body;
    const bot = await this.botsService.createBotFromTemplate(name, templateKey, description);
    return res.status(201).json({ data: bot });
  }

  async execute(req: Request, res: Response): Promise<Response> {
    const { input } = req.body || {};
    const result = await this.botsService.executeBot(req.params.id, input);
    return res.json({ data: result });
  }

  async subscribe(req: Request, res: Response): Promise<Response> {
    const { criteria, interaction } = req.body;
    const subscription = await this.botsService.createBotSubscription(
      req.params.id,
      criteria,
      interaction
    );
    return res.status(201).json({ data: subscription });
  }

  async getExecutions(req: Request, res: Response): Promise<Response> {
    const botId = req.params.id;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
    const executions = await this.botsService.getBotExecutions(botId, limit);
    return res.json({ data: executions });
  }

  async getAllExecutions(req: Request, res: Response): Promise<Response> {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
    const executions = await this.botsService.getBotExecutions(undefined, limit);
    return res.json({ data: executions });
  }
}
