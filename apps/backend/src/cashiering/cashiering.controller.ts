import { Controller, Get, Post, Put, Body, Param, Query, Headers, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CashieringService } from './cashiering.service';
import { OptionalIdempotencyGuard } from '../common/idempotency.guard';

@ApiTags('cashiering')
@ApiBearerAuth('access-token')
@Controller('cashiering')
export class CashieringController {
  constructor(private readonly cashieringService: CashieringService) {}

  // === Sessions ===
  @Post('sessions/open')
  @ApiOperation({ summary: 'Open a cashier session with float declaration' })
  async openSession(@Headers('x-tenant-id') tenantId: string, @Body() body: any) {
    return this.cashieringService.openSession({ ...body, tenantId });
  }

  @Put('sessions/:id/close')
  @ApiOperation({ summary: 'Close a cashier session with actual count and variance' })
  async closeSession(
    @Param('id') id: string,
    @Headers('x-tenant-id') tenantId: string,
    @Body() body: any,
  ) {
    return this.cashieringService.closeSession(id, tenantId, body);
  }

  @Get('sessions/open')
  @ApiOperation({ summary: 'Get current open session for cashier' })
  async getOpenSession(
    @Headers('x-tenant-id') tenantId: string,
    @Query('cashierUserId') cashierUserId: string,
  ) {
    return this.cashieringService.getOpenSession(tenantId, cashierUserId);
  }

  @Get('sessions/:id/summary')
  @ApiOperation({ summary: 'Get session summary with payment breakdown' })
  async getSessionSummary(@Param('id') id: string, @Headers('x-tenant-id') tenantId: string) {
    return this.cashieringService.getSessionSummary(id, tenantId);
  }

  // === OR Numbering ===
  @Post('or/allocate')
  @ApiOperation({ summary: 'Allocate a gapless OR number (transactional)' })
  async allocateOr(
    @Headers('x-tenant-id') tenantId: string,
    @Body() body: { branchId: string },
  ) {
    return this.cashieringService.allocateOrNumber(tenantId, body.branchId);
  }

  @Post('or/reserve-block')
  @ApiOperation({ summary: 'Reserve a block of OR numbers for offline POS' })
  async reserveOrBlock(
    @Headers('x-tenant-id') tenantId: string,
    @Body() body: { sessionId: string; branchId: string; blockSize: number },
  ) {
    return this.cashieringService.reserveOrBlock(body.sessionId, tenantId, body.branchId, body.blockSize);
  }

  // === Payments ===
  @Post('payments')
  @ApiOperation({ summary: 'Process a payment (invoice or ad-hoc sale)' })
  async processPayment(@Headers('x-tenant-id') tenantId: string, @Body() body: any) {
    return this.cashieringService.processPayment({ ...body, tenantId });
  }

  @Post('payments/:id/allocate')
  @UseGuards(OptionalIdempotencyGuard)
  @ApiOperation({ summary: 'Allocate payment across invoices' })
  async allocatePayment(
    @Param('id') id: string,
    @Headers('x-tenant-id') tenantId: string,
    @Body() body: { allocations: { invoiceId: string; amountApplied: number }[] },
  ) {
    return this.cashieringService.allocatePayment(id, tenantId, body.allocations);
  }

  // === Refunds ===
  @Put('receipts/:id/void')
  @UseGuards(OptionalIdempotencyGuard)
  @ApiOperation({ summary: 'Void an official receipt' })
  async voidReceipt(
    @Param('id') id: string,
    @Headers('x-tenant-id') tenantId: string,
    @Body() body: { reason: string; voidedBy: string },
  ) {
    return this.cashieringService.voidReceipt(id, tenantId, body.reason, body.voidedBy);
  }

  @Post('refunds')
  @UseGuards(OptionalIdempotencyGuard)
  @ApiOperation({ summary: 'Create a refund request' })
  async createRefund(@Headers('x-tenant-id') tenantId: string, @Body() body: any) {
    return this.cashieringService.createRefund({ ...body, tenantId });
  }

  // === Ad-Hoc Sales ===
  @Post('ad-hoc-sales')
  @UseGuards(OptionalIdempotencyGuard)
  @ApiOperation({ summary: 'Create an ad-hoc sale (non-tuition)' })
  async createAdHocSale(@Headers('x-tenant-id') tenantId: string, @Body() body: any) {
    return this.cashieringService.createAdHocSale({ ...body, tenantId });
  }

  // === Config ===
  @Get('stations')
  @ApiOperation({ summary: 'List cashier stations' })
  async getStations(
    @Headers('x-tenant-id') tenantId: string,
    @Query('branchId') branchId?: string,
  ) {
    return this.cashieringService.getStations(tenantId, branchId);
  }

  @Get('payment-methods')
  @ApiOperation({ summary: 'List payment methods' })
  async getPaymentMethods(@Headers('x-tenant-id') tenantId: string) {
    return this.cashieringService.getPaymentMethods(tenantId);
  }

  @Get('denomination-sets')
  @ApiOperation({ summary: 'List denomination sets' })
  async getDenominationSets(@Headers('x-tenant-id') tenantId: string) {
    return this.cashieringService.getDenominationSets(tenantId);
  }

  // === Reports ===
  @Get('reports/daily-collection')
  @ApiOperation({ summary: 'Daily collection report by method' })
  async getDailyCollectionReport(
    @Headers('x-tenant-id') tenantId: string,
    @Query('branchId') branchId: string,
    @Query('date') date: string,
  ) {
    return this.cashieringService.getDailyCollectionReport(tenantId, branchId, date);
  }
}
