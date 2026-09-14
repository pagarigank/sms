import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity({ name: 'custom_field_definitions' })
export class CustomFieldDefinition {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenantId: string;

  @Column()
  entityType: string;

  @Column()
  fieldKey: string;

  @Column()
  fieldType: string;

  @Column()
  label: string;

  @Column({ default: false })
  required: boolean;

  @Column({ type: 'jsonb', default: () => "'{}'" })
  validationRules: Record<string, any>;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  options: any[];

  @Column({ type: 'jsonb', default: () => "'{}'" })
  visibilityRules: Record<string, any>;

  @Column({ default: 0 })
  sortOrder: number;

  @CreateDateColumn()
  createdAt: Date;
}
