import { Controller, Get, Post, Put, Body, Param, Query, Headers, Req, Res, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { DocumentsService } from './documents.service';
import { PdfService } from './pdf.service';
import { PolicyService } from '../iam/policy.service';
import { StudentAccessService } from '../auth/student-access.service';
import { resolveStaffPermission } from '../auth/api-permissions';
import { RequirePermission } from '../auth/permissions.guard';

@ApiTags('documents')
@ApiBearerAuth('access-token')
@Controller('documents')
export class DocumentsController {
  constructor(
    private readonly docsService: DocumentsService,
    private readonly pdf: PdfService,
    private readonly policy: PolicyService,
    private readonly studentAccess: StudentAccessService,
  ) {}

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

  // === Branding preview ===
  /**
   * Render a sample document header under the tenant's saved branding (or an
   * unsaved draft posted by the editor) so admins can see exactly what issued
   * documents will look like — before issuing any.
   *
   * Explicit staff permission (instead of the declarative map, which has no
   * entry for this route): rendering a tenant's branding is a template-
   * management concern. The guard's platform-admin bypass covers the
   * platform-admin editor; guardians/guarded roles are denied. Returns the
   * PDF inline — nothing is stored, no DB record is created.
   */
  @Post('branding/preview')
  @RequirePermission('document.template', 'view')
  @ApiOperation({ summary: 'Preview the branded document header as a PDF' })
  async previewBranding(
    @Headers('x-tenant-id') tenantId: string,
    @Body() body: { branding?: Record<string, unknown>; sample?: string },
    @Res() res: Response,
  ) {
    const bytes = await this.docsService.previewBranding({
      tenantId,
      brandingDraft: body?.branding ?? null,
      sample: body?.sample,
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="branding-preview.pdf"');
    res.setHeader('Content-Length', String(bytes.length));
    res.send(Buffer.from(bytes));
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

  /**
   * Download the generated PDF. Guardians may only download their own
   * children's documents — this route carries no studentId, so the global
   * SelfServiceScopeGuard has nothing to narrow on and the check happens here.
   * Staff holding the route's own permission keep full access.
   *
   * Clients fetch this with their Authorization header (blob download), not
   * browser navigation — the global JwtAuthGuard rejects header-less requests.
   */
  @Get('generated/:id/file')
  @ApiOperation({ summary: 'Download the generated PDF for a document' })
  async downloadGenerated(
    @Param('id') id: string,
    @Headers('x-tenant-id') tenantId: string,
    @Req() req: any,
    @Res() res: Response,
  ) {
    const user = req.user;
    if (!user) {
      throw new NotFoundException('Document not found');
    }

    const doc = await this.docsService.getGeneratedDoc(id, tenantId);

    const userId: string = user.sub ?? user.id;
    const staffPermission = resolveStaffPermission('GET', `/api/v1/documents/generated/${id}/file`);
    const isStaff =
      staffPermission &&
      (await this.policy.hasPermission(userId, tenantId, staffPermission.resource, staffPermission.action));
    if (!isStaff) {
      await this.studentAccess.assertStudentAccess(userId, tenantId, doc.studentId);
    }

    if (doc.isVoided) {
      throw new NotFoundException('Document is voided');
    }

    let bytes: Buffer;
    try {
      bytes = this.pdf.read(doc.fileUrl);
    } catch {
      throw new NotFoundException('Document file is missing from storage');
    }

    const filename = `${doc.verificationCode}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    res.setHeader('Content-Length', String(bytes.length));
    res.send(bytes);
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

