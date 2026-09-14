import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Employee } from './employee.entity';
import { TeachingLoad } from './teaching-load.entity';
import { DtrRecord } from './dtr-record.entity';
import { HrService } from './hr.service';
import { HrController } from './hr.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Employee, TeachingLoad, DtrRecord])],
  controllers: [HrController],
  providers: [HrService],
  exports: [HrService],
})
export class HrModule {}
