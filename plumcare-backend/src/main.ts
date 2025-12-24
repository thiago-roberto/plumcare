// dotenv must be loaded before any other imports that use env vars
import 'dotenv/config';
// reflect-metadata must be imported before any decorators are used
import 'reflect-metadata';

async function bootstrap() {
  // Import providers to trigger their self-registration
  await import('./core/providers/athena/index.js');
  await import('./core/providers/elation/index.js');
  await import('./core/providers/nextgen/index.js');

  // Now import the rest of the application
  const { ExpressApp } = await import('./express-app.js');
  const { ConfigService } = await import('./modules/config/config.service.js');
  const { default: apiRouter } = await import('./modules/routes.js');

  const configService = ConfigService.instance;
  const expressApp = new ExpressApp(configService, apiRouter);

  await expressApp.init();
  expressApp.startServer();

  return expressApp.app;
}

bootstrap().catch((error) => {
  console.error('Failed to start application:', error);
  process.exit(1);
});
