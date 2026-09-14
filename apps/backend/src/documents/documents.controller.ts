import { Controller, Get, Post, Put, Body, Param, Query, Headers } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DocumentsService } from './documents.service';

@ApiTags('documents')
@ApiBearerAuth('access-token')
@Controller('documents')
export class DocumentsController {
  constructor(private readonly docsService: DocumentsService) {}

  // === Templates ===
  @Get('templates')
  @ApiOperation({ summary: 'List document templates' })
  async getTemplates(
    @Headers('x-tenant-id') tenantId: string,
    @Query('documentType') documentType?: string,
  ) {
    return this.docsService.getTemplates(tenantId, documentType);
  }

  @Post('templates')
  @ApiOperation({ summary: 'Create document template' })
  async createTemplate(@Headers('x-tenant-id') tenantId: string, @Body() body: any) {
    return this.docsService.createTemplate({ ...body, tenantId });
  }

  @Put('templates/:id')
  @ApiOperation({ summary: 'Update document template' })
  async updateTemplate(
    @Param('id') id: string,
    @Headers('x-tenant-id') tenantId: string,
    @Body() body: any,
  ) {
    return this.docsService.updateTemplate(id, tenantId, body);
  }

  // === Requests ===
  @Get('requests')
  @ApiOperation({ summary: 'List document requests' })
  async getRequests(
    @Headers('x-tenant-id') tenantId: string,
    @Query('studentId') studentId?: string,
    @Query('status') status?: string,
  ) {
    return this.docsService.getRequests(tenantId, { studentId, status });
  }

  @Post('requests')
  @ApiOperation({ summary: 'Create document request' })
  async createRequest(@Headers('x-tenant-id') tenantId: string, @Body() body: any) {
    return this.docsService.createRequest({ ...body, tenantId });
  }

  @Put('requests/:id/approve')
  @Put('requests/:id/status')
  @ApiOperation({ summary: 'Update request status (fee_assessed | paid | rejected)' })
  async updateRequestStatus(
    @Param('id') id: string,
    @Headers('x-tenant-id') tenantId: string,
    @Body() body: { status: string },
  ) {
    return this.docsService.updateRequestStatus(id, tenantId, body.status);
  }

  @Put('requests/:id/approve')
  @ApiOperation({ summary: 'Approve and release document' })
  async approveRequest(
    @Param('id') id: string,
    @Headers('x-tenant-id') tenantId: string,
    @Body() body: { releasedBy: string },
  ) {
    return this.docsService.approveRequest(id, tenantId, body.releasedBy);
  }

  // === Generated Documents ===
  @Post('generate')
  @ApiOperation({ summary: 'Generate a document from template' })
  async generateDocument(@Headers('x-tenant-id') tenantId: string, @Body() body: any) {
    return this.docsService.generateDocument({ ...body, tenantId });
  }

  @Get('generated')
  @ApiOperation({ summary: 'List generated documents' })
  async getGeneratedDocs(
    @Headers('x-tenant-id') tenantId: string,
    @Query('studentId') studentId?: string,
  ) {
    return this.docsService.getGeneratedDocs(tenantId, studentId);
  }

  @Get('verify/:code')
  @ApiOperation({ summary: 'Verify document authenticity by verification code' })
  async verifyDocument(@Param('code') code: string) {
    return this.docsService.verifyDocument(code);
  }

  @Put('generated/:id/void')
  @ApiOperation({ summary: 'Void a generated document' })
  async voidDocument(
    @Param('id') id: string,
    @Headers('x-tenant-id') tenantId: string,
  ) {
    return this.docsService.voidDocument(id, tenantId);
  }
}
