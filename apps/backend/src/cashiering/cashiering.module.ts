import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CashierStation } from './cashier-station.entity';
import { PaymentMethod } from './payment-method.entity';
import { DenominationSet } from './denomination-set.entity';
import { CashierSession } from './cashier-session.entity';
import { AtpSeries } from './atp-series.entity';
import { SeriesCounter } from './series-counter.entity';
import { Payment } from './payment.entity';
import { PaymentAllocation } from './payment-allocation.entity';
import { OfficialReceipt } from './official-receipt.entity';
import { Refund } from './refund.entity';
import { AdHocSale } from './ad-hoc-sale.entity';
import { AdHocSaleItem } from './ad-hoc-sale-item.entity';
import { CashieringService } from './cashiering.service';
import { CashieringController } from './cashiering.controller';
import { XenditAdapter } from './xendit.adapter';
import { BillingModule } from '../billing/billing.module';
import { ConfigEngineModule } from '../config/config.module';

const CASHIERING_ENTITIES = [
  CashierStation, PaymentMethod, DenominationSet, CashierSession,
  AtpSeries, SeriesCounter, Payment, PaymentAllocation,
  OfficialReceipt, Refund, AdHocSale, AdHocSaleItem,
];

@Module({
  imports: [BillingModule, ConfigEngineModule, TypeOrmModule.forFeature(CASHIERING_ENTITIES)],
  controllers: [CashieringController],
  providers: [CashieringService, XenditAdapter],
  exports: [CashieringService, XenditAdapter],
})
export class CashieringModule {}
