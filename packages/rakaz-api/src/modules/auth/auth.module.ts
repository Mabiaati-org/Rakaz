import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { AppConfig } from '../../config/app-config.service.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { AccountsService } from './accounts.service.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { PasswordService } from './password.service.js';

@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [AppConfig],
      useFactory: (config: AppConfig) => ({
        secret: config.jwtSecret,
        signOptions: { expiresIn: config.accessTtlSeconds },
      }),
    }),
    NotificationsModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, AccountsService, PasswordService],
  exports: [AuthService, AccountsService, PasswordService, JwtModule],
})
export class AuthModule {}
