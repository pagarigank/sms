import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsUUID, IsArray, IsOptional, IsBoolean } from 'class-validator';

export class CreateDepartmentDto {
  @ApiProperty({ example: 'Elementary Department', description: 'Department display name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'ELEM', description: 'Short code (ELEM, JHS, SHS, COL)' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ description: 'UUID of the parent branch' })
  @IsUUID()
  branchId: string;

  @ApiProperty({ description: 'Tenant ID this department belongs to' })
  @IsUUID()
  tenantId: string;

  @ApiProperty({
    example: ['elementary', 'kindergarten'],
    description: 'Array of education_level UUIDs this department covers',
  })
  @IsArray()
  @IsUUID('4', { each: true })
  educationLevelIds: string[];

  @ApiPropertyOptional({ default: false, description: 'Is this the default department for the branch?' })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiPropertyOptional({ example: 'elem@holyangel.edu.ph', description: 'Department contact email' })
  @IsOptional()
  @IsString()
  contactEmail?: string;
}
