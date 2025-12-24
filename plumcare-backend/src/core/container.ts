import 'reflect-metadata';
import { Container } from 'inversify';
import { TYPES } from './di-tokens.js';

// Config
import { ConfigService } from '../modules/config/config.service.js';

// Core Services
import { MedplumService } from '../modules/medplum/medplum.service.js';

// Module Services
import { ConnectionsService } from '../modules/connections/connections.service.js';
import { PatientsService } from '../modules/patients/patients.service.js';
import { EncountersService } from '../modules/encounters/encounters.service.js';
import { SyncService } from '../modules/sync/sync.service.js';
import { SubscriptionsService } from '../modules/subscriptions/subscriptions.service.js';
import { BotsService } from '../modules/bots/bots.service.js';
import { WebhooksService } from '../modules/webhooks/webhooks.service.js';

// Controllers
import { HealthController } from '../modules/health/health.controller.js';
import { ConnectionsController } from '../modules/connections/connections.controller.js';
import { PatientsController } from '../modules/patients/patients.controller.js';
import { EncountersController } from '../modules/encounters/encounters.controller.js';
import { SyncController } from '../modules/sync/sync.controller.js';
import { SubscriptionsController } from '../modules/subscriptions/subscriptions.controller.js';
import { BotsController } from '../modules/bots/bots.controller.js';
import { WebhooksController } from '../modules/webhooks/webhooks.controller.js';

// Database (lazy loading for repositories)
import { AppDataSource } from '../database/data-source.js';
import { SyncEvent, BotExecution, WebhookEvent } from '../database/entities/index.js';

const container = new Container();

// ============================================
// Config (singleton - constant value)
// ============================================
container.bind(TYPES.ConfigService).toConstantValue(ConfigService.instance);

// ============================================
// Core Services (singletons)
// ============================================
container.bind(TYPES.MedplumService).to(MedplumService).inSingletonScope();

// ============================================
// Repositories (dynamic values - lazy initialization)
// ============================================
container.bind(TYPES.SyncEventRepository).toDynamicValue(() => {
  return AppDataSource.getRepository(SyncEvent);
});

container.bind(TYPES.BotExecutionRepository).toDynamicValue(() => {
  return AppDataSource.getRepository(BotExecution);
});

container.bind(TYPES.WebhookEventRepository).toDynamicValue(() => {
  return AppDataSource.getRepository(WebhookEvent);
});

// ============================================
// Module Services
// ============================================
container.bind(TYPES.ConnectionsService).to(ConnectionsService);
container.bind(TYPES.PatientsService).to(PatientsService);
container.bind(TYPES.EncountersService).to(EncountersService);
container.bind(TYPES.SyncService).to(SyncService);
container.bind(TYPES.SubscriptionsService).to(SubscriptionsService);
container.bind(TYPES.BotsService).to(BotsService);
container.bind(TYPES.WebhooksService).to(WebhooksService);

// ============================================
// Controllers
// ============================================
container.bind(TYPES.HealthController).to(HealthController);
container.bind(TYPES.ConnectionsController).to(ConnectionsController);
container.bind(TYPES.PatientsController).to(PatientsController);
container.bind(TYPES.EncountersController).to(EncountersController);
container.bind(TYPES.SyncController).to(SyncController);
container.bind(TYPES.SubscriptionsController).to(SubscriptionsController);
container.bind(TYPES.BotsController).to(BotsController);
container.bind(TYPES.WebhooksController).to(WebhooksController);

export { container };
