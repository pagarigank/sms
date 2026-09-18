import { Controller, Get, Post, Put, Body, Param, Query, Headers, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CashieringService } from './cashiering.service';
import { OptionalIdempotencyGuard } from '../common/idempotency.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard, RequirePermission } from '../auth/permissions.guard';

@ApiTags('cashiering')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('cashiering')
export class CashieringController {
  constructor(private readonly cashieringService: CashieringService) {}

  // === Sessions ===
  @Post('sessions/open')
  @RequirePermission('cashiering.session', 'open')
  @ApiOperation({ summary: 'Open a cashier session with float declaration' })
  async openSession(@Headers('x-tenant-id') tenantId: string, @Body() body: any) {
    return this.cashieringService.openSession({ ...body, tenantId });
  }

  @Put('sessions/:id/close')
  @RequirePermission('cashiering.session', 'open')
  @ApiOperation({ summary: 'Close a cashier session with actual count and variance' })
  async closeSession(
    @Param('id') id: string,
    @Headers('x-tenant-id') tenantId: string,
    @Body() body: any,
  ) {
    return this.cashieringService.closeSession(id, tenantId, body);
  }

  @Get('sessions/open')
  @RequirePermission('cashiering.session', 'view')
  @ApiOperation({ summary: 'Get current open session for cashier' })
  async getOpenSession(
    @Headers('x-tenant-id') tenantId: string,
    @Query('cashierUserId') cashierUserId: string,
  ) {
    return this.cashieringService.getOpenSession(tenantId, cashierUserId);
  }

  @Get('sessions/:id/summary')
  @RequirePermission('cashiering.session', 'view')
  @ApiOperation({ summary: 'Get session summary with payment breakdown' })
  async getSessionSummary(@Param('id') id: string, @Headers('x-tenant-id') tenantId: string) {
    return this.cashieringService.getSessionSummary(id, tenantId);
  }

  // === OR Numbering ===
  @Post('or/allocate')
  @RequirePermission('cashiering.payment', 'create')
  @ApiOperation({ summary: 'Allocate a gapless OR number (transactional)' })
  async allocateOr(
    @Headers('x-tenant-id') tenantId: string,
    @Body() body: { branchId: string },
  ) {
    return this.cashieringService.allocateOrNumber(tenantId, body.branchId);
  }

  @Post('or/reserve-block')
  @RequirePermission('cashiering.payment', 'create')
  @ApiOperation({ summary: 'Reserve a block of OR numbers for offline POS' })
  async reserveOrBlock(
    @Headers('x-tenant-id') tenantId: string,
    @Body() body: { sessionId: string; branchId: string; blockSize: number },
  ) {
    return this.cashieringService.reserveOrBlock(body.sessionId, tenantId, body.branchId, body.blockSize);
  }

  // === Payments ===
  @Post('payments')
  @RequirePermission('cashiering.payment', 'create')
  @ApiOperation({ summary: 'Process a payment (invoice or ad-hoc sale)' })
  async processPayment(@Headers('x-tenant-id') tenantId: string, @Body() body: any) {
    return this.cashieringService.processPayment({ ...body, tenantId });
  }

  @Post('payments/:id/allocate')
  @UseGuards(OptionalIdempotencyGuard)
  @RequirePermission('cashiering.payment', 'create')
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
  @RequirePermission('cashiering.receipt', 'view')
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
  @RequirePermission('cashiering.payment', 'create')
  @ApiOperation({ summary: 'Create a refund request' })
  async createRefund(@Headers('x-tenant-id') tenantId: string, @Body() body: any, @Req() req: any) {
    return this.cashieringService.createRefund({ ...body, tenantId, requestedBy: req.user?.sub ?? req.user?.id });
  }

  @Post('refunds/:id/decide')
  @RequirePermission('cashiering.payment', 'create')
  @ApiOperation({ summary: 'Approve or reject a refund', description: 'Advances the refund approval chain (FR-CFG-4); the final approval applies the ledger and BIR effects atomically.' })
  async decideRefund(
    @Param('id') id: string,
    @Headers('x-tenant-id') tenantId: string,
    @Req() req: any,
    @Body() body: { decision: 'approved' | 'rejected'; reason?: string },
  ) {
    return this.cashieringService.decideRefund(
      id,
      tenantId,
      req.user?.sub ?? req.user?.id,
      body.decision,
      body.reason,
    );
  }

  // === Ad-Hoc Sales ===
  @Post('ad-hoc-sales')
  @UseGuards(OptionalIdempotencyGuard)
  @RequirePermission('cashiering.adhoc', 'view')
  @ApiOperation({ summary: 'Create an ad-hoc sale (non-tuition)' })
  async createAdHocSale(@Headers('x-tenant-id') tenantId: string, @Body() body: any) {
    return this.cashieringService.createAdHocSale({ ...body, tenantId });
  }

  // === Config ===
  @Get('stations')
  @RequirePermission('cashiering.session', 'view')
  @ApiOperation({ summary: 'List cashier stations' })
  async getStations(
    @Headers('x-tenant-id') tenantId: string,
    @Query('branchId') branchId?: string,
  ) {
    return this.cashieringService.getStations(tenantId, branchId);
  }

  @Get('payment-methods')
  @RequirePermission('cashiering.payment', 'view')
  @ApiOperation({ summary: 'List payment methods' })
  async getPaymentMethods(@Headers('x-tenant-id') tenantId: string) {
    return this.cashieringService.getPaymentMethods(tenantId);
  }

  @Get('denomination-sets')
  @RequirePermission('cashiering.session', 'view')
  @ApiOperation({ summary: 'List denomination sets' })
  async getDenominationSets(@Headers('x-tenant-id') tenantId: string) {
    return this.cashieringService.getDenominationSets(tenantId);
  }

  // === Reports ===
  @Get('reports/daily-collection')
  @RequirePermission('cashiering.report', 'view')
  @ApiOperation({ summary: 'Daily collection report by method' })
  async getDailyCollectionReport(
    @Headers('x-tenant-id') tenantId: string,
    @Query('branchId') branchId: string,
    @Query('date') date: string,
  ) {
    return this.cashieringService.getDailyCollectionReport(tenantId, branchId, date);
  }
}