import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './user.entity';
import { UserSession } from './user-session.entity';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { SessionService } from './session.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, UserSession])],
  controllers: [UsersController],
  providers: [UsersService, SessionService],
  exports: [UsersService, SessionService],
})
export class UsersModule {}
