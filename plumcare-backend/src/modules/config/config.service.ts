export interface MedplumConfig {
  baseUrl: string;
  clientId: string;
  clientSecret: string;
}

export interface EhrConfig {
  baseUrl: string;
  clientId: string;
  clientSecret: string;
  practiceId?: string;
}

export interface CorsConfig {
  origin: string;
  credentials: boolean;
}

export interface WebhookConfig {
  internalUrl: string;
}

export class ConfigService {
  private static _instance: ConfigService;

  public readonly port: number;
  public readonly nodeEnv: string;
  public readonly medplum: MedplumConfig;
  public readonly useMocks: boolean;
  public readonly athena: EhrConfig;
  public readonly elation: EhrConfig;
  public readonly nextgen: EhrConfig;
  public readonly cors: CorsConfig;
  public readonly webhook: WebhookConfig;
  public readonly databaseUrl: string;

  private constructor() {
    this.port = parseInt(process.env.PORT || '8000', 10);
    this.nodeEnv = process.env.NODE_ENV || 'development';

    this.medplum = {
      baseUrl: process.env.MEDPLUM_BASE_URL || 'http://localhost:3000',
      clientId: process.env.MEDPLUM_CLIENT_ID || '',
      clientSecret: process.env.MEDPLUM_CLIENT_SECRET || '',
    };

    this.useMocks = process.env.USE_MOCKS !== 'false';

    this.athena = {
      baseUrl: process.env.ATHENA_BASE_URL || '',
      clientId: process.env.ATHENA_CLIENT_ID || '',
      clientSecret: process.env.ATHENA_CLIENT_SECRET || '',
      practiceId: process.env.ATHENA_PRACTICE_ID || '',
    };

    this.elation = {
      baseUrl: process.env.ELATION_BASE_URL || '',
      clientId: process.env.ELATION_CLIENT_ID || '',
      clientSecret: process.env.ELATION_CLIENT_SECRET || '',
    };

    this.nextgen = {
      baseUrl: process.env.NEXTGEN_BASE_URL || '',
      clientId: process.env.NEXTGEN_CLIENT_ID || '',
      clientSecret: process.env.NEXTGEN_CLIENT_SECRET || '',
    };

    this.cors = {
      origin: process.env.CORS_ORIGIN || 'http://localhost:4000',
      credentials: true,
    };

    this.webhook = {
      internalUrl: process.env.WEBHOOK_INTERNAL_URL || 'http://backend:8000',
    };

    this.databaseUrl =
      process.env.DATABASE_URL ||
      'postgresql://postgres:postgres@localhost:5432/plumcare';
  }

  public static get instance(): ConfigService {
    if (!ConfigService._instance) {
      ConfigService._instance = new ConfigService();
    }
    return ConfigService._instance;
  }

  public get isDevelopment(): boolean {
    return this.nodeEnv === 'development';
  }

  public get isProduction(): boolean {
    return this.nodeEnv === 'production';
  }
}
