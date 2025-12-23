import { Router } from 'express';
import type { EhrSystem } from '../types/index.js';
import { performSync, getSyncEvents, initializeDemoSyncEvents } from '../services/sync.service.js';
import { AppError } from '../middleware/error.js';

const router = Router();

// Initialize demo sync events on startup
initializeDemoSyncEvents();

/**
 * POST /api/sync/:system
 * Trigger a sync for a specific EHR system
 */
router.post('/:system', async (req, res, next) => {
  try {
    const system = req.params.system as EhrSystem;

    if (!isValidSystem(system)) {
      throw new AppError(400, `Invalid EHR system: ${system}`, 'INVALID_SYSTEM');
    }

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
    next(error);
  }
});

/**
 * GET /api/sync/events
 * Get recent sync events across all systems
 */
router.get('/events', (req, res) => {
  const system = req.query.system as EhrSystem | undefined;
  const limit = parseInt(req.query.limit as string) || 20;
  const offset = parseInt(req.query.offset as string) || 0;

  const { events, total } = getSyncEvents({
    system: system && isValidSystem(system) ? system : undefined,
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
});

/**
 * POST /api/sync/all
 * Trigger sync for all connected EHR systems
 */
router.post('/all', async (_req, res, next) => {
  try {
    const systems: EhrSystem[] = ['athena', 'elation', 'nextgen'];
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
    next(error);
  }
});

// Helper function
function isValidSystem(system: string): system is EhrSystem {
  return ['athena', 'elation', 'nextgen'].includes(system);
}

export { router as syncRouter };
