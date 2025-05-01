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
 * Diary entry entity for storing user's language learning diary entries
 */
@Entity('diary_entries')
export class DiaryEntry {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'telegram_id', type: 'bigint' })
  telegramId: number;

  @Column({ type: 'text' })
  text: string;

  @Column({ type: 'text', name: 'corrected_text', nullable: true })
  correctedText: string | null;

  @Column({ type: 'json', nullable: true })
  improvements: string[] | null;

  @Column({ type: 'json', name: 'unknown_words', nullable: true })
  unknownWords: object[] | null;

  @Column({ type: 'json', nullable: true })
  mnemonics: object[] | null;

  @Column({ type: 'boolean', default: false })
  processed: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // Relations
  @ManyToOne(() => User, (user) => user.diaryEntries)
  @JoinColumn({ name: 'telegram_id', referencedColumnName: 'telegramId' })
  user: User;
}
