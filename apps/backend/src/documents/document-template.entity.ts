import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'document_templates' })
export class DocumentTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenantId: string;

  @Column()
  name: string;

  @Column()
  documentType: string; // lookup code: cert_enrollment, good_moral, form_137, tor, id_card, diploma

  @Column({ type: 'jsonb', default: () => "'{}'" })
  content: Record<string, any>; // WYSIWYG editor state + merge fields

  @Column({ nullable: true })
  versionLabel: string;

  @Column({ default: false })
  signatoryRequired: boolean;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
