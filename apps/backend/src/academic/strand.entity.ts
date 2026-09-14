import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Track } from './track.entity';

@Entity({ name: 'strands' })
export class Strand {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenantId: string;

  @Column({ nullable: true })
  trackId: string;

  @ManyToOne(() => Track)
  @JoinColumn({ name: 'trackId' })
  track: Track;

  @Column()
  name: string;

  @Column({ nullable: true })
  code: string;

  @CreateDateColumn()
  createdAt: Date;
}
