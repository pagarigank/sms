import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Room } from './room.entity';

@Entity({ name: 'room_assets' })
export class RoomAsset {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenantId: string;

  @Column()
  branchId: string;

  @Column()
  roomId: string;

  @ManyToOne(() => Room, room => room.assets)
  @JoinColumn({ name: 'roomId' })
  room: Room;

  @Column()
  assetTag: string;

  @Column()
  assetType: string;

  @Column({ nullable: true })
  condition: string;

  @Column({ default: false })
  maintenanceFlag: boolean;

  @Column({ nullable: true })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;
}
