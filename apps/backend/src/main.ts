import { NestFactory } from '@nestjs/core';
import { ValidationPipe, BadRequestException } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

// Sentry init removed — @sentry/node not in dependencies
// if (process.env.SENTRY_DSN) {
//   Sentry.init({ dsn: process.env.SENTRY_DSN });
// }

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global API prefix
  app.setGlobalPrefix('api/v1');

  // CORS: explicit allowlist. CORS_ORIGIN (when set) is MERGED with the
  // localhost dev origins instead of replacing them — a stale env var used
  // to silently drop the guardian portal (port 3002), breaking its login
  // with a browser-side "Failed to fetch". `*` with credentials is still
  // rejected by browsers (OWASP ASVS 14.4), so explicit origins remain.
  const devOrigins = ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002', 'http://localhost:3003'];
  const extraOrigins = (process.env.CORS_ORIGIN || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  const origins = Array.from(new Set([...devOrigins, ...extraOrigins]));
  app.enableCors({ origin: origins, credentials: true });

  // Security headers (OWASP A05). CSP is disabled: this service is a JSON
  // API only, so the script-src defaults would be pure noise.
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'same-site' },
    }),
  );

  // Global payload validation — reject malformed payloads early.
  // whitelist strips unknown properties; transform converts plain objects to
  // DTO instances so class-validator rules can run. Controllers currently
  // accept `any` bodies, so `forbidNonWhitelisted` stays off to avoid breaking
  // valid dynamic payloads (e.g. custom fields).
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      exceptionFactory: (errors) =>
        new BadRequestException(
          errors.map((e) => ({
            field: e.property,
            messages: Object.values(e.constraints ?? {}),
          })),
        ),
    }),
  );

  // Swagger / OpenAPI
  const config = new DocumentBuilder()
    .setTitle('SchoolSuite SMS API')
    .setDescription('Multi-Tenant School Management System — REST API')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter JWT access token',
      },
      'access-token',
    )
    .addTag('auth', 'Authentication — login, register, refresh')
    .addTag('tenants', 'Tenant management (Platform Admin)')
    .addTag('branches', 'Branch management (Tenant Admin)')
    .addTag('departments', 'Department management (Tenant/Branch Admin)')
    .addTag('users', 'User profiles')
    .addTag('iam', 'Identity & Access Management — roles, permissions')
    .addTag('config', 'Configuration engine — lookup lists, custom fields, audit')
    .addTag('health', 'Service health probes')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  // Graceful shutdown: SIGTERM/SIGINT stop accepting new connections and
  // drain in-flight requests before the process exits (reliability item 11.4).
  app.enableShutdownHooks();

  const port = parseInt(process.env.PORT || '3000', 10);

  // Use app.listen() directly — the http.createServer wrapper has issues
  // in some WSL environments where the server bind succeeds but the socket
  // is not visible to WSL's socket enumeration.
  await app.listen(port, '0.0.0.0');

  console.log(`Application is running on: http://localhost:${port}`);
  console.log(`Swagger docs: http://localhost:${port}/docs`);
}

bootstrap();


