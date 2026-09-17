import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Building } from './building.entity';
import { Floor } from './floor.entity';
import { Room } from './room.entity';
import { RoomAsset } from './room-asset.entity';

@Injectable()
export class FacilityService {
  constructor(
    @InjectRepository(Building) private buildingsRepo: Repository<Building>,
    @InjectRepository(Floor) private floorsRepo: Repository<Floor>,
    @InjectRepository(Room) private roomsRepo: Repository<Room>,
    @InjectRepository(RoomAsset) private roomAssetsRepo: Repository<RoomAsset>,
  ) {}

  // === Buildings ===
  async findAllBuildings(tenantId: string, branchId?: string): Promise<Building[]> {
    const where: any = { tenantId };
    if (branchId) where.branchId = branchId;
    return this.buildingsRepo.find({ where, relations: ['floors'] });
  }

  async findOneBuilding(id: string, tenantId: string): Promise<Building> {
    const building = await this.buildingsRepo.findOne({ where: { id, tenantId }, relations: ['floors', 'floors.rooms'] });
    if (!building) throw new NotFoundException(`Building ${id} not found`);
    return building;
  }

  async createBuilding(data: Partial<Building>): Promise<Building> {
    const building = this.buildingsRepo.create(data);
    return this.buildingsRepo.save(building);
  }

  async updateBuilding(id: string, tenantId: string, data: Partial<Building>): Promise<Building> {
    await this.buildingsRepo.update({ id, tenantId }, data);
    return this.findOneBuilding(id, tenantId);
  }

  async removeBuilding(id: string, tenantId: string): Promise<void> {
    const result = await this.buildingsRepo.delete({ id, tenantId });
    if (result.affected === 0) throw new NotFoundException(`Building ${id} not found`);
  }

  // === Floors ===
  async findFloorsByBuilding(buildingId: string, tenantId: string): Promise<Floor[]> {
    return this.floorsRepo.find({ where: { buildingId, tenantId }, relations: ['rooms'] });
  }

  async findOneFloor(id: string, tenantId: string): Promise<Floor> {
    const floor = await this.floorsRepo.findOne({ where: { id, tenantId }, relations: ['rooms'] });
    if (!floor) throw new NotFoundException(`Floor ${id} not found`);
    return floor;
  }

  async createFloor(data: Partial<Floor>): Promise<Floor> {
    // Check uniqueness of (buildingId, floorNumber)
    if (data.floorNumber !== undefined) {
      const existing = await this.floorsRepo.findOne({
        where: { buildingId: data.buildingId, floorNumber: data.floorNumber, tenantId: data.tenantId },
      });
      if (existing) throw new ConflictException(`Floor number ${data.floorNumber} already exists in this building`);
    }
    const floor = this.floorsRepo.create(data);
    return this.floorsRepo.save(floor);
  }

  async updateFloor(id: string, tenantId: string, data: Partial<Floor>): Promise<Floor> {
    const floor = await this.floorsRepo.findOneBy({ id, tenantId });
    if (!floor) throw new NotFoundException(`Floor ${id} not found`);
    // Enforce uniqueness when changing floor number within the same building.
    if (data.floorNumber !== undefined && data.floorNumber !== floor.floorNumber) {
      const existing = await this.floorsRepo.findOne({
        where: { buildingId: floor.buildingId, floorNumber: data.floorNumber, tenantId },
      });
      if (existing) throw new ConflictException(`Floor number ${data.floorNumber} already exists in this building`);
    }
    Object.assign(floor, data);
    return this.floorsRepo.save(floor);
  }

  async removeFloor(id: string, tenantId: string): Promise<void> {
    const result = await this.floorsRepo.delete({ id, tenantId });
    if (result.affected === 0) throw new NotFoundException(`Floor ${id} not found`);
  }

  // === Rooms ===
  async findRooms(filters: { tenantId: string; branchId?: string; floorId?: string; search?: string; status?: string; roomType?: string }): Promise<Room[]> {
    const qb = this.roomsRepo.createQueryBuilder('r')
      .where('r.tenantId = :tenantId', { tenantId: filters.tenantId })
      .leftJoinAndSelect('r.floor', 'floor')
      .leftJoinAndSelect('r.assets', 'assets');

    if (filters.branchId) qb.andWhere('r.branchId = :branchId', { branchId: filters.branchId });
    if (filters.floorId) qb.andWhere('r.floorId = :floorId', { floorId: filters.floorId });
    if (filters.status) qb.andWhere('r.status = :status', { status: filters.status });
    if (filters.roomType) qb.andWhere('r.roomType = :roomType', { roomType: filters.roomType });
    if (filters.search) {
      qb.andWhere('r.name ILIKE :search', { search: `%${filters.search}%` });
    }

    return qb.getMany();
  }

  async findRoomsByFloor(floorId: string, tenantId: string): Promise<Room[]> {
    return this.roomsRepo.find({ where: { floorId, tenantId }, relations: ['assets'] });
  }

  async findOneRoom(id: string, tenantId: string): Promise<Room> {
    const room = await this.roomsRepo.findOne({ where: { id, tenantId }, relations: ['floor', 'assets'] });
    if (!room) throw new NotFoundException(`Room ${id} not found`);
    return room;
  }

  async createRoom(data: Partial<Room>): Promise<Room> {
    const room = this.roomsRepo.create(data);
    return this.roomsRepo.save(room);
  }

  async updateRoom(id: string, tenantId: string, data: Partial<Room>): Promise<Room> {
    await this.roomsRepo.update({ id, tenantId }, data);
    return this.findOneRoom(id, tenantId);
  }

  async removeRoom(id: string, tenantId: string): Promise<void> {
    const result = await this.roomsRepo.delete({ id, tenantId });
    if (result.affected === 0) throw new NotFoundException(`Room ${id} not found`);
  }

  // === Room Assets ===
  async findAssetsByRoom(roomId: string, tenantId: string): Promise<RoomAsset[]> {
    return this.roomAssetsRepo.find({ where: { roomId, tenantId } });
  }

  async createRoomAsset(data: Partial<RoomAsset>): Promise<RoomAsset> {
    const asset = this.roomAssetsRepo.create(data);
    return this.roomAssetsRepo.save(asset);
  }

  async removeRoomAsset(id: string, tenantId: string): Promise<void> {
    const result = await this.roomAssetsRepo.delete({ id, tenantId });
    if (result.affected === 0) throw new NotFoundException(`Room asset ${id} not found`);
  }

  // === Room Conflict Check (Stub for Phase 5/6) ===
  /**
   * Check if a room is free for a given time slot.
   * Stub implementation — full version in Phase 5 with class_offerings.
   * Signature: isRoomFree(branch_id, room_id, day, start, end, term_id, exclude_offering_id)
   */
  async isRoomFree(
    tenantId: string,
    branchId: string,
    roomId: string,
    dayOfWeek: string,
    startTime: string,
    endTime: string,
    termId?: string,
    excludeOfferingId?: string,
  ): Promise<{ isFree: boolean; conflictWith?: string }> {
    // Phase 5 will query class_offerings for room conflicts
    // For now, always return free
    return { isFree: true };
  }
}
