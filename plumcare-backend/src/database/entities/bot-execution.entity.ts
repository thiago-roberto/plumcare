import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('bot_executions')
export class BotExecution {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'varchar' })
  botId!: string;

  @Column({ type: 'varchar', nullable: true })
  botName?: string;

  @Column({ type: 'varchar' })
  status!: string; // success, error

  @Column({ type: 'jsonb', nullable: true })
  input?: Record<string, unknown>;

  @Column({ type: 'jsonb', nullable: true })
  output?: Record<string, unknown>;

  @Column({ type: 'text', nullable: true })
  error?: string;

  @Column({ type: 'int', nullable: true })
  duration?: number; // milliseconds

  @Index()
  @CreateDateColumn()
  timestamp!: Date;
}
