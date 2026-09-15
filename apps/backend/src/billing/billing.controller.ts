import { Controller, Get, Post, Put, Delete, Body, Param, Query, Headers, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { BillingService } from './billing.service';

@ApiTags('billing')
@ApiBearerAuth('access-token')
@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  // === Fee Types ===
  @Get('fee-types')
  @ApiOperation({ summary: 'List fee types' })
  async getFeeTypes(@Headers('x-tenant-id') tenantId: string, @Query('isActive') isActive?: string) {
    return this.billingService.getFeeTypes(
      tenantId,
      isActive === 'true' ? true : isActive === 'false' ? false : undefined,
    );
  }

  @Post('fee-types')
  @ApiOperation({ summary: 'Create a fee type' })
  async createFeeType(@Body() data: any, @Headers('x-tenant-id') tenantId: string) {
    return this.billingService.createFeeType({ ...data, tenantId });
  }

  @Put('fee-types/:id')
  @ApiOperation({ summary: 'Update a fee type' })
  async updateFeeType(@Param('id') id: string, @Headers('x-tenant-id') tenantId: string, @Body() data: any) {
    return this.billingService.updateFeeType(id, tenantId, data);
  }

  @Delete('fee-types/:id')
  @ApiOperation({ summary: 'Delete a fee type', description: 'Hard-deletes when unreferenced; soft-retires (isActive=false) when fee-structure items reference it.' })
  async removeFeeType(@Param('id') id: string, @Headers('x-tenant-id') tenantId: string) {
    return this.billingService.removeFeeType(id, tenantId);
  }

  // === Fee Structures ===
  @Get('fee-structures')
  @ApiOperation({ summary: 'List fee structures' })
  async getFeeStructures(
    @Headers('x-tenant-id') tenantId: string,
    @Query('branchId') branchId?: string,
    @Query('schoolYearId') schoolYearId?: string,
    @Query('educationLevelId') educationLevelId?: string,
  ) {
    return this.billingService.getFeeStructures(tenantId, { branchId, schoolYearId, educationLevelId });
  }

  @Post('fee-structures')
  @ApiOperation({ summary: 'Create a fee structure' })
  async createFeeStructure(@Body() data: any, @Headers('x-tenant-id') tenantId: string) {
    return this.billingService.createFeeStructure({ ...data, tenantId });
  }

  @Get('fee-structures/:id/items')
  @ApiOperation({ summary: 'Get fee structure items' })
  async getFeeStructureItems(@Param('id') id: string, @Headers('x-tenant-id') tenantId: string) {
    return this.billingService.getFeeStructureItems(id, tenantId);
  }

  @Post('fee-structures/:id/items')
  @ApiOperation({ summary: 'Add a fee structure item' })
  async addFeeStructureItem(@Param('id') id: string, @Body() data: any, @Headers('x-tenant-id') tenantId: string) {
    return this.billingService.addFeeStructureItem({ ...data, feeStructureId: id, tenantId });
  }

  @Put('fee-structures/items/:id')
  @ApiOperation({ summary: 'Update a fee structure item' })
  async updateFeeStructureItem(@Param('id') id: string, @Headers('x-tenant-id') tenantId: string, @Body() data: any) {
    return this.billingService.updateFeeStructureItem(id, tenantId, data);
  }

  @Delete('fee-structures/items/:id')
  @ApiOperation({ summary: 'Delete a fee structure item' })
  async deleteFeeStructureItem(@Param('id') id: string, @Headers('x-tenant-id') tenantId: string) {
    return this.billingService.deleteFeeStructureItem(id, tenantId);
  }

  @Get('fee-structures/resolve')
  @ApiOperation({ summary: 'Resolve fee structure for an enrollment' })
  async resolveFeeStructure(
    @Headers('x-tenant-id') tenantId: string,
    @Query('branchId') branchId?: string,
    @Query('schoolYearId') schoolYearId?: string,
    @Query('educationLevelId') educationLevelId?: string,
    @Query('gradeLevelId') gradeLevelId?: string,
    @Query('strandId') strandId?: string,
    @Query('programId') programId?: string,
    @Query('termId') termId?: string,
  ) {
    return this.billingService.resolveFeeStructure(tenantId, {
      branchId, schoolYearId: schoolYearId!, educationLevelId, gradeLevelId, strandId, programId, termId,
    });
  }

  // === Discount Types ===
  @Get('discount-types')
  @ApiOperation({ summary: 'List discount types' })
  async getDiscountTypes(@Headers('x-tenant-id') tenantId: string) {
    return this.billingService.getDiscountTypes(tenantId);
  }

  @Post('discount-types')
  @ApiOperation({ summary: 'Create a discount type' })
  async createDiscountType(@Body() data: any, @Headers('x-tenant-id') tenantId: string) {
    return this.billingService.createDiscountType({ ...data, tenantId });
  }

  // === Discount Grants ===
  @Get('discount-grants')
  @ApiOperation({ summary: 'List discount grants' })
  async getDiscountGrants(@Headers('x-tenant-id') tenantId: string, @Query('studentId') studentId?: string) {
    return this.billingService.getDiscountGrants(tenantId, studentId);
  }

  @Post('discount-grants')
  @ApiOperation({ summary: 'Create a discount grant' })
  async createDiscountGrant(@Body() data: any, @Headers('x-tenant-id') tenantId: string) {
    return this.billingService.createDiscountGrant({ ...data, tenantId });
  }

  @Put('discount-grants/:id/approve')
  @ApiOperation({ summary: 'Approve a discount grant' })
  async approveDiscountGrant(@Param('id') id: string, @Headers('x-tenant-id') tenantId: string) {
    return this.billingService.approveDiscountGrant(id, tenantId, 'system');
  }

  // === Payment Plans ===
  @Get('payment-plans')
  @ApiOperation({ summary: 'List payment plans' })
  async getPaymentPlans(@Headers('x-tenant-id') tenantId: string) {
    return this.billingService.getPaymentPlans(tenantId);
  }

  @Post('payment-plans')
  @ApiOperation({ summary: 'Create a payment plan' })
  async createPaymentPlan(@Body() data: any, @Headers('x-tenant-id') tenantId: string) {
    return this.billingService.createPaymentPlan({ ...data, tenantId });
  }

  // === Penalty Rules ===
  @Get('penalty-rules')
  @ApiOperation({ summary: 'List penalty rules' })
  async getPenaltyRules(@Headers('x-tenant-id') tenantId: string) {
    return this.billingService.getPenaltyRules(tenantId);
  }

  @Post('penalty-rules')
  @ApiOperation({ summary: 'Create a penalty rule' })
  async createPenaltyRule(@Body() data: any, @Headers('x-tenant-id') tenantId: string) {
    return this.billingService.createPenaltyRule({ ...data, tenantId });
  }

  // === Withdrawal Policies ===
  @Get('withdrawal-policies')
  @ApiOperation({ summary: 'List withdrawal policies' })
  async getWithdrawalPolicies(@Headers('x-tenant-id') tenantId: string) {
    return this.billingService.getWithdrawalPolicies(tenantId);
  }

  @Post('withdrawal-policies')
  @ApiOperation({ summary: 'Create a withdrawal policy' })
  async createWithdrawalPolicy(@Body() data: any, @Headers('x-tenant-id') tenantId: string) {
    return this.billingService.createWithdrawalPolicy({ ...data, tenantId });
  }

  // === Withdrawal / Refund Quotes ===
  @Get('refunds/quote')
  @ApiOperation({ summary: 'Quote a withdrawal refund for an enrollment', description: 'Applies the tenant\'s withdrawal policies (bracket + pro-rate) against payments made for the enrollment. Query params: enrollmentId, withdrawalDate (ISO date, defaults to now). Read-only.' })
  async quoteRefund(
    @Headers('x-tenant-id') tenantId: string,
    @Query('enrollmentId') enrollmentId: string,
    @Query('withdrawalDate') withdrawalDate?: string,
  ) {
    if (!enrollmentId) throw new BadRequestException('enrollmentId query parameter is required');
    const when = withdrawalDate ? new Date(withdrawalDate) : new Date();
    if (isNaN(when.getTime())) throw new BadRequestException('withdrawalDate must be a valid ISO date');
    return this.billingService.computeRefund(tenantId, enrollmentId, when);
  }
}
