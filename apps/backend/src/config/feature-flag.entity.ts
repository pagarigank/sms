import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity({ name: 'feature_flags' })
export class FeatureFlag {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenantId: string;

  @Column({ type: 'uuid', nullable: true })
  branchId: string;

  @Column()
  flagKey: string;

  @Column({ default: false })
  enabled: boolean;

  @Column({ default: 100 })
  rolloutPercentage: number;

  @CreateDateColumn()
  createdAt: Date;
}
