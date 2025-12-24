import { injectable, inject } from 'inversify';
import type { Repository } from 'typeorm';
import type { Resource } from '@medplum/fhirtypes';
import { TYPES } from '../../core/di-tokens.js';
import { WebhookEvent } from '../../database/entities/webhook-event.entity.js';

export interface WebhookPayload {
  resourceType: string;
  id?: string;
  [key: string]: unknown;
}

@injectable()
export class WebhooksService {
  constructor(
    @inject(TYPES.WebhookEventRepository) private webhookEventRepository: Repository<WebhookEvent>
  ) {}

  async getEvents(limit = 20): Promise<WebhookEvent[]> {
    try {
      return this.webhookEventRepository.find({
        order: { timestamp: 'DESC' },
        take: limit,
      });
    } catch {
      // Return empty array if database is not available
      return [];
    }
  }

  async processWebhook(payload: WebhookPayload, subscriptionId?: string): Promise<WebhookEvent | null> {
    const event: Partial<WebhookEvent> = {
      resourceType: payload.resourceType,
      resourceId: payload.id || 'unknown',
      action: this.determineAction(payload),
      subscriptionId,
      payload: payload as Record<string, unknown>,
      processed: false,
    };

    try {
      const entity = this.webhookEventRepository.create(event);
      const savedEvent = await this.webhookEventRepository.save(entity);

      // Process the webhook (this is where you'd add business logic)
      await this.handleWebhookEvent(savedEvent);

      // Mark as processed
      savedEvent.processed = true;
      await this.webhookEventRepository.save(savedEvent);

      return savedEvent;
    } catch (error) {
      console.error('Failed to process webhook:', error);
      return null;
    }
  }

  async processMedplumWebhook(resource: Resource): Promise<WebhookEvent | null> {
    return this.processWebhook(
      resource as unknown as WebhookPayload,
      undefined
    );
  }

  private determineAction(payload: WebhookPayload): 'create' | 'update' | 'delete' {
    // This is a simplified determination - in a real app you'd have more context
    // from the subscription or HTTP method
    const meta = payload.meta as { versionId?: string } | undefined;
    if (meta?.versionId === '1') {
      return 'create';
    }
    return 'update';
  }

  private async handleWebhookEvent(event: WebhookEvent): Promise<void> {
    // Add your business logic here based on the event type
    console.log(`Processing webhook event: ${event.resourceType}/${event.resourceId} (${event.action})`);

    switch (event.resourceType) {
      case 'Patient':
        await this.handlePatientEvent(event);
        break;
      case 'Encounter':
        await this.handleEncounterEvent(event);
        break;
      case 'Observation':
        await this.handleObservationEvent(event);
        break;
      default:
        console.log(`Unhandled resource type: ${event.resourceType}`);
    }
  }

  private async handlePatientEvent(_event: WebhookEvent): Promise<void> {
    // Handle patient-specific logic
    // e.g., sync to EHR systems, send notifications, etc.
  }

  private async handleEncounterEvent(_event: WebhookEvent): Promise<void> {
    // Handle encounter-specific logic
  }

  private async handleObservationEvent(_event: WebhookEvent): Promise<void> {
    // Handle observation-specific logic
  }

  async markAsProcessed(id: string): Promise<WebhookEvent | null> {
    try {
      const event = await this.webhookEventRepository.findOne({ where: { id } });
      if (event) {
        event.processed = true;
        return this.webhookEventRepository.save(event);
      }
      return null;
    } catch {
      return null;
    }
  }

  async getUnprocessedEvents(limit = 100): Promise<WebhookEvent[]> {
    try {
      return this.webhookEventRepository.find({
        where: { processed: false },
        order: { timestamp: 'ASC' },
        take: limit,
      });
    } catch {
      return [];
    }
  }

  async reprocessEvent(id: string): Promise<WebhookEvent | null> {
    try {
      const event = await this.webhookEventRepository.findOne({ where: { id } });
      if (event) {
        event.processed = false;
        await this.webhookEventRepository.save(event);
        await this.handleWebhookEvent(event);
        event.processed = true;
        return this.webhookEventRepository.save(event);
      }
      return null;
    } catch {
      return null;
    }
  }
}
