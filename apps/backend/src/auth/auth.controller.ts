import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { AuthService } from './auth.service';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user account', description: 'Creates a new user with email/password for a specific tenant.' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['email', 'password', 'tenantId'],
      properties: {
        email: { type: 'string', example: 'admin@holyangel.edu.ph' },
        password: { type: 'string', example: 'SecureP@ss123' },
        tenantId: { type: 'string', format: 'uuid', description: 'Tenant UUID' },
        phone: { type: 'string', example: '+639171234567' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Account created, returns JWT tokens.' })
  @ApiResponse({ status: 409, description: 'Email already registered for this tenant.' })
  register(@Body() body: { email: string; password: string; tenantId: string; phone?: string }) {
    return this.authService.register(body);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password', description: 'Returns access + refresh JWT tokens.' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['email', 'password', 'tenantId'],
      properties: {
        email: { type: 'string', example: 'admin@holyangel.edu.ph' },
        password: { type: 'string', example: 'SecureP@ss123' },
        tenantId: { type: 'string', format: 'uuid' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Login successful, returns JWT tokens.' })
  @ApiResponse({ status: 401, description: 'Invalid credentials or inactive account.' })
  login(@Body() body: { email: string; password: string; tenantId: string }) {
    return this.authService.login(body);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token', description: 'Exchange a valid refresh token for a new access + refresh token pair.' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['refreshToken'],
      properties: {
        refreshToken: { type: 'string', description: 'JWT refresh token' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'New token pair returned.' })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token.' })
  refresh(@Body() body: { refreshToken: string }) {
    return this.authService.refresh(body.refreshToken);
  }
}
