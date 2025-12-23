import { Router } from 'express';
import {
  createBot,
  getBots,
  getBot,
  updateBot,
  updateBotCode,
  deleteBot,
  executeBot,
  getBotExecutions,
  createBotSubscription,
  getBotTemplates,
  BOT_TEMPLATES,
  type BotConfig,
} from '../services/bot.service.js';

const router = Router();

/**
 * GET /api/bots
 * List all bots
 */
router.get('/', async (_req, res) => {
  try {
    const bots = await getBots();
    res.json({
      success: true,
      data: bots,
      count: bots.length,
    });
  } catch (error) {
    console.error('Error fetching bots:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch bots',
    });
  }
});

/**
 * GET /api/bots/templates
 * Get available bot templates
 */
router.get('/templates', async (_req, res) => {
  try {
    const templates = getBotTemplates();
    res.json({
      success: true,
      data: templates,
    });
  } catch (error) {
    console.error('Error fetching bot templates:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch bot templates',
    });
  }
});

/**
 * GET /api/bots/templates/:key
 * Get a specific bot template code
 */
router.get('/templates/:key', async (req, res) => {
  try {
    const key = req.params.key as keyof typeof BOT_TEMPLATES;
    const template = BOT_TEMPLATES[key];

    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found',
      });
    }

    res.json({
      success: true,
      data: {
        key,
        code: template,
      },
    });
  } catch (error) {
    console.error('Error fetching bot template:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch bot template',
    });
  }
});

/**
 * POST /api/bots
 * Create a new bot
 *
 * Body: {
 *   name: string,
 *   description?: string,
 *   code: string,
 *   runtimeVersion?: 'awslambda' | 'vmcontext'
 * }
 */
router.post('/', async (req, res) => {
  try {
    const config: BotConfig = req.body;

    if (!config.name || !config.code) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: name and code',
      });
    }

    const bot = await createBot(config);
    res.status(201).json({
      success: true,
      data: bot,
    });
  } catch (error) {
    console.error('Error creating bot:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create bot',
    });
  }
});

/**
 * POST /api/bots/from-template
 * Create a bot from a predefined template
 *
 * Body: {
 *   name: string,
 *   templateKey: 'welcomeEmail' | 'labResultAlert' | 'appointmentReminder' | 'dataValidation' | 'auditLogger',
 *   description?: string
 * }
 */
router.post('/from-template', async (req, res) => {
  try {
    const { name, templateKey, description } = req.body;

    if (!name || !templateKey) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: name and templateKey',
      });
    }

    const template = BOT_TEMPLATES[templateKey as keyof typeof BOT_TEMPLATES];
    if (!template) {
      return res.status(400).json({
        success: false,
        error: `Invalid template key: ${templateKey}`,
        availableTemplates: Object.keys(BOT_TEMPLATES),
      });
    }

    const bot = await createBot({
      name,
      description: description || `Bot created from ${templateKey} template`,
      code: template,
    });

    res.status(201).json({
      success: true,
      data: bot,
    });
  } catch (error) {
    console.error('Error creating bot from template:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create bot from template',
    });
  }
});

/**
 * GET /api/bots/executions
 * Get recent bot executions across all bots
 */
router.get('/executions', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const executions = getBotExecutions(undefined, limit);
    res.json({
      success: true,
      data: executions,
      count: executions.length,
    });
  } catch (error) {
    console.error('Error fetching bot executions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch bot executions',
    });
  }
});

/**
 * GET /api/bots/:id
 * Get a specific bot
 */
router.get('/:id', async (req, res) => {
  try {
    const bot = await getBot(req.params.id);

    if (!bot) {
      return res.status(404).json({
        success: false,
        error: 'Bot not found',
      });
    }

    res.json({
      success: true,
      data: bot,
    });
  } catch (error) {
    console.error('Error fetching bot:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch bot',
    });
  }
});

/**
 * PUT /api/bots/:id
 * Update a bot's metadata
 */
router.put('/:id', async (req, res) => {
  try {
    const bot = await updateBot(req.params.id, req.body);
    res.json({
      success: true,
      data: bot,
    });
  } catch (error) {
    console.error('Error updating bot:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update bot',
    });
  }
});

/**
 * PUT /api/bots/:id/code
 * Update a bot's source code
 *
 * Body: {
 *   code: string
 * }
 */
router.put('/:id/code', async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: code',
      });
    }

    await updateBotCode(req.params.id, code);
    res.json({
      success: true,
      message: 'Bot code updated and deployed',
    });
  } catch (error) {
    console.error('Error updating bot code:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update bot code',
    });
  }
});

/**
 * DELETE /api/bots/:id
 * Delete a bot
 */
router.delete('/:id', async (req, res) => {
  try {
    await deleteBot(req.params.id);
    res.json({
      success: true,
      message: 'Bot deleted',
    });
  } catch (error) {
    console.error('Error deleting bot:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete bot',
    });
  }
});

/**
 * POST /api/bots/:id/execute
 * Execute a bot manually
 *
 * Body: {
 *   input: any (the data to pass to the bot)
 * }
 */
router.post('/:id/execute', async (req, res) => {
  try {
    const { input } = req.body;

    const result = await executeBot(req.params.id, input || {});
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error executing bot:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to execute bot',
    });
  }
});

/**
 * GET /api/bots/:id/executions
 * Get execution history for a specific bot
 */
router.get('/:id/executions', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const executions = getBotExecutions(req.params.id, limit);
    res.json({
      success: true,
      data: executions,
      count: executions.length,
    });
  } catch (error) {
    console.error('Error fetching bot executions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch bot executions',
    });
  }
});

/**
 * POST /api/bots/:id/subscribe
 * Create a subscription that triggers this bot
 *
 * Body: {
 *   criteria: string (e.g., 'Patient', 'Encounter'),
 *   interaction?: 'create' | 'update' | 'delete'
 * }
 */
router.post('/:id/subscribe', async (req, res) => {
  try {
    const { criteria, interaction } = req.body;

    if (!criteria) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: criteria',
      });
    }

    const subscription = await createBotSubscription(req.params.id, criteria, interaction);
    res.status(201).json({
      success: true,
      data: subscription,
    });
  } catch (error) {
    console.error('Error creating bot subscription:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create bot subscription',
    });
  }
});

export { router as botsRouter };
