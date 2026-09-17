import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportTemplate } from './report-template.entity';
import { ScheduledReport } from './scheduled-report.entity';
import { Tenant } from '../tenants/tenant.entity';
import { ReportingService } from './reporting.service';
import { ReportingController } from './reporting.controller';
import { ScheduledReportDispatcher } from './scheduled-report-dispatcher.service';
import { CommunicationsModule } from '../communications/communications.module';
import { SfFormsService } from './sf-forms.service';
import { SfFormsController } from './sf-forms.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([ReportTemplate, ScheduledReport, Tenant]),
    CommunicationsModule,
  ],
  controllers: [ReportingController, SfFormsController],
  providers: [ReportingService, ScheduledReportDispatcher, SfFormsService],
  exports: [ReportingService, SfFormsService],
})
export class ReportingModule {}
