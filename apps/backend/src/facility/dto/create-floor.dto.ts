import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsString, IsNotEmpty, IsOptional, IsNumber } from 'class-validator';

export class CreateFloorDto {
  @ApiProperty({ description: 'Tenant UUID' })
  @IsUUID()
  tenantId: string;

  @ApiProperty({ description: 'Parent building UUID' })
  @IsUUID()
  buildingId: string;

  @ApiProperty({ example: 'Ground Floor', description: 'Floor label' })
  @IsString()
  @IsNotEmpty()
  label: string;

  @ApiPropertyOptional({ example: 0, description: 'Floor number (0 = ground, 1 = first, etc.)' })
  @IsOptional()
  @IsNumber()
  floorNumber?: number;
}
