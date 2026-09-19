import { Controller, Get, Post, Put, Patch, Body, Param, Query, Headers, Req, UseGuards } from '@nestjs/common';
import { GradingService } from './grading.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard, RequirePermission } from '../auth/permissions.guard';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('grading')
export class GradingController {
  constructor(private readonly gradingService: GradingService) {}

  private getTenantId(headers: any): string {
    return headers['x-tenant-id'];
  }

  // ============================
  // Grading Systems
  // ============================
  @Get('systems')
  @RequirePermission('grading.system', 'view')
  listGradingSystems(@Headers() headers, @Query() query) {
    return this.gradingService.listGradingSystems(this.getTenantId(headers), query);
  }

  @Get('systems/resolve')
  @RequirePermission('grading.system', 'view')
  resolveGradingSystem(@Headers() headers, @Query() query) {
    return this.gradingService.resolveGradingSystem(this.getTenantId(headers), query);
  }

  @Post('systems')
  @RequirePermission('grading.system', 'create')
  createGradingSystem(@Headers() headers, @Body() body) {
    return this.gradingService.createGradingSystem(this.getTenantId(headers), body);
  }

  @Patch('systems/:id')
  @RequirePermission('grading.system', 'edit')
  updateGradingSystem(@Headers() headers, @Param('id') id: string, @Body() body) {
    return this.gradingService.updateGradingSystem(this.getTenantId(headers), id, body);
  }

  /** Returns DepEd standard grading system presets (DO 015 s.2026). */
  @Get('presets')
  @RequirePermission('grading.system', 'view')
  getPresets(@Query('tier') tier?: string) {
    return this.gradingService.getPresets(tier);
  }

  /**
   * Seeds a DepEd preset grading system for a given education level and school year.
   * Creates the GradingSystem + all GradeComponent rows in one call.
   */
  @Post('systems/seed-deped')
  @RequirePermission('grading.system', 'create')
  seedDepEdSystem(
    @Headers() headers,
    @Body() body: { tier: string; educationLevelId: string; schoolYearId: string; branchId?: string },
  ) {
    return this.gradingService.seedDepEdSystem(
      this.getTenantId(headers),
      body.tier as any,
      body.educationLevelId,
      body.schoolYearId,
      body.branchId,
    );
  }

  // ============================
  // Grade Components
  // ============================
  @Get('systems/:systemId/components')
  @RequirePermission('grading.component', 'view')
  listComponents(@Headers() headers, @Param('systemId') systemId: string) {
    return this.gradingService.listComponents(this.getTenantId(headers), systemId);
  }

  @Post('components')
  @RequirePermission('grading.component', 'create')
  createComponent(@Headers() headers, @Body() body) {
    return this.gradingService.createComponent(this.getTenantId(headers), body);
  }

  // ============================
  // Grade Entries
  // ============================
  @Get('class/:classOfferingId/gradebook')
  @RequirePermission('grading.gradebook', 'view')
  getGradebook(@Headers() headers, @Param('classOfferingId') classOfferingId: string, @Req() req: any) {
    const userId = req.user?.id || req.user?.sub;
    return this.gradingService.getGradebook(this.getTenantId(headers), classOfferingId, userId);
  }

  @Post('entries')
  @RequirePermission('grading.gradebook', 'edit')
  enterGrade(@Headers() headers, @Body() body, @Req() req: any) {
    // Ideally user ID comes from auth context, for now we mock or use body if available
    const userId = req.user?.id || req.user?.sub;
    return this.gradingService.enterGrade(this.getTenantId(headers), body, userId);
  }

  @Post('entries/:id/override')
  @RequirePermission('grading.gradebook', 'edit')
  overrideGrade(@Headers() headers, @Param('id') id: string, @Body() body, @Req() req: any) {
    const userId = req.user?.id || req.user?.sub;
    return this.gradingService.overrideGrade(this.getTenantId(headers), id, body, userId);
  }

  @Post('entries/bulk')
  @RequirePermission('grading.gradebook', 'edit')
  bulkEnterGrades(@Headers() headers, @Body() body, @Req() req: any) {
    const userId = req.user?.id || req.user?.sub;
    return this.gradingService.bulkEnterGrades(this.getTenantId(headers), body, userId);
  }

  @Post('class/:classOfferingId/finalize')
  @RequirePermission('grading.report_card', 'approve')
  finalizeGrades(@Headers() headers, @Param('classOfferingId') classOfferingId: string, @Query('termId') termId: string) {
    return this.gradingService.finalizeGrades(this.getTenantId(headers), classOfferingId, termId);
  }

  // ============================
  // Honor Roll Config
  // ============================
  @Get('honor-roll')
  @RequirePermission('grading.honorroll', 'view')
  listHonorRollConfigs(@Headers() headers, @Query() query) {
    return this.gradingService.listHonorRollConfigs(this.getTenantId(headers), query);
  }

  @Post('honor-roll')
  @RequirePermission('grading.honorroll', 'create')
  createHonorRollConfig(@Headers() headers, @Body() body) {
    return this.gradingService.createHonorRollConfig(this.getTenantId(headers), body);
  }
}