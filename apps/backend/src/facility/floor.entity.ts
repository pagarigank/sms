import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { Building } from './building.entity';
import { Room } from './room.entity';

@Entity({ name: 'floors' })
export class Floor {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenantId: string;

  @Column()
  buildingId: string;

  @ManyToOne(() => Building, building => building.floors, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'buildingId' })
  building: Building;

  @Column()
  label: string;

  @Column({ nullable: true })
  floorNumber: number;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => Room, room => room.floor, { cascade: true })
  rooms: Room[];
}
