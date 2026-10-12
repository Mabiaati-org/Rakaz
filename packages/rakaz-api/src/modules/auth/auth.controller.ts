import { Body, Controller, Delete, Get, HttpCode, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { RakazAuthSession, RakazAuthUser } from '@rakaz/contract';

import type { AuthUser } from '../../common/auth-user.js';
import { AllowPendingPassword } from '../../common/decorators/allow-pending-password.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { WithMessage } from '../../common/dto/pagination.dto.js';
import { AuthService } from './auth.service.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { DeleteAccountDto } from './dto/delete-account.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { RefreshDto } from './dto/refresh.dto.js';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'تسجيل الدخول برقم الهاتف وكلمة المرور' })
  login(@Body() dto: LoginDto): Promise<RakazAuthSession> {
    return this.auth.login(dto.phone, dto.password);
  }

  @Public()
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Post('refresh')
  @HttpCode(200)
  @ApiOperation({ summary: 'تجديد الجلسة برمز التحديث' })
  refresh(@Body() dto: RefreshDto): Promise<RakazAuthSession> {
    return this.auth.refresh(dto.refreshToken);
  }

  @Public()
  @Post('logout')
  @HttpCode(200)
  @ApiOperation({ summary: 'إنهاء الجلسة الحالية' })
  async logout(@Body() dto: RefreshDto): Promise<WithMessage<null>> {
    await this.auth.logout(dto.refreshToken);
    return new WithMessage(null, 'تم تسجيل الخروج');
  }

  @ApiBearerAuth()
  @AllowPendingPassword()
  @Get('me')
  @ApiOperation({ summary: 'بيانات الحساب الحالي' })
  me(@CurrentUser() user: AuthUser): Promise<RakazAuthUser> {
    return this.auth.me(user.id);
  }

  @ApiBearerAuth()
  @AllowPendingPassword()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('change-password')
  @HttpCode(200)
  @ApiOperation({ summary: 'تغيير كلمة المرور' })
  async changePassword(
    @CurrentUser() user: AuthUser,
    @Body() dto: ChangePasswordDto,
  ): Promise<WithMessage<RakazAuthSession>> {
    const session = await this.auth.changePassword(user.id, dto.currentPassword, dto.newPassword);
    return new WithMessage(session, 'تم تغيير كلمة المرور');
  }

  @ApiBearerAuth()
  @AllowPendingPassword()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Delete('account')
  @ApiOperation({ summary: 'حذف الحساب نهائياً' })
  async deleteAccount(@CurrentUser() user: AuthUser, @Body() dto: DeleteAccountDto): Promise<WithMessage<null>> {
    await this.auth.deleteAccount(user, dto.password);
    return new WithMessage(null, 'تم حذف الحساب');
  }
}
