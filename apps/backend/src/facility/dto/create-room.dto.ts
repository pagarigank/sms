import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRoomDto {
  @ApiProperty({ description: 'Tenant UUID' })
  tenantId: string;

  @ApiProperty({ description: 'Branch UUID' })
  branchId: string;

  @ApiProperty({ description: 'Parent floor UUID' })
  floorId: string;

  @ApiProperty({ example: 'Room 101', description: 'Room name/number' })
  name: string;

  @ApiProperty({ example: 'classroom', description: 'Room type (FK → lookup_items)' })
  roomType: string;

  @ApiPropertyOptional({ example: 40, description: 'Room capacity' })
  capacity?: number;

  @ApiPropertyOptional({ example: 'Rows of 2', description: 'Seating layout descriptor' })
  seatingLayout?: string;

  @ApiPropertyOptional({ example: 'active', enum: ['active', 'under_maintenance', 'closed'], description: 'Room status' })
  status?: string;

  @ApiPropertyOptional({ example: ['projector', 'aircon'], description: 'Equipment tags' })
  equipmentTags?: string[];
}
