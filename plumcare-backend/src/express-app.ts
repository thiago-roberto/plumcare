import express, { type Application, type Router } from 'express';
import cors from 'cors';
import { ConfigService } from './modules/config/config.service.js';
import { MedplumService } from './modules/medplum/medplum.service.js';
import { errorMiddleware } from './middleware/error.middleware.js';
import { initializeDatabase, closeDatabase } from './database/data-source.js';
import { container } from './core/container.js';
import { TYPES } from './core/di-tokens.js';

export class ExpressApp {
  public app: Application;

  constructor(
    private configService: ConfigService,
    private apiRouter: Router
  ) {
    this.app = express();
  }

  public async init(): Promise<this> {
    // Initialize database connection
    await this.initializeDatabase();

    // Configure middleware
    this.configureCors();
    this.configureJsonParser();

    // Add health check at root level
    this.addHealthCheck();

    // Mount API routes
    this.addApiRouter();

    // Error handling (must be last)
    this.addErrorMiddleware();

    // Authenticate with Medplum
    await this.authenticateMedplum();

    return this;
  }

  public startServer(): void {
    const { port, nodeEnv } = this.configService;

    const server = this.app.listen(port, () => {
      console.log(`PlumCare Backend running on port ${port}`);
      console.log(`Mode: ${this.configService.useMocks ? 'MOCK' : 'LIVE'}`);
      console.log(`Environment: ${nodeEnv}`);
      console.log(`Medplum URL: ${this.configService.medplum.baseUrl}`);
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\nShutting down gracefully...');
      await closeDatabase();
      server.close(() => {
        console.log('Server closed');
        process.exit(0);
      });
    });

    process.on('SIGTERM', async () => {
      console.log('\nReceived SIGTERM, shutting down...');
      await closeDatabase();
      server.close(() => {
        console.log('Server closed');
        process.exit(0);
      });
    });
  }

  private async initializeDatabase(): Promise<void> {
    try {
      await initializeDatabase();
      console.log('Database initialized');
    } catch (error) {
      console.warn('Database initialization failed - running without database:', error);
      // Continue without database for development
    }
  }

  private configureCors(): void {
    this.app.use(cors(this.configService.cors));
  }

  private configureJsonParser(): void {
    // Parse JSON bodies - include FHIR content types for Medplum webhooks
    this.app.use(
      express.json({ type: ['application/json', 'application/fhir+json'] })
    );
  }

  private addHealthCheck(): void {
    this.app.get('/health', (_req, res) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });
  }

  private addApiRouter(): void {
    this.app.use('/api', this.apiRouter);
  }

  private addErrorMiddleware(): void {
    this.app.use(errorMiddleware);
  }

  private async authenticateMedplum(): Promise<void> {
    const { clientId, clientSecret } = this.configService.medplum;

    if (clientId && clientSecret) {
      try {
        const medplumService = container.get<MedplumService>(TYPES.MedplumService);
        await medplumService.authenticate();
        console.log('Medplum authentication successful');
      } catch (error) {
        console.error('Failed to authenticate with Medplum:', error);
      }
    } else {
      console.warn('Medplum credentials not configured - sync features will not work');
    }
  }
}
