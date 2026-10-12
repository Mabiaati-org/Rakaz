import 'reflect-metadata';
import 'dotenv/config';

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { AppModule } from './app.module.js';
import { AppConfig } from './config/app-config.service.js';
import { setupApp } from './setup-app.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bodyParser: false });
  setupApp(app);
  const config = app.get(AppConfig);

  if (config.swaggerEnabled) {
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder()
        .setTitle('Rakaz API')
        .setDescription('واجهة ركاز: لوحة الإدارة، تطبيق السائق، تطبيق ولي الأمر')
        .setVersion('1.0')
        .addBearerAuth()
        .build(),
    );
    SwaggerModule.setup('api/docs', app, document);
  }

  await app.listen(config.port, '0.0.0.0');
  Logger.log(`rakaz-api listening on port ${config.port} (${config.env})`, 'Bootstrap');
}

await bootstrap();
