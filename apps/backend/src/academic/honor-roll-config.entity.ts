import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity({ name: 'honor_roll_configs' })
export class HonorRollConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenantId: string;

  @Column({ nullable: true })
  branchId: string;

  @Column()
  educationLevelId: string;

  @Column()
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
