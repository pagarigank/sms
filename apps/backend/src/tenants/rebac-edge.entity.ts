import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity({ name: 'rebac_edges' })
export class RebacEdge {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenantId: string;

  @Column()
  subjectUserId: string;

  @Column()
  relation: string;

  @Column()
  objectType: string;

  @Column()
  objectId: string;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ nullable: true })
  expiresAt: Date;
}
