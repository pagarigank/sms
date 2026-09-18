import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsUUID } from 'class-validator';

export class CreateTenantDto {
  @ApiProperty({
    example: 'Holy Angel Integrated School System, Inc.',
    description: 'Legal entity name of the school organization',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    example: 'holy-angel',
    description: 'URL-safe slug used for subdomain (tenant-slug.schoolsuite.ph)',
  })
  @IsString()
  @IsNotEmpty()
  slug: string;

  @ApiProperty({
    example: 'a0000000-0000-0000-0000-000000000001',
    description: 'UUID of the subscription plan (tenant_plans.id)',
  })
  @IsUUID()
  planId: string;
}
