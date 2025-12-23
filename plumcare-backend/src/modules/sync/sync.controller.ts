import type { Request, Response, NextFunction } from 'express';
import {
  performSync,
  getSyncEvents,
  initializeDemoSyncEvents,
} from './sync.service.js';
import { AppError } from '../../core/middleware/index.js';
import type { SyncEhrSystem } from './sync.types.js';

// Initialize demo sync events on startup (async but don't await)
initializeDemoSyncEvents().catch(console.error);

/**
 * Sync Controller
 *
 * Handles HTTP request/response for sync operations.
 * Delegates business logic to the sync service.
 */
export class SyncController {
  /**
   * POST /api/sync/:system
   * Trigger a sync for a specific EHR system
   */
  async triggerSync(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const system = req.params.system as SyncEhrSystem;
      const result = await performSync(system);

      res.json({
        success: result.success,
        system,
        syncedResources: result.syncedResources,
        errors: result.errors,
        events: result.events,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      if (error instanceof AppError) {
        next(error);
      } else {
        next(new AppError(500, 'Failed to perform sync', 'SYNC_ERROR', error));
      }
    }
  }

  /**
   * POST /api/sync/all
   * Trigger sync for all connected EHR systems
   */
  async triggerSyncAll(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const systems: SyncEhrSystem[] = ['athena', 'elation', 'nextgen'];
      const results: Record<string, { success: boolean; syncedResources: number; errors: string[] }> = {};

      for (const system of systems) {
        try {
          const result = await performSync(system);
          results[system] = {
            success: result.success,
            syncedResources: result.syncedResources,
            errors: result.errors,
          };
        } catch (error) {
          results[system] = {
            success: false,
            syncedResources: 0,
            errors: [error instanceof Error ? error.message : 'Unknown error'],
          };
        }
      }

      const totalSynced = Object.values(results).reduce((sum, r) => sum + r.syncedResources, 0);
      const allSuccess = Object.values(results).every(r => r.success);

      res.json({
        success: allSuccess,
        totalSyncedResources: totalSynced,
        results,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      if (error instanceof AppError) {
        next(error);
      } else {
        next(new AppError(500, 'Failed to perform sync all', 'SYNC_ALL_ERROR', error));
      }
    }
  }

  /**
   * GET /api/sync/events
   * Get recent sync events across all systems
   */
  async getEvents(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const system = req.query.system as SyncEhrSystem | undefined;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;

      const { events, total } = await getSyncEvents({
        system,
        limit,
        offset,
      });

      res.json({
        events,
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      });
    } catch (error) {
      if (error instanceof AppError) {
        next(error);
      } else {
        next(new AppError(500, 'Failed to fetch sync events', 'SYNC_EVENTS_ERROR', error));
      }
    }
  }
}

export const syncController = new SyncController();
