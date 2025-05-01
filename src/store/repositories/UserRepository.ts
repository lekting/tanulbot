import { AppDataSource } from '../../config/database';
import { User } from '../../entity/User';
import {
  SupportedLanguage,
  SupportedLearningLanguage
} from '../../services/i18n';
import { UserMode } from '../../types';

/**
 * Repository for User entity operations
 */
export class UserRepository {
  private repository = AppDataSource.getRepository(User);

  /**
   * Find user by Telegram ID
   */
  async findByTelegramId(telegramId: number): Promise<User | null> {
    return this.repository.findOne({ where: { telegramId } });
  }

  /**
   * Create a new user
   */
  async create(userData: {
    telegramId: number;
    firstName: string;
    lastName?: string | null;
    username?: string | null;
    language: SupportedLanguage;
    learningLanguage: SupportedLearningLanguage;
  }): Promise<User> {
    const user = this.repository.create({
      telegramId: userData.telegramId,
      firstName: userData.firstName,
      lastName: userData.lastName || null,
      username: userData.username || null,
      language: userData.language,
      learningLanguage: userData.learningLanguage,
      isActive: true,
      points: 0,
      currentMode: UserMode.DEFAULT,
      lastActivityAt: new Date()
    });

    return this.repository.save(user);
  }

  /**
   * Update user's language
   */
  async updateLanguage(
    telegramId: number,
    language: SupportedLanguage
  ): Promise<User | null> {
    const user = await this.findByTelegramId(telegramId);
    if (!user) return null;

    user.language = language;
    return this.repository.save(user);
  }

  /**
   * Update user's learning language
   */
  async updateLearningLanguage(
    telegramId: number,
    learningLanguage: SupportedLearningLanguage
  ): Promise<User | null> {
    const user = await this.findByTelegramId(telegramId);
    if (!user) return null;

    user.learningLanguage = learningLanguage;
    return this.repository.save(user);
  }

  /**
   * Set user as active or inactive
   */
  async setActive(telegramId: number, isActive: boolean): Promise<User | null> {
    const user = await this.findByTelegramId(telegramId);
    if (!user) return null;

    user.isActive = isActive;
    user.lastActivityAt = new Date();
    return this.repository.save(user);
  }

  /**
   * Update user's last activity timestamp
   */
  async updateLastActivity(telegramId: number): Promise<User | null> {
    const user = await this.findByTelegramId(telegramId);
    if (!user) return null;

    user.lastActivityAt = new Date();
    return this.repository.save(user);
  }

  /**
   * Set user's diary mode
   */
  async setDiaryMode(
    telegramId: number,
    isDiaryMode: boolean
  ): Promise<User | null> {
    const user = await this.findByTelegramId(telegramId);
    if (!user) return null;

    user.currentMode = isDiaryMode ? UserMode.DIARY : UserMode.DEFAULT;
    return this.repository.save(user);
  }

  /**
   * Set user's mode
   */
  async setUserMode(telegramId: number, mode: UserMode): Promise<User | null> {
    const user = await this.findByTelegramId(telegramId);
    if (!user) return null;

    user.currentMode = mode;
    return this.repository.save(user);
  }

  /**
   * Get user's current mode
   */
  async getUserMode(telegramId: number): Promise<UserMode | null> {
    const user = await this.findByTelegramId(telegramId);
    if (!user) return null;

    return user.currentMode;
  }

  /**
   * Add points to user
   */
  async addPoints(telegramId: number, points: number): Promise<User | null> {
    const user = await this.findByTelegramId(telegramId);
    if (!user) return null;

    user.points += points;
    return this.repository.save(user);
  }

  /**
   * Get all active users
   */
  async getActiveUsers(): Promise<User[]> {
    return this.repository.find({
      where: { isActive: true },
      order: { lastActivityAt: 'DESC' }
    });
  }
}
