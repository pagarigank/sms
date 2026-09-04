import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity({ name: 'promotion_decisions' })
export class PromotionDecision {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenantId: string;

  @Column()
  studentId: string;

  @Column()
  enrollmentId: string;

  @Column()
  schoolYearId: string;

  @Column()
  gradeLevelId: string;

  @Column()
  decision: string;

  @Column({ nullable: true })
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
