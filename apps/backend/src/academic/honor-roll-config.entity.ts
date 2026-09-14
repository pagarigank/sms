import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity({ name: 'honor_roll_configs' })
export class HonorRollConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenantId: string;

  @Column({ type: 'uuid', nullable: true })
  branchId: string;

  @Column('uuid')
  educationLevelId: string;

  @Column('uuid')
  schoolYearId: string;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  withHonorsThreshold: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  withHighHonorsThreshold: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  withHighestHonorsThreshold: number;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
