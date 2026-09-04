import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity({ name: 'permissions' })
export class Permission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  resource: string;

  @Column()
  action: string;

  @Column({ nullable: true })
  description: string;
}
