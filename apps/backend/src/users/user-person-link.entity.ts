import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity({ name: 'user_person_links' })
export class UserPersonLink {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  // Discriminator label, not an identifier: 'student' | 'guardian' | 'employee'.
  // This was declared as `uuid`, which made any personType filter bind the
  // literal as a uuid and fail (invalid input syntax for type uuid).
  @Index()
  @Column({ type: 'varchar', length: 20 })
  personType: 'student' | 'guardian' | 'employee';

  @Column('uuid')
  personId: string;

  @Column('uuid')
  tenantId: string;

  @CreateDateColumn()
  createdAt: Date;
}
