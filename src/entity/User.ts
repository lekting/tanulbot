import {
  Entity,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  PrimaryColumn
} from 'typeorm';
import { SupportedLanguage, SupportedLearningLanguage } from '../services/i18n';
import { ChatMessage } from './ChatMessage';
import { Invoice } from './Invoice';
import { LlmRequest } from './LlmRequest';
import { VocabularyEntry } from './VocabularyEntry';
import { DiaryEntry } from './DiaryEntry';
import { TopicStudyResponse } from './TopicStudyResponse';
import { UserMode } from '../types';

/**
 * User entity definition for MySQL database
 */
@Entity('users')
export class User {
  @PrimaryColumn({ name: 'telegram_id', type: 'bigint' })
  telegramId: number;

  @Column({ name: 'first_name', type: 'varchar', length: 255 })
  firstName: string;

  @Column({ name: 'last_name', type: 'varchar', length: 255, nullable: true })
  lastName: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  username: string | null;

  @Column({ type: 'varchar', length: 10 })
  language: SupportedLanguage;

  @Column({ name: 'learning_language', type: 'varchar', length: 10 })
  learningLanguage: SupportedLearningLanguage;

  @Column({ type: 'int', default: 0 })
  points: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({
    name: 'current_mode',
    type: 'enum',
    enum: UserMode,
    default: UserMode.DEFAULT
  })
  currentMode: UserMode;

  @Column({
    name: 'last_activity_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP'
  })
  lastActivityAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @OneToMany(() => ChatMessage, (message) => message.user)
  chatMessages: ChatMessage[];

  @OneToMany(() => Invoice, (invoice) => invoice.user)
  invoices: Invoice[];

  @OneToMany(() => LlmRequest, (llmRequest) => llmRequest.user)
  llmRequests: LlmRequest[];

  @OneToMany(() => VocabularyEntry, (vocabulary) => vocabulary.user)
  vocabularyEntries: VocabularyEntry[];

  @OneToMany(() => DiaryEntry, (diaryEntry) => diaryEntry.user)
  diaryEntries: DiaryEntry[];

  @OneToMany(() => TopicStudyResponse, (topicStudy) => topicStudy.user)
  topicStudyResponses: TopicStudyResponse[];

  /**
   * Check if user is in diary mode
   */
  get isDiaryMode(): boolean {
    return this.currentMode === UserMode.DIARY;
  }

  /**
   * Check if user is in practice mode
   */
  get isPracticeMode(): boolean {
    return this.currentMode === UserMode.PRACTICE;
  }
}
