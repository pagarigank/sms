import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FeeType } from './fee-type.entity';
import { FeeStructure } from './fee-structure.entity';
import { FeeStructureItem } from './fee-structure-item.entity';
import { DiscountType } from './discount-type.entity';
import { StudentDiscountGrant } from './student-discount-grant.entity';
import { PaymentPlan } from './payment-plan.entity';
import { InstallmentSchedule } from './installment-schedule.entity';
import { PenaltyRule } from './penalty-rule.entity';
import { WithdrawalPolicy } from './withdrawal-policy.entity';
import { Invoice } from './invoice.entity';
import { InvoiceItem } from './invoice-item.entity';
import { Enrollment } from '../sis/enrollment.entity';
import { Student } from '../sis/student.entity';
import { SchoolYear } from '../academic/school-year.entity';
import { Curriculum } from '../academic/curriculum.entity';
import { BillingService } from './billing.service';
import { InvoiceService } from './invoice.service';
import { BillingController } from './billing.controller';
import { InvoiceController } from './invoice.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      FeeType,
      FeeStructure,
      FeeStructureItem,
      DiscountType,
      StudentDiscountGrant,
      PaymentPlan,
      InstallmentSchedule,
      PenaltyRule,
      WithdrawalPolicy,
      Invoice,
      InvoiceItem,
      Enrollment,
      Student,
      SchoolYear,
      Curriculum,
    ]),
  ],
  providers: [BillingService, InvoiceService],
  controllers: [BillingController, InvoiceController],
  exports: [BillingService, InvoiceService],
})
export class BillingModule {}
