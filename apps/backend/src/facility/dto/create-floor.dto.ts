import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateFloorDto {
  @ApiProperty({ description: 'Tenant UUID' })
  tenantId: string;

  @ApiProperty({ description: 'Parent building UUID' })
  buildingId: string;

  @ApiProperty({ example: 'Ground Floor', description: 'Floor label' })
  label: string;

  @ApiPropertyOptional({ example: 0, description: 'Floor number (0 = ground, 1 = first, etc.)' })
  floorNumber?: number;
}
