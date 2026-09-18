import * as crypto from 'crypto';

/**
 * Shared HMAC-SHA256 JWT verification used by both JwtAuthGuard and
 * TenantContextMiddleware, so tenant scoping is always derived from the
 * signature-verified token - never from client-controlled headers.
 */
export function verifyJwtToken(token: string): any | null {
  const secret = process.env.JWT_SECRET || 'dev-secret-change-in-production';
  const [headerB64, payloadB64, signatureB64] = token.split('.');
  if (!headerB64 || !payloadB64 || !signatureB64) return null;

  const data = `${headerB64}.${payloadB64}`;
  const expected = crypto.createHmac('sha256', secret).update(data).digest();
  const given = Buffer.from(signatureB64, 'base64url');
  if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString());
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function extractBearerToken(authorization: string | undefined): string | undefined {
  if (!authorization?.startsWith('Bearer ')) return undefined;
  return authorization.slice('Bearer '.length);
}