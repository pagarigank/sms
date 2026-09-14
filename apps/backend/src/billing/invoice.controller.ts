import { Controller, Get, Post, Put, Body, Param, Query, Headers } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { InvoiceService } from './invoice.service';

@ApiTags('invoices')
@ApiBearerAuth('access-token')
@Controller('invoices')
export class InvoiceController {
  constructor(private readonly invoiceService: InvoiceService) {}

  @Get()
  @ApiOperation({ summary: 'List invoices' })
  async listInvoices(
    @Headers('x-tenant-id') tenantId: string,
    @Query('studentId') studentId?: string,
    @Query('enrollmentId') enrollmentId?: string,
    @Query('status') status?: string,
  ) {
    return this.invoiceService.getInvoices(tenantId, { studentId, enrollmentId, status });
  }

  // NOTE: literal routes MUST be declared before the :id parameter route,
  // otherwise NestJS matches "reports"/"student" as an :id.
  @Get('reports/ar-aging')
  @ApiOperation({ summary: 'Get AR Aging report' })
  async getARAging(@Headers('x-tenant-id') tenantId: string, @Query('branchId') branchId?: string) {
    return this.invoiceService.getARAging(tenantId, branchId);
  }

  @Get('student/:studentId/soa')
  @ApiOperation({ summary: 'Get Statement of Account for a student' })
  async getSOA(@Param('studentId') studentId: string, @Headers('x-tenant-id') tenantId: string) {
    return this.invoiceService.getStatementOfAccount(studentId, tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get invoice by ID with items' })
  async getInvoice(@Param('id') id: string, @Headers('x-tenant-id') tenantId: string) {
    return this.invoiceService.getInvoiceById(id, tenantId);
  }

  @Post('generate')
  @ApiOperation({ summary: 'Generate an invoice for an enrollment' })
  async generateInvoice(@Body() data: any, @Headers('x-tenant-id') tenantId: string) {
    return this.invoiceService.generateInvoice({ ...data, tenantId });
  }

  @Put(':id/apply-discount')
  @ApiOperation({ summary: 'Apply a discount to an invoice' })
  async applyDiscount(
    @Param('id') id: string,
    @Headers('x-tenant-id') tenantId: string,
    @Body() body: { discountAmount: number },
  ) {
    return this.invoiceService.applyDiscount(id, tenantId, body.discountAmount);
  }

  @Put(':id/apply-payment')
  @ApiOperation({ summary: 'Apply a payment to an invoice' })
  async applyPayment(
    @Param('id') id: string,
    @Headers('x-tenant-id') tenantId: string,
    @Body() body: { amount: number },
  ) {
    return this.invoiceService.applyPayment(id, tenantId, body.amount);
  }
}
