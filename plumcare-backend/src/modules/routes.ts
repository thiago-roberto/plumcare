import { Router } from 'express';

// Import module routes
import healthRoutes from './health/health.routes.js';
import connectionsRoutes from './connections/connections.routes.js';
import patientsRoutes from './patients/patients.routes.js';
import encountersRoutes from './encounters/encounters.routes.js';
import syncRoutes from './sync/sync.routes.js';
import subscriptionsRoutes from './subscriptions/subscriptions.routes.js';
import botsRoutes from './bots/bots.routes.js';
import webhooksRoutes from './webhooks/webhooks.routes.js';

const router = Router();

// Mount module routes
router.use('/health', healthRoutes);
router.use('/connections', connectionsRoutes);
router.use('/sync', syncRoutes);
router.use('/subscriptions', subscriptionsRoutes);
router.use('/bots', botsRoutes);
router.use('/webhooks', webhooksRoutes);

// Patient and encounter routes are mounted at root level (they have :system prefix in their paths)
router.use('/', patientsRoutes);
router.use('/', encountersRoutes);

export default router;
