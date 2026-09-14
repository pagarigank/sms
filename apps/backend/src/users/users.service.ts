import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, IsNull, Not } from 'typeorm';
import { User } from './user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  findAll(tenantId: string): Promise<User[]> {
    return this.usersRepository.find({ where: { tenantId } });
  }

  findAllFiltered(filters: { search?: string; status?: string; tenantId?: string }): Promise<User[]> {
    const where: any = {};
    if (filters.status) where.status = filters.status;
    if (filters.tenantId) where.tenantId = filters.tenantId;
    if (filters.search) {
      where.email = Like(`%${filters.search}%`);
    }
    // Never leak password hashes over the wire.
    return this.usersRepository.find({
      where,
      select: [
        'id', 'tenantId', 'email', 'firstName', 'lastName', 'middleName',
        'phone', 'status', 'mfaEnabled', 'lastLoginAt', 'createdAt', 'updatedAt',
      ],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<User> {
    const user = await this.usersRepository.findOneBy({ id });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    const { passwordHash, mfaSecret, ...safe } = user as any;
    return safe as User;
  }

  findByEmail(email: string, tenantId: string): Promise<User | null> {
    return this.usersRepository.findOneBy({ email, tenantId });
  }

  async create(data: {
    email: string;
    passwordHash: string;
    firstName?: string;
    lastName?: string;
    middleName?: string;
    tenantId?: string;
    phone?: string;
  }): Promise<User> {
    let tenantId = data.tenantId;
    if (!tenantId) {
      const first = await this.usersRepository.manager
        .getRepository('Tenant')
        .findOne({ where: { status: 'active' } });
      tenantId = (first as any)?.id;
    }
    if (!tenantId) throw new NotFoundException('No active tenant found; tenantId is required');

    const user = this.usersRepository.create({
      email: data.email,
      phone: data.phone,
      firstName: data.firstName,
      lastName: data.lastName,
      middleName: data.middleName,
      passwordHash: data.passwordHash,
      tenantId,
    });
    const saved = await this.usersRepository.save(user);
    const { passwordHash, mfaSecret, ...safe } = saved as any;
    return safe as User;
  }

  async update(id: string, data: Partial<User>): Promise<User> {
    const user = await this.usersRepository.findOneBy({ id });
    if (!user) throw new NotFoundException(`User with ID ${id} not found`);
    // Never allow password/mfa changes through the generic update endpoint.
    const { passwordHash, mfaSecret, mfaEnabled, status, tenantId, ...rest } = data as any;
    Object.assign(user, rest);
    const saved = await this.usersRepository.save(user);
    const { passwordHash: ph, mfaSecret: ms, ...safe } = saved as any;
    return safe;
  }

  async setStatus(id: string, status: string): Promise<User> {
    await this.usersRepository.update(id, { status });
    return this.findOne(id);
  }

  async setPasswordHash(id: string, passwordHash: string): Promise<User> {
    await this.usersRepository.update(id, { passwordHash });
    return this.findOne(id);
  }
}
