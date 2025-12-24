export const TYPES = {
  // Core Services
  ConfigService: Symbol.for('ConfigService'),
  MedplumService: Symbol.for('MedplumService'),
  ProviderRegistry: Symbol.for('ProviderRegistry'),

  // Module Services
  ConnectionsService: Symbol.for('ConnectionsService'),
  PatientsService: Symbol.for('PatientsService'),
  EncountersService: Symbol.for('EncountersService'),
  SyncService: Symbol.for('SyncService'),
  SubscriptionsService: Symbol.for('SubscriptionsService'),
  BotsService: Symbol.for('BotsService'),
  WebhooksService: Symbol.for('WebhooksService'),

  // Controllers
  HealthController: Symbol.for('HealthController'),
  ConnectionsController: Symbol.for('ConnectionsController'),
  PatientsController: Symbol.for('PatientsController'),
  EncountersController: Symbol.for('EncountersController'),
  SyncController: Symbol.for('SyncController'),
  MockDataController: Symbol.for('MockDataController'),
  SubscriptionsController: Symbol.for('SubscriptionsController'),
  BotsController: Symbol.for('BotsController'),
  WebhooksController: Symbol.for('WebhooksController'),

  // Repositories
  SyncEventRepository: Symbol.for('SyncEventRepository'),
  BotExecutionRepository: Symbol.for('BotExecutionRepository'),
  WebhookEventRepository: Symbol.for('WebhookEventRepository'),

  // EHR Providers
  AthenaProvider: Symbol.for('AthenaProvider'),
  ElationProvider: Symbol.for('ElationProvider'),
  NextGenProvider: Symbol.for('NextGenProvider'),
} as const;
