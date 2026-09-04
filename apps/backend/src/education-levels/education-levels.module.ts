import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EducationLevel } from './education-level.entity';

@Module({
  imports: [TypeOrmModule.forFeature([EducationLevel])],
  controllers: [],
  providers: [],
})
export class EducationLevelsModule {}
