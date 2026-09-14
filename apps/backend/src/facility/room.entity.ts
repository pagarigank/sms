import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { Floor } from './floor.entity';
import { RoomAsset } from './room-asset.entity';

@Entity({ name: 'rooms' })
export class Room {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenantId: string;

  @Column('uuid')
  branchId: string;

  @Column()
  floorId: string;

  @ManyToOne(() => Floor, floor => floor.rooms)
  @JoinColumn({ name: 'floorId' })
  floor: Floor;

  @Column()
  name: string;

  @Column()
  roomType: string;

  @Column({ nullable: true })
  capacity: number;

  @Column({ nullable: true })
  seatingLayout: string;

  @Column({ default: 'active' })
  status: string;

  @Column({ type: 'text', array: true, default: () => "'{}'" })
  equipmentTags: string[];

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => RoomAsset, asset => asset.room, { cascade: true })
  assets: RoomAsset[];
}
