import express, { Router } from 'express';
import cors from 'cors';

// Core imports
import { config } from './core/config/index.js';
import { errorHandler, rateLimitPresets } from './core/middleware/index.js';
import { redis } from './core/database/index.js';
import { authenticateMedplum } from './shared/medplum/index.js';

// Module routes
import { botsRouter } from './modules/bots/index.js';
import { subscriptionsRouter } from './modules/subscriptions/index.js';
import { patientsRouter } from './modules/patients/index.js';
import { encountersRouter } from './modules/encounters/index.js';
import { syncRouter } from './modules/sync/index.js';
import { connectionsRouter } from './modules/connections/index.js';
import { webhooksRouter } from './modules/webhooks/index.js';
import { mockDataRouter } from './modules/mock-data/index.js';

// Import providers to register them
import './providers/athena/athena.mock.js';
import './providers/elation/elation.mock.js';
import './providers/nextgen/nextgen.mock.js';

const app = express();
const router = Router();

// Middleware
app.use(cors(config.cors));
// Parse JSON bodies - include FHIR content types for Medplum webhooks
app.use(express.json({ type: ['application/json', 'application/fhir+json'] }));

// Health check (no rate limiting)
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Apply rate limiting to API routes
app.use('/api', rateLimitPresets.standard());

// Module routes registration
router.use('/connections', connectionsRouter);
router.use('/sync/mock-data', mockDataRouter);  // Must come before /sync to avoid /:system catching it
router.use('/sync', syncRouter);
router.use('/subscriptions', subscriptionsRouter);
router.use('/bots', botsRouter);
router.use('/webhooks', webhooksRouter);
router.use('/', patientsRouter);
router.use('/', encountersRouter);

// Aggregate stats endpoint
router.get('/stats', async (_req, res) => {
  res.json({
    totalSystems: 3,
    connectedSystems: 3,
    totalPatients: 42537,
    totalEncounters: 153742,
    pendingRecords: 179,
    lastUpdated: new Date().toISOString(),
  });
});

// API routes
app.use('/api', router);

// Error handling
app.use(errorHandler);

// Start server
async function start() {
  // Connect to Redis (non-blocking, will fall back to in-memory if unavailable)
  try {
    await redis.connect();
    console.log('Redis connection established');
  } catch (error) {
    console.warn('Redis not available - using in-memory fallback for caching');
  }

  // Authenticate with Medplum
  if (config.medplum.clientId && config.medplum.clientSecret) {
    try {
      await authenticateMedplum();
      console.log('Medplum authentication successful');
    } catch (error) {
      console.error('Failed to authenticate with Medplum:', error);
    }
  } else {
    console.warn('Medplum credentials not configured - sync features will not work');
  }

  app.listen(config.port, () => {
    console.log(`PlumCare Backend running on port ${config.port}`);
    console.log(`Mode: ${config.useMocks ? 'MOCK' : 'LIVE'}`);
    console.log(`Medplum URL: ${config.medplum.baseUrl}`);
    console.log(`Redis: ${redis.isReady() ? 'Connected' : 'Using in-memory fallback'}`);
  });
}

start();

export default app;
