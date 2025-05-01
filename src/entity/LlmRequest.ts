import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  JoinColumn
} from 'typeorm';
import { User } from './User';

/**
 * LLM Request entity for tracking OpenAI API usage and costs
 */
@Entity('llm_requests')
export class LlmRequest {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'telegram_id', type: 'bigint' })
  telegramId: number;

  @Column({ type: 'enum', enum: ['chat', 'audio', 'tts', 'embedding'] })
  type: 'chat' | 'audio' | 'tts' | 'embedding';

  @Column({ name: 'model_name', type: 'varchar', length: 255 })
  modelName: string;

  @Column({ name: 'input_tokens', type: 'int', default: 0 })
  inputTokens: number;

  @Column({ name: 'output_tokens', type: 'int', default: 0 })
  outputTokens: number;

  @Column({ name: 'audio_seconds', type: 'float', nullable: true })
  audioSeconds: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 6 })
  cost: number;

  @Column({ type: 'json', nullable: true })
  metadata: object | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // Relations
  @ManyToOne(() => User, (user) => user.llmRequests)
  @JoinColumn({ name: 'telegram_id', referencedColumnName: 'telegramId' })
  user: User;
}
