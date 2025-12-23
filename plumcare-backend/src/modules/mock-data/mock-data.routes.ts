import { Router } from 'express';
import { mockDataController } from './mock-data.controller.js';
import { validateRequest } from '../../core/middleware/index.js';
import { SyncMockDataDto } from './mock-data.dto.js';

const router = Router();

/**
 * POST /api/sync/mock-data
 * Generate random patient data for all 3 EHRs, transform to FHIR R4, and store in Medplum
 */
router.post(
  '/',
  validateRequest({ body: SyncMockDataDto }),
  mockDataController.syncMockData.bind(mockDataController)
);

export { router as mockDataRouter };
