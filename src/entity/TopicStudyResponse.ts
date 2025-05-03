import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  JoinColumn
} from 'typeorm';
import { User } from './User';
import { SupportedLearningLanguage } from '../services/i18n';

/**
 * TopicStudyResponse entity for caching LLM responses to topic study requests
 */
@Entity('topic_study_responses')
export class TopicStudyResponse {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'telegram_id', type: 'bigint' })
  telegramId: number;

  @Column({ type: 'text' })
  text: string;

  @Column({ type: 'text' })
  response: string;

  @Column({ name: 'learning_language', type: 'varchar', length: 10 })
  learningLanguage: SupportedLearningLanguage;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // Relations
  @ManyToOne(() => User, (user) => user.topicStudyResponses)
  @JoinColumn({ name: 'telegram_id', referencedColumnName: 'telegramId' })
  user: User;
}
