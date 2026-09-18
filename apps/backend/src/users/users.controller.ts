import { Controller, Get, Post, Put, Body, Param, Query, NotFoundException, BadRequestException, UseGuards, Req } from '@nestjs/common';

/* eslint-disable @typescript-eslint/no-empty-object-type */
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import * as bcrypt from 'bcryptjs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { UsersService } from './users.service';
import { User } from './user.entity';
import { UserRole } from '../tenants/user-role.entity';
import { UserPersonLink } from './user-person-link.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard, RequirePermission } from '../auth/permissions.guard';

@ApiTags('users')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    @InjectRepository(UserRole) private userRolesRepo: Repository<UserRole>,
    @InjectRepository(UserPersonLink) private personLinksRepo: Repository<UserPersonLink>,
  ) {}

  @Get()
  @RequirePermission('platform.user', 'view')
  @ApiOperation({ summary: 'List users (platform admin: all; tenant admin: own tenant)' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'tenantId', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  findAll(
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('tenantId') tenantId?: string,
  ) {
    return this.usersService.findAllFiltered({ search, status, tenantId });
  }

  @Get(':id')
  @RequirePermission('platform.user', 'view')
  @ApiOperation({ summary: 'Get user by ID', description: 'Returns user profile (excluding sensitive fields like passwordHash).' })
  @ApiResponse({ status: 200, description: 'User found.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  async findOne(@Param('id') id: string): Promise<User> {
    return this.usersService.findOne(id) as Promise<User>;
  }

  @Post()
  @RequirePermission('platform.user', 'create')
  @ApiOperation({ summary: 'Create a staff user' })
  async create(
    @Body() body: {
      email: string;
      password: string;
      firstName?: string;
      lastName?: string;
      middleName?: string;
      tenantId?: string;
      phone?: string;
      roleIds?: string[];
      employeeId?: string;
    },
    @Req() req: any,
  ): Promise<User> {
    if (!body?.email || !body?.password) {
      throw new BadRequestException('email and password are required');
    }

    const creatorTenantId = req.user?.tenantId;
    const assignedTenantId = creatorTenantId ? creatorTenantId : body.tenantId;

    const user = await this.usersService.create({
      ...body,
      tenantId: assignedTenantId,
      passwordHash: await bcrypt.hash(body.password, 12),
    });

    const userId = user.id;
    const tenantId = user.tenantId;

    // Assign roles if provided
    if (body.roleIds && body.roleIds.length > 0) {
      for (const roleId of body.roleIds) {
        const existing = await this.userRolesRepo.findOne({ where: { userId, roleId, tenantId } });
        if (!existing) {
          const userRole = this.userRolesRepo.create({ userId, roleId, tenantId });
          await this.userRolesRepo.save(userRole);
        }
      }
    }

    // Link to employee if provided (wires the login account to HR profile)
    if (body.employeeId) {
      const existingLink = await this.personLinksRepo.findOne({
        where: { userId, personType: 'employee', tenantId },
      });
      if (!existingLink) {
        const link = this.personLinksRepo.create({
          userId,
          personType: 'employee',
          personId: body.employeeId,
          tenantId,
        });
        await this.personLinksRepo.save(link);
      }
    }

    return user;
  }

  @Put(':id')
  @RequirePermission('platform.user', 'edit')
  @ApiOperation({ summary: 'Update a user profile' })
  update(@Param('id') id: string, @Body() body: Partial<User>): Promise<User> {
    return this.usersService.update(id, body) as Promise<User>;
  }

  @Post(':id/suspend')
  @RequirePermission('platform.user', 'edit')
  @ApiOperation({ summary: 'Suspend a user account' })
  suspend(@Param('id') id: string): Promise<User> {
    return this.usersService.setStatus(id, 'suspended') as Promise<User>;
  }

  @Post(':id/activate')
  @RequirePermission('platform.user', 'edit')
  @ApiOperation({ summary: 'Reactivate a suspended user account' })
  activate(@Param('id') id: string): Promise<User> {
    return this.usersService.setStatus(id, 'active') as Promise<User>;
  }

  @Post(':id/unlock')
  @RequirePermission('platform.user', 'edit')
  @ApiOperation({ summary: 'Clear failed-login lock state' })
  unlock(@Param('id') id: string): Promise<User> {
    return this.usersService.setStatus(id, 'active') as Promise<User>;
  }

  @Post(':id/reset-password')
  @RequirePermission('platform.user', 'edit')
  @ApiOperation({ summary: 'Admin password reset' })
  async resetPassword(@Param('id') id: string, @Body() body: { newPassword: string }): Promise<User> {
    if (!body?.newPassword || body.newPassword.length < 8) {
      throw new BadRequestException('newPassword must be at least 8 characters');
    }
    return this.usersService.setPasswordHash(id, await bcrypt.hash(body.newPassword, 12)) as Promise<User>;
  }

  @Put(':id/roles')
  @RequirePermission('platform.user', 'assign_role')
  @ApiOperation({ summary: 'Assign roles to a user', description: 'Replace all roles for a user in their tenant.' })
  @ApiResponse({ status: 200, description: 'Roles assigned.' })
  async assignRoles(@Param('id') userId: string, @Body() body: { roleIds: string[] }) {
    // Get user's tenantId
    const user = await this.usersService.findOne(userId);
    const tenantId = user.tenantId;
    // Remove existing roles for this user in this tenant
    await this.userRolesRepo.delete({ userId, tenantId });
    // Assign new roles
    const userRoles = body.roleIds.map(roleId => this.userRolesRepo.create({ userId, roleId, tenantId }));
    return this.userRolesRepo.save(userRoles);
  }
}

