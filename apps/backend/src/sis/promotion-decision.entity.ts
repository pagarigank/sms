import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity({ name: 'promotion_decisions' })
export class PromotionDecision {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenantId: string;

  @Column('uuid')
  studentId: string;

  @Column('uuid')
  enrollmentId: string;

  @Column('uuid')
  schoolYearId: string;

  @Column('uuid')
  gradeLevelId: string;

  @Column()
  decision: string;

  @Column({ type: 'uuid', nullable: true })
  targetGradeLevelId: string;

  @Column({ nullable: true })
  remarks: string;

  @Column({ nullable: true })
  decidedBy: string;

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  decidedAt: Date;

  @Column({ default: false })
  isFinalized: boolean;

  @Column({ nullable: true })
  finalizedBy: string;

  @Column({ type: 'timestamptz', nullable: true })
  finalizedAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
