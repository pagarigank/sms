import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from '../users/user.entity';
import { MfaService } from './mfa.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private jwtService: JwtService,
    private mfaService: MfaService,
  ) {}

  async register(data: { email: string; password: string; tenantId: string; phone?: string }) {
    const existing = await this.usersRepository.findOne({
      where: { email: data.email, tenantId: data.tenantId },
    });
    if (existing) {
      throw new ConflictException('Email already registered for this tenant');
    }

    const passwordHash = await bcrypt.hash(data.password, 12);
    const user = this.usersRepository.create({
      email: data.email,
      phone: data.phone,
      passwordHash,
      tenantId: data.tenantId,
    });
    const saved = await this.usersRepository.save(user);
    return this.generateTokens(saved);
  }

  async login(data: { email: string; password: string; tenantId: string }) {
    const user = await this.usersRepository.findOne({
      where: { email: data.email, tenantId: data.tenantId },
    });
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await bcrypt.compare(data.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.status !== 'active') {
      throw new UnauthorizedException('Account is not active');
    }

    // Check if MFA is required for this user
    const mfaRequired = await this.mfaService.requiresMfa(user.id, user.tenantId);
    const mfaEnabled = await this.mfaService.isMfaEnabled(user.id);

    await this.usersRepository.update(user.id, { lastLoginAt: new Date() });

    // If MFA is required but not yet set up, return partial tokens
    if (mfaRequired && !mfaEnabled) {
      const tempToken = this.jwtService.sign(
        { sub: user.id, tenantId: user.tenantId, mfaPending: true },
        { expiresIn: '5m' }
      );
      return {
        mfaRequired: true,
        mfaSetupRequired: true,
        tempToken,
        user: { id: user.id, email: user.email, tenantId: user.tenantId },
      };
    }

    // If MFA is enabled, require verification
    if (mfaEnabled) {
      const tempToken = this.jwtService.sign(
        { sub: user.id, tenantId: user.tenantId, mfaPending: true },
        { expiresIn: '5m' }
      );
      return {
        mfaRequired: true,
        mfaSetupRequired: false,
        tempToken,
        user: { id: user.id, email: user.email, tenantId: user.tenantId },
      };
    }

    // No MFA required, generate full tokens
    return this.generateTokens(user);
  }

  async verifyMfa(userId: string, token: string) {
    const valid = await this.mfaService.verifyToken(userId, token);
    if (!valid) {
      throw new UnauthorizedException('Invalid MFA token');
    }

    const user = await this.usersRepository.findOneBy({ id: userId });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Enable MFA if this is first-time setup
    if (!user.mfaEnabled) {
      await this.mfaService.enableMfa(userId);
    }

    return this.generateTokens(user);
  }

  async refresh(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, { secret: process.env.JWT_REFRESH_SECRET || 'refresh-secret' });
      const user = await this.usersRepository.findOneBy({ id: payload.sub });
      if (!user || user.status !== 'active') {
        throw new UnauthorizedException('Invalid refresh token');
      }
      return this.generateTokens(user);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async validateUser(userId: string): Promise<User> {
    const user = await this.usersRepository.findOneBy({ id: userId });
    if (!user || user.status !== 'active') {
      throw new UnauthorizedException('User not found or inactive');
    }
    return user;
  }

  private generateTokens(user: User) {
    const payload = { sub: user.id, tenantId: user.tenantId, email: user.email };
    const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });
    const refreshToken = this.jwtService.sign(
      { sub: user.id },
      { secret: process.env.JWT_REFRESH_SECRET || 'refresh-secret', expiresIn: '7d' },
    );
    return { accessToken, refreshToken, user: { id: user.id, email: user.email, tenantId: user.tenantId } };
  }
}
