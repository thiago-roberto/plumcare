import { Router } from 'express';
import { connectionsRouter } from './connections.js';
import { syncRouter } from './sync.js';
import { mockDataRouter } from './mock-data.js';
import { patientsRouter } from './patients.js';
import { encountersRouter } from './encounters.js';

// Import providers to register them
import '../providers/athena/athena.mock.js';
import '../providers/elation/elation.mock.js';
import '../providers/nextgen/nextgen.mock.js';

const router = Router();

// Connection management routes
router.use('/connections', connectionsRouter);

// Mock data generation and sync (must come before /sync to avoid /:system catching it)
router.use('/sync/mock-data', mockDataRouter);

// Sync routes
router.use('/sync', syncRouter);

// EHR-specific data routes
router.use('/', patientsRouter);
router.use('/', encountersRouter);

// Aggregate stats endpoint
router.get('/stats', async (_req, res) => {
  // This would aggregate stats from all providers
  res.json({
    totalSystems: 3,
    connectedSystems: 3, // In mock mode, all are "connected"
    totalPatients: 42537, // Sum of all mock counts
    totalEncounters: 153742,
    pendingRecords: 179,
    lastUpdated: new Date().toISOString(),
  });
});

export { router };
