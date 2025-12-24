import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('webhook_events')
export class WebhookEvent {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'varchar' })
  resourceType!: string;

  @Column({ type: 'varchar' })
  resourceId!: string;

  @Column({ type: 'varchar' })
  action!: string; // create, update, delete

  @Column({ type: 'varchar', nullable: true })
  subscriptionId?: string;

  @Column({ type: 'jsonb' })
  payload!: Record<string, unknown>;

  @Column({ type: 'boolean', default: false })
  processed!: boolean;

  @Index()
  @CreateDateColumn()
  timestamp!: Date;
}
