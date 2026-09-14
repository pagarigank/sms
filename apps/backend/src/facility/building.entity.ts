import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { Floor } from './floor.entity';

@Entity({ name: 'buildings' })
export class Building {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenantId: string;

  @Column('uuid')
  branchId: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  code: string;

  @Column({ nullable: true })
  address: string;

  @Column({ nullable: true })
  floorCount: number;

  @Column({ nullable: true })
  contact: string;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => Floor, floor => floor.building, { cascade: true })
  floors: Floor[];
}
