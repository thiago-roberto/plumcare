import { Router } from 'express';
import type { EhrSystem, EhrConnection } from '../types/index.js';
import { getProvider, getRegisteredSystems } from '../providers/base.provider.js';
import { config } from '../config/index.js';
import { AppError } from '../middleware/error.js';

const router = Router();

/**
 * GET /api/connections
 * List all EHR connections with their status
 */
router.get('/', async (_req, res, next) => {
  try {
    const systems = getRegisteredSystems();
    const connections: EhrConnection[] = [];

    for (const system of systems) {
      try {
        const providerConfig = config[system] as { baseUrl: string; clientId: string; clientSecret: string };
        const provider = getProvider(system, providerConfig);
        const status = await provider.getConnectionStatus();
        connections.push(status);
      } catch (error) {
        // If provider fails, add a disconnected status
        connections.push({
          id: `${system}-001`,
          system,
          name: getSystemName(system),
          status: 'error',
          lastSync: new Date().toISOString(),
          patientCount: 0,
          encounterCount: 0,
          pendingRecords: 0,
          apiVersion: 'unknown',
          fhirVersion: 'R4',
          capabilities: [],
        });
      }
    }

    res.json({
      connections,
      total: connections.length,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/connections/:system
 * Get connection status for a specific EHR system
 */
router.get('/:system', async (req, res, next) => {
  try {
    const system = req.params.system as EhrSystem;

    if (!isValidSystem(system)) {
      throw new AppError(400, `Invalid EHR system: ${system}`, 'INVALID_SYSTEM');
    }

    const providerConfig = config[system] as { baseUrl: string; clientId: string; clientSecret: string };
    const provider = getProvider(system, providerConfig);
    const connection = await provider.getConnectionStatus();

    res.json(connection);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/connections/:system/test
 * Test connection to an EHR system
 */
router.post('/:system/test', async (req, res, next) => {
  try {
    const system = req.params.system as EhrSystem;

    if (!isValidSystem(system)) {
      throw new AppError(400, `Invalid EHR system: ${system}`, 'INVALID_SYSTEM');
    }

    const providerConfig = config[system] as { baseUrl: string; clientId: string; clientSecret: string };
    const provider = getProvider(system, providerConfig);

    // Try to authenticate
    const authResult = await provider.authenticate();

    res.json({
      success: true,
      system,
      message: 'Connection test successful',
      expiresAt: authResult.expiresAt,
    });
  } catch (error) {
    next(error);
  }
});

// Helper functions
function isValidSystem(system: string): system is EhrSystem {
  return ['athena', 'elation', 'nextgen'].includes(system);
}

function getSystemName(system: EhrSystem): string {
  const names: Record<EhrSystem, string> = {
    athena: 'Athena Health',
    elation: 'Elation Health',
    nextgen: 'NextGen Healthcare',
  };
  return names[system];
}

export { router as connectionsRouter };
