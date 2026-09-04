import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Building } from './building.entity';
import { Floor } from './floor.entity';
import { Room } from './room.entity';
import { RoomAsset } from './room-asset.entity';
import { FacilityService } from './facility.service';
import { FacilityController } from './facility.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Building, Floor, Room, RoomAsset])],
  controllers: [FacilityController],
  providers: [FacilityService],
  exports: [FacilityService],
})
export class FacilityModule {}
