import type { Request, Response, NextFunction } from 'express';
import {
  getConnections,
  getConnectionBySystem,
  testConnection,
} from './connections.service.js';
import { AppError } from '../../core/middleware/index.js';
import type { ConnectionEhrSystem } from './connections.types.js';

/**
 * Connections Controller
 *
 * Handles HTTP request/response for connection operations.
 * Delegates business logic to the connections service.
 */
export class ConnectionsController {
  /**
   * GET /api/connections
   * List all EHR connections with their status
   */
  async list(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const connections = await getConnections();
      res.json({
        connections,
        total: connections.length,
      });
    } catch (error) {
      if (error instanceof AppError) {
        next(error);
      } else {
        next(new AppError(500, 'Failed to fetch connections', 'CONNECTIONS_FETCH_ERROR', error));
      }
    }
  }

  /**
   * GET /api/connections/:system
   * Get connection status for a specific EHR system
   */
  async getBySystem(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const system = req.params.system as ConnectionEhrSystem;
      const connection = await getConnectionBySystem(system);
      res.json(connection);
    } catch (error) {
      if (error instanceof AppError) {
        next(error);
      } else {
        next(new AppError(500, 'Failed to fetch connection', 'CONNECTION_FETCH_ERROR', error));
      }
    }
  }

  /**
   * POST /api/connections/:system/test
   * Test connection to an EHR system
   */
  async test(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const system = req.params.system as ConnectionEhrSystem;
      const result = await testConnection(system);
      res.json(result);
    } catch (error) {
      if (error instanceof AppError) {
        next(error);
      } else {
        next(new AppError(500, 'Failed to test connection', 'CONNECTION_TEST_ERROR', error));
      }
    }
  }
}

export const connectionsController = new ConnectionsController();
