import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity({ name: 'programs' })
export class Program {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenantId: string;

  @Column()
  code: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  level: string;

  @CreateDateColumn()
  createdAt: Date;
}
