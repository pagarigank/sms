import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity({ name: 'user_person_links' })
export class UserPersonLink {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @Column('uuid')
  personType: 'student' | 'guardian' | 'employee';

  @Column('uuid')
  personId: string;

  @Column('uuid')
  tenantId: string;

  @CreateDateColumn()
  createdAt: Date;
}
