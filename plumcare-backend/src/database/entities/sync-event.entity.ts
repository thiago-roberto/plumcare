import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('sync_events')
export class SyncEvent {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'varchar' })
  system!: string; // athena, elation, nextgen

  @Column({ type: 'varchar' })
  type!: string; // patient, encounter, observation, condition, diagnostic_report

  @Column({ type: 'varchar' })
  action!: string; // created, updated, deleted

  @Column({ type: 'varchar' })
  resourceId!: string;

  @Column({ type: 'varchar' })
  status!: string; // success, failed

  @Column({ type: 'text', nullable: true })
  details?: string;

  @Index()
  @CreateDateColumn()
  timestamp!: Date;
}
