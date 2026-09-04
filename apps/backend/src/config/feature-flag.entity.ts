import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity({ name: 'feature_flags' })
export class FeatureFlag {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenantId: string;

  @Column({ nullable: true })
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
