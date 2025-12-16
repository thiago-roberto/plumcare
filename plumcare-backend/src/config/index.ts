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
    baseUrl: process.env.ATHENA_BASE_URL || 'https://api.preview.platform.athenahealth.com',
    clientId: process.env.ATHENA_CLIENT_ID || '',
    clientSecret: process.env.ATHENA_CLIENT_SECRET || '',
    practiceId: process.env.ATHENA_PRACTICE_ID || '',
  },

  elation: {
    baseUrl: process.env.ELATION_BASE_URL || 'https://sandbox.elationemr.com/api/2.0',
    clientId: process.env.ELATION_CLIENT_ID || '',
    clientSecret: process.env.ELATION_CLIENT_SECRET || '',
  },

  nextgen: {
    baseUrl: process.env.NEXTGEN_BASE_URL || 'https://api.nextgen.com/nge/prod/nge-api',
    clientId: process.env.NEXTGEN_CLIENT_ID || '',
    clientSecret: process.env.NEXTGEN_CLIENT_SECRET || '',
  },

  // CORS configuration
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:4000',
    credentials: true,
  },
};

export type Config = typeof config;
