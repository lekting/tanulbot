import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn
} from 'typeorm';
import { User } from './User';

/**
 * Vocabulary entry entity for storing user's vocabulary words
 */
@Entity('vocabulary_entries')
export class VocabularyEntry {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'telegram_id', type: 'bigint' })
  telegramId: number;

  @Column({ type: 'varchar', length: 255 })
  word: string;

  @Column({ type: 'varchar', length: 255 })
  translation: string;

  @Column({ type: 'text', nullable: true })
  context: string | null;

  @Column({ name: 'error_count', type: 'int', default: 0 })
  errorCount: number;

  @Column({ name: 'last_practiced', type: 'timestamp', nullable: true })
  lastPracticed: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => User, (user) => user.vocabularyEntries)
  @JoinColumn({ name: 'telegram_id', referencedColumnName: 'telegramId' })
  user: User;
}
