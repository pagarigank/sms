import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity({ name: 'grade_components' })
export class GradeComponent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenantId: string;

  @Column()
  gradingSystemId: string;

  @Column()
  name: string;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  weight: number;

  @Column({ nullable: true })
  order: number;

  @CreateDateColumn()
  createdAt: Date;
}
