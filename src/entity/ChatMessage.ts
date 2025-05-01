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
 * Chat message structure for storing message history
 */
@Entity('chat_messages')
export class ChatMessage {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'telegram_id', type: 'bigint' })
  telegramId: number;

  @Column({ type: 'enum', enum: ['user', 'assistant'] })
  role: 'user' | 'assistant';

  @Column({ type: 'text' })
  content: string;

  @Column({ name: 'token_count', type: 'int', nullable: true })
  tokenCount: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // Relations
  @ManyToOne(() => User, (user) => user.chatMessages)
  @JoinColumn({ name: 'telegram_id', referencedColumnName: 'telegramId' })
  user: User;
}
