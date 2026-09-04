import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDepartmentDto {
  @ApiProperty({ example: 'Elementary Department', description: 'Department display name' })
  name: string;

  @ApiProperty({ example: 'ELEM', description: 'Short code (ELEM, JHS, SHS, COL)' })
  code: string;

  @ApiProperty({ description: 'UUID of the parent branch' })
  branchId: string;

  @ApiProperty({ description: 'Tenant ID this department belongs to' })
  tenantId: string;

  @ApiProperty({ example: ['elementary', 'kindergarten'], description: 'Array of education_level UUIDs this department covers' })
  educationLevelIds: string[];

  @ApiPropertyOptional({ default: false, description: 'Is this the default department for the branch?' })
  isDefault?: boolean;

  @ApiPropertyOptional({ example: 'elem@holyangel.edu.ph', description: 'Department contact email' })
  contactEmail?: string;
}
