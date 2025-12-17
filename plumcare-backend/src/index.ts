import express from 'express';
import cors from 'cors';
import { config } from './config/index.js';
import { router } from './routes/index.js';
import { errorHandler } from './middleware/error.js';
import { authenticateMedplum } from './services/medplum.service.js';

const app = express();

// Middleware
app.use(cors(config.cors));
app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api', router);

// Error handling
app.use(errorHandler);

// Start server
async function start() {
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
  });
}

start();

export default app;
