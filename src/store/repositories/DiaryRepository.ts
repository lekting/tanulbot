import { AppDataSource } from '../../config/database';
import { DiaryEntry } from '../../entity/DiaryEntry';
import { User } from '../../entity/User';

/**
 * Repository for diary entry operations
 */
export class DiaryRepository {
  private repository = AppDataSource.getRepository(DiaryEntry);

  /**
   * Create a new diary entry
   */
  async createEntry(user: User, text: string): Promise<DiaryEntry> {
    const entry = this.repository.create({
      telegramId: user.telegramId,
      user,
      text,
      processed: false
    });

    return this.repository.save(entry);
  }

  /**
   * Get user's diary entries
   */
  async getUserEntries(
    telegramId: number,
    limit?: number
  ): Promise<DiaryEntry[]> {
    const options: any = {
      where: { telegramId },
      order: { createdAt: 'DESC' },
      relations: ['user']
    };

    if (limit) {
      options.take = limit;
    }

    return this.repository.find(options);
  }

  /**
   * Get diary entries by telegramId
   */
  async getEntriesByTelegramId(
    telegramId: number,
    limit?: number
  ): Promise<DiaryEntry[]> {
    return this.getUserEntries(telegramId, limit);
  }

  /**
   * Get entry by id
   */
  async getEntryById(entryId: number): Promise<DiaryEntry | null> {
    return this.repository.findOne({
      where: { id: entryId },
      relations: ['user']
    });
  }

  /**
   * Get unprocessed entries
   */
  async getUnprocessedEntries(limit: number = 10): Promise<DiaryEntry[]> {
    return this.repository.find({
      where: { processed: false },
      order: { createdAt: 'ASC' },
      take: limit,
      relations: ['user']
    });
  }

  /**
   * Save processed entry
   */
  async saveProcessedEntry(
    entryId: number,
    correctedText: string,
    improvements: string[],
    unknownWords: object[],
    mnemonics: object[]
  ): Promise<DiaryEntry | null> {
    const entry = await this.getEntryById(entryId);
    if (!entry) return null;

    entry.correctedText = correctedText;
    entry.improvements = improvements;
    entry.unknownWords = unknownWords;
    entry.mnemonics = mnemonics;
    entry.processed = true;

    return this.repository.save(entry);
  }

  /**
   * Delete diary entry
   */
  async deleteEntry(entryId: number): Promise<boolean> {
    const result = await this.repository.delete(entryId);
    return result.affected === 1;
  }

  /**
   * Count user's diary entries
   */
  async countUserEntries(telegramId: number): Promise<number> {
    return this.repository.count({
      where: { telegramId }
    });
  }
}
