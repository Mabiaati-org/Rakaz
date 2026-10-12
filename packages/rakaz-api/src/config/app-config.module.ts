import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AppConfig } from './app-config.service.js';
import { validateEnv } from './env.js';

@Global()
@Module({
  imports: [ConfigModule.forRoot({ validate: validateEnv, cache: true })],
  providers: [AppConfig],
  exports: [AppConfig],
})
export class AppConfigModule {}
