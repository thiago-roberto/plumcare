import { injectable, inject } from 'inversify';
import type { Repository } from 'typeorm';
import type { Bot, Subscription } from '@medplum/fhirtypes';
import { TYPES } from '../../core/di-tokens.js';
import { MedplumService } from '../medplum/medplum.service.js';
import { ConfigService } from '../config/config.service.js';
import { NotFoundError } from '../../core/errors.js';
import { BotExecution } from '../../database/entities/bot-execution.entity.js';

export interface BotConfig {
  name: string;
  description?: string;
  code: string;
  runtimeVersion?: 'awslambda' | 'vmcontext';
}

export interface BotTemplate {
  name: string;
  description: string;
  key: string;
  code: string;
}

const BOT_TEMPLATES: BotTemplate[] = [
  {
    key: 'patient-welcome',
    name: 'Patient Welcome Email',
    description: 'Sends a welcome email when a new patient is created',
    code: `import { BotEvent, MedplumClient } from '@medplum/core';
import { Patient } from '@medplum/fhirtypes';

export async function handler(medplum: MedplumClient, event: BotEvent): Promise<any> {
  const patient = event.input as Patient;
  console.log('New patient created:', patient.name?.[0]?.given?.[0], patient.name?.[0]?.family);

  // Add your email sending logic here
  return { success: true, patientId: patient.id };
}`,
  },
  {
    key: 'encounter-notification',
    name: 'Encounter Notification',
    description: 'Notifies care team when an encounter is created',
    code: `import { BotEvent, MedplumClient } from '@medplum/core';
import { Encounter } from '@medplum/fhirtypes';

export async function handler(medplum: MedplumClient, event: BotEvent): Promise<any> {
  const encounter = event.input as Encounter;
  console.log('New encounter created:', encounter.id);

  // Add your notification logic here
  return { success: true, encounterId: encounter.id };
}`,
  },
  {
    key: 'lab-result-alert',
    name: 'Lab Result Alert',
    description: 'Alerts when abnormal lab results are received',
    code: `import { BotEvent, MedplumClient } from '@medplum/core';
import { Observation } from '@medplum/fhirtypes';

export async function handler(medplum: MedplumClient, event: BotEvent): Promise<any> {
  const observation = event.input as Observation;
  const interpretation = observation.interpretation?.[0]?.coding?.[0]?.code;

  if (interpretation === 'H' || interpretation === 'L') {
    console.log('Abnormal lab result detected:', observation.id);
    // Add your alerting logic here
  }

  return { success: true, observationId: observation.id, isAbnormal: interpretation === 'H' || interpretation === 'L' };
}`,
  },
];

@injectable()
export class BotsService {
  constructor(
    @inject(TYPES.MedplumService) private medplumService: MedplumService,
    @inject(TYPES.ConfigService) private configService: ConfigService,
    @inject(TYPES.BotExecutionRepository) private botExecutionRepository: Repository<BotExecution>
  ) {}

  async getBots(): Promise<Bot[]> {
    return this.medplumService.client.searchResources('Bot', {});
  }

  async getBot(id: string): Promise<Bot> {
    const bot = await this.medplumService.getResource<Bot>('Bot', id);
    if (!bot) {
      throw new NotFoundError({ message: `Bot ${id} not found` });
    }
    return bot;
  }

  async createBot(config: BotConfig): Promise<Bot> {
    const bot: Bot = {
      resourceType: 'Bot',
      name: config.name,
      description: config.description,
      runtimeVersion: config.runtimeVersion || 'vmcontext',
      code: config.code, // Store code directly on the bot resource
    };

    const createdBot = await this.medplumService.client.createResource(bot);

    // Try to deploy the bot code (non-blocking - some Medplum setups don't support $deploy)
    if (createdBot.id && config.code) {
      try {
        await this.medplumService.client.post(
          this.medplumService.client.fhirUrl('Bot', createdBot.id, '$deploy'),
          { code: config.code }
        );
      } catch (deployError) {
        // Log but don't fail - bot is created, deployment is optional
        console.warn(`Bot ${createdBot.id} created but deploy failed:`, deployError);
      }
    }

    return createdBot;
  }

  async deleteBot(id: string): Promise<void> {
    await this.medplumService.client.deleteResource('Bot', id);
  }

  getTemplates(): Omit<BotTemplate, 'code'>[] {
    return BOT_TEMPLATES.map(({ key, name, description }) => ({ key, name, description }));
  }

  getTemplateCode(key: string): string | null {
    const template = BOT_TEMPLATES.find(t => t.key === key);
    return template?.code || null;
  }

  async createBotFromTemplate(name: string, templateKey: string, description?: string): Promise<Bot> {
    const template = BOT_TEMPLATES.find(t => t.key === templateKey);
    if (!template) {
      throw new NotFoundError({ message: `Template ${templateKey} not found` });
    }

    return this.createBot({
      name,
      description: description || template.description,
      code: template.code,
    });
  }

  async executeBot(botId: string, input?: unknown): Promise<unknown> {
    const startTime = Date.now();
    let execution: Partial<BotExecution> = {
      botId,
      input: input as Record<string, unknown>,
    };

    try {
      const result = await this.medplumService.client.executeBot(botId, input);
      execution = {
        ...execution,
        status: 'success',
        output: result as Record<string, unknown>,
        duration: Date.now() - startTime,
      };

      await this.logBotExecution(execution);
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      execution = {
        ...execution,
        status: 'error',
        error: errorMessage,
        duration: Date.now() - startTime,
      };

      await this.logBotExecution(execution);
      throw error;
    }
  }

  async createBotSubscription(
    botId: string,
    criteria: string,
    interaction?: 'create' | 'update' | 'delete'
  ): Promise<Subscription> {
    const bot = await this.getBot(botId);

    const subscription: Subscription = {
      resourceType: 'Subscription',
      status: 'requested',
      reason: `Bot trigger: ${bot.name}`,
      criteria,
      channel: {
        type: 'rest-hook',
        endpoint: `Bot/${botId}`,
        payload: 'application/fhir+json',
      },
      extension: interaction
        ? [
            {
              url: 'https://medplum.com/fhir/StructureDefinition/subscription-supported-interaction',
              valueCode: interaction,
            },
          ]
        : [],
    };

    return this.medplumService.client.createResource(subscription);
  }

  async getBotExecutions(botId?: string, limit = 20): Promise<BotExecution[]> {
    try {
      const queryBuilder = this.botExecutionRepository.createQueryBuilder('execution');

      if (botId) {
        queryBuilder.where('execution.botId = :botId', { botId });
      }

      queryBuilder.orderBy('execution.timestamp', 'DESC').take(limit);

      return queryBuilder.getMany();
    } catch {
      // Return empty array if database is not available
      return [];
    }
  }

  private async logBotExecution(execution: Partial<BotExecution>): Promise<void> {
    try {
      const entity = this.botExecutionRepository.create(execution);
      await this.botExecutionRepository.save(entity);
    } catch {
      // Silently fail if database is not available
      console.warn('Failed to log bot execution - database may not be available');
    }
  }
}
