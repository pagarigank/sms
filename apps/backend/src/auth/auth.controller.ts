import { Controller, Post, Body, HttpCode, HttpStatus, UseGuards, Request, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { MfaService } from './mfa.service';
import { GuardianAuthService } from './guardian-auth.service';
import { ImpersonationService } from './impersonation.service';
import { ImpersonationGrant } from './impersonation.types';
import { JwtAuthGuard } from './jwt-auth.guard';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly mfaService: MfaService,
    private readonly guardianAuthService: GuardianAuthService,
    private readonly impersonationService: ImpersonationService,
  ) {}

  // === Staff Auth ===

  @Post('register')
  @ApiOperation({ summary: 'Register a new staff user' })
  register(@Body() body: { email: string; password: string; tenantId: string; phone?: string }) {
    return this.authService.register(body);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Staff login' })
  login(@Body() body: { email: string; password: string; tenantId?: string }, @Request() req: any) {
    return this.authService.login(body, {
      ipAddress: req.ip ?? req.socket?.remoteAddress,
      userAgent: req.headers['user-agent'],
    });
  }

  @Get('tenant-lookup')
  @ApiOperation({ summary: 'Resolve tenant by slug (public, pre-auth)' })
  lookupTenant(@Query('slug') slug: string) {
    return this.authService.lookupTenantBySlug(slug);
  }

  // === MFA ===

  @Post('mfa/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify MFA token' })
  verifyMfa(@Body() body: { userId: string; token: string }, @Request() req: any) {
    return this.authService.verifyMfa(body.userId, body.token, {
      ipAddress: req.ip ?? req.socket?.remoteAddress,
      userAgent: req.headers['user-agent'],
    });
  }

  @Post('mfa/setup')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Setup MFA' })
  async setupMfa(@Request() req: any) {
    return this.mfaService.generateSecret(req.user.id);
  }

  // === Guardian/Student Auth ===

  @Post('guardian/register')
  @ApiOperation({ summary: 'Register guardian account' })
  registerGuardian(@Body() body: any) {
    return this.guardianAuthService.register(body);
  }

  @Post('guardian/login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Guardian login with email/password' })
  loginGuardian(@Body() body: { email: string; password: string; tenantId: string }) {
    return this.guardianAuthService.loginWithPassword(body.email, body.password, body.tenantId);
  }

  @Post('guardian/otp/request')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request OTP for mobile login' })
  requestOtp(@Body() body: { phone: string; tenantId: string }) {
    return this.guardianAuthService.requestOtp(body.phone, body.tenantId);
  }

  @Post('guardian/otp/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify OTP and login' })
  verifyOtp(@Body() body: { phone: string; otp: string; tenantId: string }) {
    return this.guardianAuthService.verifyOtp(body.phone, body.otp, body.tenantId);
  }

  // === Impersonation ===

  @Post('impersonate/request')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Request impersonation (requires approval)' })
  requestImpersonation(@Request() req: any, @Body() body: { targetTenantId: string; reason: string }): Promise<import('./impersonation.types').ImpersonationGrant> {
    return this.impersonationService.requestImpersonation(req.user.id, body.targetTenantId, body.reason);
  }

  @Post('impersonate/break-glass')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Break-glass impersonation (emergency)' })
  breakGlass(@Request() req: any, @Body() body: { targetTenantId: string; reason: string }): Promise<ImpersonationGrant> {
    return this.impersonationService.breakGlassImpersonation(req.user.id, body.targetTenantId, body.reason);
  }

  @Post('impersonate/token/:grantId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get impersonation token' })
  getImpersonationToken(@Param('grantId') grantId: string) {
    return this.impersonationService.generateImpersonationToken(grantId);
  }

  @Post('impersonate/end/:grantId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'End impersonation session' })
  endImpersonation(@Param('grantId') grantId: string, @Request() req: any) {
    return this.impersonationService.endImpersonation(grantId, req.user.id);
  }

  @Get('impersonate/active')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'List active impersonation grants' })
  getActiveGrants(): ImpersonationGrant[] {
    return this.impersonationService.getActiveGrants();
  }

  @Get('me')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get current user profile + permissions' })
  getMe(@Request() req: any) {
    return this.authService.getMe(req.user.sub ?? req.user.id);
  }

  // === Token Management ===

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  refresh(@Body() body: { refreshToken: string }) {
    return this.authService.refresh(body.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Log out — terminate current session (audit-recorded)' })
  logout(
    @Body() body: { accessToken: string },
    @Request() req: any,
  ) {
    return this.authService.logout(body.accessToken, {
      ipAddress: req.ip ?? req.socket?.remoteAddress,
      userAgent: req.headers['user-agent'],
    });
  }
}
