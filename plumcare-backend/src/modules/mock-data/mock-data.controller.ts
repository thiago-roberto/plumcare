import type { Request, Response, NextFunction } from 'express';
import { syncMockData } from './mock-data.service.js';
import { AppError } from '../../core/middleware/index.js';
import type { SyncMockDataDto } from './mock-data.dto.js';

/**
 * Mock Data Controller
 *
 * Handles HTTP request/response for mock data operations.
 * Delegates business logic to the mock-data service.
 */
export class MockDataController {
  /**
   * POST /api/sync/mock-data
   * Generate random patient data for all 3 EHRs, transform to FHIR R4, and store in Medplum
   */
  async syncMockData(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const dto = req.body as SyncMockDataDto;

      // Validate patient count
      if (dto.patientCount !== undefined && (dto.patientCount < 1 || dto.patientCount > 50)) {
        throw new AppError(400, 'patientCount must be between 1 and 50', 'INVALID_PATIENT_COUNT');
      }

      const response = await syncMockData({
        patientCount: dto.patientCount,
        includeAllData: dto.includeAllData,
      });

      res.json(response);
    } catch (error) {
      if (error instanceof AppError) {
        next(error);
      } else {
        next(new AppError(500, 'Failed to sync mock data', 'MOCK_DATA_SYNC_ERROR', error));
      }
    }
  }
}

export const mockDataController = new MockDataController();
