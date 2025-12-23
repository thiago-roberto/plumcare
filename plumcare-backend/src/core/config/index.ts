export const config = {
  port: parseInt(process.env.PORT || '8000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  // Medplum configuration
  medplum: {
    baseUrl: process.env.MEDPLUM_BASE_URL || 'http://localhost:3000',
    clientId: process.env.MEDPLUM_CLIENT_ID || '',
    clientSecret: process.env.MEDPLUM_CLIENT_SECRET || '',
  },

  // Toggle between mock and real providers
  useMocks: process.env.USE_MOCKS !== 'false', // Default to true

  // EHR-specific configurations (for real API usage)
  athena: {
    baseUrl: process.env.ATHENA_BASE_URL || '',
    clientId: process.env.ATHENA_CLIENT_ID || '',
    clientSecret: process.env.ATHENA_CLIENT_SECRET || '',
    practiceId: process.env.ATHENA_PRACTICE_ID || '',
  },

  elation: {
    baseUrl: process.env.ELATION_BASE_URL || '',
    clientId: process.env.ELATION_CLIENT_ID || '',
    clientSecret: process.env.ELATION_CLIENT_SECRET || '',
  },

  nextgen: {
    baseUrl: process.env.NEXTGEN_BASE_URL || '',
    clientId: process.env.NEXTGEN_CLIENT_ID || '',
    clientSecret: process.env.NEXTGEN_CLIENT_SECRET || '',
  },

  // CORS configuration
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:4000',
    credentials: true,
  },

  // Webhook configuration - use Docker internal URL for Medplum to reach backend
  webhook: {
    internalUrl: process.env.WEBHOOK_INTERNAL_URL || 'http://backend:8000',
  },

  // Redis configuration
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || 'medplum',
    keyPrefix: 'plumcare:',
    ttl: {
      session: 60 * 60 * 24, // 24 hours
      cache: 60 * 5, // 5 minutes
      syncState: 60 * 60, // 1 hour
      rateLimit: 60, // 1 minute
    },
  },
};

export type Config = typeof config;
