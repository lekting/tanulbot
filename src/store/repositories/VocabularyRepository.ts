import { AppDataSource } from '../../config/database';
import { VocabularyEntry } from '../../entity/VocabularyEntry';
import { User } from '../../entity/User';
import { FindOptionsWhere, ILike, IsNull, LessThan, MoreThan } from 'typeorm';

/**
 * Repository for vocabulary entry operations
 */
export class VocabularyRepository {
  private repository = AppDataSource.getRepository(VocabularyEntry);

  /**
   * Add a new vocabulary entry
   */
  async addEntry(
    user: User,
    word: string,
    translation: string,
    context?: string
  ): Promise<VocabularyEntry> {
    // Check if entry already exists for this user
    const existingEntry = await this.repository.findOne({
      where: {
        telegramId: user.telegramId,
        word: word
      }
    });

    if (existingEntry) {
      // Update the existing entry instead of creating a new one
      existingEntry.translation = translation;

      // Only update context if provided
      if (context) {
        existingEntry.context = context;
      }

      return this.repository.save(existingEntry);
    }

    // Create new entry if it doesn't exist
    const entry = this.repository.create({
      telegramId: user.telegramId,
      user,
      word,
      translation,
      context: context || null,
      errorCount: 0,
      lastPracticed: null
    });

    return this.repository.save(entry);
  }

  /**
   * Get user's vocabulary entries
   */
  async getUserVocabulary(
    telegramId: number,
    limit?: number,
    sortBy: keyof VocabularyEntry = 'createdAt',
    sortDirection: 'ASC' | 'DESC' = 'DESC'
  ): Promise<VocabularyEntry[]> {
    const options: any = {
      where: { telegramId },
      order: { [sortBy]: sortDirection },
      relations: ['user']
    };

    if (limit) {
      options.take = limit;
    }

    return this.repository.find(options);
  }

  /**
   * Get vocabulary for practice (words not practiced recently)
   */
  async getVocabularyForPractice(
    telegramId: number,
    limit: number = 10
  ): Promise<VocabularyEntry[]> {
    // Get words that haven't been practiced recently or have high error count
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const whereConditions: FindOptionsWhere<VocabularyEntry>[] = [
      { telegramId, lastPracticed: IsNull() },
      { telegramId, lastPracticed: LessThan(oneWeekAgo) },
      { telegramId, errorCount: MoreThan(1) }
    ];

    return this.repository.find({
      where: whereConditions,
      order: {
        errorCount: 'DESC',
        lastPracticed: 'ASC',
        createdAt: 'DESC'
      },
      take: limit
    });
  }

  /**
   * Search vocabulary
   */
  async searchVocabulary(
    telegramId: number,
    query: string
  ): Promise<VocabularyEntry[]> {
    return this.repository.find({
      where: [
        { telegramId, word: ILike(`%${query}%`) },
        { telegramId, translation: ILike(`%${query}%`) }
      ],
      order: { createdAt: 'DESC' }
    });
  }

  /**
   * Update practice result
   */
  async updatePracticeResult(
    entryId: number,
    hadError: boolean
  ): Promise<VocabularyEntry | null> {
    const entry = await this.repository.findOne({
      where: { id: entryId }
    });

    if (!entry) {
      return null;
    }

    entry.lastPracticed = new Date();
    if (hadError) {
      entry.errorCount += 1;
    }

    return this.repository.save(entry);
  }

  /**
   * Remove vocabulary entry
   */
  async removeEntry(entryId: number): Promise<boolean> {
    const result = await this.repository.delete(entryId);
    return result.affected === 1;
  }

  /**
   * Get total vocabulary count for user
   */
  async getVocabularyCount(telegramId: number): Promise<number> {
    return this.repository.count({
      where: { telegramId }
    });
  }

  /**
   * Get vocabulary by telegramId
   */
  async getVocabularyByTelegramId(
    telegramId: number,
    limit?: number,
    sortBy: keyof VocabularyEntry = 'createdAt',
    sortDirection: 'ASC' | 'DESC' = 'DESC'
  ): Promise<VocabularyEntry[]> {
    return this.getUserVocabulary(telegramId, limit, sortBy, sortDirection);
  }

  /**
   * Get vocabulary for export to Anki
   */
  async getVocabularyForExport(
    telegramId: number
  ): Promise<{ front: string; back: string }[]> {
    const entries = await this.repository.find({
      where: { telegramId },
      select: ['word', 'translation']
    });

    return entries.map((entry) => ({
      front: entry.word,
      back: entry.translation
    }));
  }
}
