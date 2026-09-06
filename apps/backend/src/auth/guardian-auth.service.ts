import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from '../users/user.entity';
import { SessionService } from '../users/session.service';

@Injectable()
export class GuardianAuthService {
  constructor(
    @InjectRepository(User) private usersRepo: Repository<User>,
    private jwtService: JwtService,
    private sessionService: SessionService,
  ) {}

  /**
   * Login guardian/student with email + password.
   * Lower-friction than staff SSO.
   */
  async loginWithPassword(email: string, password: string, tenantId: string) {
    const user = await this.usersRepo.findOne({
      where: { email, tenantId },
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.status !== 'active') {
      throw new UnauthorizedException('Account is not active');
    }

    await this.usersRepo.update(user.id, { lastLoginAt: new Date() });
    return this.generateTokens(user, 'guardian');
  }

  /**
   * Set session audit on the generated tokens. Caller passes request meta
   * so we can capture IP/user-agent.
   */
  private recordSession(user: User, accessToken: string, expiresAt: Date, requestMeta?: { ipAddress?: string; userAgent?: string }) {
    try {
      this.sessionService.recordLogin({
        userId: user.id,
        tenantId: user.tenantId,
        sessionTokenHash: this.sessionService.hashToken(accessToken),
        ipAddress: requestMeta?.ipAddress,
        userAgent: requestMeta?.userAgent,
        expiresAt,
      });
    } catch (e: any) {
      console.warn('[session-audit] guardian recordLogin failed:', e?.message);
    }
  }

  /**
   * Request OTP for mobile login.
   */
  async requestOtp(phone: string, tenantId: string): Promise<{ message: string; otpLength: number }> {
    const user = await this.usersRepo.findOne({
      where: { phone, tenantId },
    });

    if (!user) {
      // Don't reveal if phone exists
      return { message: 'If the phone number is registered, an OTP has been sent', otpLength: 6 };
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store OTP hash temporarily (in production, use Redis)
    await this.usersRepo.update(user.id, {
      // We're reusing a field for demo; in production, use a dedicated OTP table
      mfaSecret: `${otpHash}:${expiresAt.getTime()}`,
    });

    // In production, send OTP via SMS gateway (Semaphore/Movider)
    console.log(`[DEV] OTP for ${phone}: ${otp}`);

    return { message: 'OTP sent successfully', otpLength: 6 };
  }

  /**
   * Verify OTP and login.
   */
  async verifyOtp(phone: string, otp: string, tenantId: string) {
    const user = await this.usersRepo.findOne({
      where: { phone, tenantId },
    });

    if (!user || !user.mfaSecret) {
      throw new UnauthorizedException('Invalid OTP');
    }

    const [storedHash, expiresAtStr] = user.mfaSecret.split(':');
    const expiresAt = new Date(parseInt(expiresAtStr));

    if (new Date() > expiresAt) {
      throw new UnauthorizedException('OTP has expired');
    }

    const valid = await bcrypt.compare(otp, storedHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid OTP');
    }

    // Clear OTP
    await this.usersRepo.update(user.id, { mfaSecret: undefined, lastLoginAt: new Date() });

    return this.generateTokens(user, 'guardian');
  }

  /**
   * Register guardian account.
   */
  async register(data: {
    email?: string;
    phone?: string;
    password: string;
    firstName: string;
    lastName: string;
    tenantId: string;
  }) {
    // Check if email or phone already exists
    if (data.email) {
      const existing = await this.usersRepo.findOne({
        where: { email: data.email, tenantId: data.tenantId },
      });
      if (existing) throw new ConflictException('Email already registered');
    }

    if (data.phone) {
      const existing = await this.usersRepo.findOne({
        where: { phone: data.phone, tenantId: data.tenantId },
      });
      if (existing) throw new ConflictException('Phone already registered');
    }

    const passwordHash = await bcrypt.hash(data.password, 12);
    const user = this.usersRepo.create({
      email: data.email,
      phone: data.phone,
      passwordHash,
      tenantId: data.tenantId,
      status: 'active',
    });

    const saved = await this.usersRepo.save(user);
    return this.generateTokens(saved, 'guardian');
  }

  private generateTokens(user: User, role: string) {
    const payload = {
      sub: user.id,
      tenantId: user.tenantId,
      email: user.email,
      role,
    };

    const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });
    const refreshToken = this.jwtService.sign(
      { sub: user.id },
      { secret: process.env.JWT_REFRESH_SECRET || 'refresh-secret', expiresIn: '30d' },
    );

    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    this.recordSession(user, accessToken, expiresAt);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        tenantId: user.tenantId,
        role,
      },
    };
  }
}
