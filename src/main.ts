import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { loggerConfig } from './common/config/logger.config';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: loggerConfig,
  });

  // Apply global exception filter
  app.useGlobalFilters(new AllExceptionsFilter());

  const port = process.env.PORT ?? 3000;

  await app.listen(port);

  const logger = new Logger('Bootstrap');
  logger.log(`🚀 Application started on port ${port}`);
  logger.log(`📱 Telegram Bot is running...`);
  logger.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.log(`📝 Logs directory: ./logs`);
  logger.log(
    `💾 Database: ${process.env.DATABASE_URL?.split('@')[1]?.split('?')[0] || 'Not configured'}`,
  );
}

bootstrap().catch((error) => {
  const logger = new Logger('Bootstrap');
  logger.error('❌ Application failed to start');
  logger.error(`Error: ${error.message}`);
  logger.error('Stack:', error.stack);
  process.exit(1);
});
