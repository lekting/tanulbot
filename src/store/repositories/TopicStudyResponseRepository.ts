import { AppDataSource } from '../../config/database';
import { TopicStudyResponse } from '../../entity/TopicStudyResponse';
import { User } from '../../entity/User';
import { SupportedLearningLanguage } from '../../services/i18n';

/**
 * Repository for TopicStudyResponse entity operations
 */
export class TopicStudyResponseRepository {
  private repository = AppDataSource.getRepository(TopicStudyResponse);

  /**
   * Create a new topic study response record
   */
  async create(data: {
    user: User;
    text: string;
    response: string;
    learningLanguage: SupportedLearningLanguage;
  }): Promise<TopicStudyResponse> {
    const topicStudyResponse = this.repository.create({
      telegramId: data.user.telegramId,
      user: data.user,
      text: data.text,
      response: data.response,
      learningLanguage: data.learningLanguage
    });

    return this.repository.save(topicStudyResponse);
  }

  /**
   * Find a topic study response by text and learning language
   */
  async findByTextAndLanguage(
    text: string,
    learningLanguage: SupportedLearningLanguage
  ): Promise<TopicStudyResponse | null> {
    return this.repository.findOne({
      where: {
        text,
        learningLanguage
      }
    });
  }

  /**
   * Get topic study responses for a user
   */
  async getUserResponses(telegramId: number): Promise<TopicStudyResponse[]> {
    return this.repository.find({
      where: { telegramId },
      order: { createdAt: 'DESC' }
    });
  }

  /**
   * Delete a topic study response by id
   */
  async delete(id: number): Promise<void> {
    await this.repository.delete(id);
  }

  /**
   * Clear old cached responses (older than 30 days)
   */
  async clearOldResponses(): Promise<void> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    await this.repository
      .createQueryBuilder()
      .delete()
      .where('created_at < :date', { date: thirtyDaysAgo })
      .execute();
  }
}
