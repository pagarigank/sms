import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Marks a route (or controller) as public — the global `JwtAuthGuard` skips
 * authentication for it. Use only for genuinely pre-auth endpoints
 * (login/register/refresh/tenant-lookup/MFA/OTP, health probes).
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
