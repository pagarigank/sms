import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBuildingDto {
  @ApiProperty({ description: 'Tenant UUID' })
  tenantId: string;

  @ApiProperty({ description: 'Branch UUID' })
  branchId: string;

  @ApiProperty({ example: 'Main Academic Building', description: 'Building name' })
  name: string;

  @ApiPropertyOptional({ example: 'MAB', description: 'Short code for the building' })
  code?: string;

  @ApiPropertyOptional({ example: '123 Main St, Angeles City', description: 'Address/wing' })
  address?: string;

  @ApiPropertyOptional({ example: 4, description: 'Total number of floors' })
  floorCount?: number;

  @ApiPropertyOptional({ example: 'Building Admin Office', description: 'Building contact info' })
  contact?: string;
}
