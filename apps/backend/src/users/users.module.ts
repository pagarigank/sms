import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './user.entity';
import { UserSession } from './user-session.entity';
import { UserPersonLink } from './user-person-link.entity';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { SessionService } from './session.service';
import { UserRole } from '../tenants/user-role.entity';
import { Employee } from '../hr/employee.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, UserSession, UserPersonLink, UserRole, Employee])],
  controllers: [UsersController],
  providers: [UsersService, SessionService],
  exports: [UsersService, SessionService],
})
export class UsersModule {}
