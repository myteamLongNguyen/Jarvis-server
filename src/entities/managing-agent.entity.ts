import { Entity, Column } from 'typeorm';
import { BaseEntity } from './base.entity';

@Entity('managing_agents')
export class ManagingAgentEntity extends BaseEntity {
  @Column({ type: 'varchar', length: 150 })
  name: string;

  @Column({ type: 'varchar', length: 150, name: 'contact_name', nullable: true })
  contactName: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  phone: string;

  @Column({ type: 'text', nullable: true })
  notes: string;
}
