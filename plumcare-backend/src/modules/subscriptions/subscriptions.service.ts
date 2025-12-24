import { injectable, inject } from 'inversify';
import type { Subscription } from '@medplum/fhirtypes';
import { TYPES } from '../../core/di-tokens.js';
import { MedplumService } from '../medplum/medplum.service.js';
import { ConfigService } from '../config/config.service.js';
import { NotFoundError } from '../../core/errors.js';

export interface SubscriptionConfig {
  name: string;
  criteria: string;
  interaction?: 'create' | 'update' | 'delete';
  endpoint?: string;
  fhirPathFilter?: string;
  maxAttempts?: number;
}

const DEFAULT_SUBSCRIPTIONS: SubscriptionConfig[] = [
  {
    name: 'Patient Changes',
    criteria: 'Patient',
    interaction: 'create',
  },
  {
    name: 'Encounter Changes',
    criteria: 'Encounter',
    interaction: 'create',
  },
  {
    name: 'Observation Changes',
    criteria: 'Observation',
    interaction: 'create',
  },
];

@injectable()
export class SubscriptionsService {
  constructor(
    @inject(TYPES.MedplumService) private medplumService: MedplumService,
    @inject(TYPES.ConfigService) private configService: ConfigService
  ) {}

  async getSubscriptions(): Promise<Subscription[]> {
    return this.medplumService.client.searchResources('Subscription', {});
  }

  async getSubscription(id: string): Promise<Subscription> {
    const subscription = await this.medplumService.getResource<Subscription>('Subscription', id);
    if (!subscription) {
      throw new NotFoundError({ message: `Subscription ${id} not found` });
    }
    return subscription;
  }

  async createSubscription(config: SubscriptionConfig): Promise<Subscription> {
    const webhookUrl = config.endpoint || `${this.configService.webhook.internalUrl}/api/webhooks/medplum`;

    const subscription: Subscription = {
      resourceType: 'Subscription',
      status: 'requested',
      reason: config.name,
      criteria: config.criteria,
      channel: {
        type: 'rest-hook',
        endpoint: webhookUrl,
        payload: 'application/fhir+json',
      },
      extension: [],
    };

    // Add interaction extension if specified
    if (config.interaction) {
      subscription.extension?.push({
        url: 'https://medplum.com/fhir/StructureDefinition/subscription-supported-interaction',
        valueCode: config.interaction,
      });
    }

    // Add max attempts extension if specified
    if (config.maxAttempts) {
      subscription.extension?.push({
        url: 'https://medplum.com/fhir/StructureDefinition/subscription-max-attempts',
        valueInteger: config.maxAttempts,
      });
    }

    // Add FHIRPath filter if specified
    if (config.fhirPathFilter) {
      subscription.extension?.push({
        url: 'https://medplum.com/fhir/StructureDefinition/fhir-path-criteria-expression',
        valueString: config.fhirPathFilter,
      });
    }

    return this.medplumService.client.createResource(subscription);
  }

  async createDefaultSubscriptions(): Promise<Subscription[]> {
    const subscriptions: Subscription[] = [];

    for (const config of DEFAULT_SUBSCRIPTIONS) {
      const subscription = await this.createSubscription(config);
      subscriptions.push(subscription);
    }

    return subscriptions;
  }

  async pauseSubscription(id: string): Promise<Subscription> {
    const subscription = await this.getSubscription(id);
    return this.medplumService.client.updateResource({
      ...subscription,
      status: 'off',
    });
  }

  async resumeSubscription(id: string): Promise<Subscription> {
    const subscription = await this.getSubscription(id);
    return this.medplumService.client.updateResource({
      ...subscription,
      status: 'requested',
    });
  }

  async deleteSubscription(id: string): Promise<void> {
    await this.medplumService.client.deleteResource('Subscription', id);
  }
}
