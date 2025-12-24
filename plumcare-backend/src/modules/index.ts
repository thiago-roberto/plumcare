// Core modules
export * from './config/index.js';
export * from './medplum/index.js';

// Feature modules
export * from './health/index.js';
export * from './connections/index.js';
export * from './patients/index.js';
export * from './encounters/index.js';

// Route aggregator
export { default as apiRouter } from './routes.js';
