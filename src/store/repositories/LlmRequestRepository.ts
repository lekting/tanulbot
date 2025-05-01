import { AppDataSource } from '../../config/database';
import { LlmRequest } from '../../entity/LlmRequest';
import { User } from '../../entity/User';

/**
 * Repository for LlmRequest entity operations
 */
export class LlmRequestRepository {
  private repository = AppDataSource.getRepository(LlmRequest);

  /**
   * Create a new LLM request record
   */
  async create(requestData: {
    user: User;
    type: 'chat' | 'audio' | 'tts' | 'embedding';
    modelName: string;
    inputTokens?: number;
    outputTokens?: number;
    audioSeconds?: number;
    cost: number;
    metadata?: object;
  }): Promise<LlmRequest> {
    const request = this.repository.create({
      telegramId: requestData.user.telegramId,
      user: requestData.user,
      type: requestData.type,
      modelName: requestData.modelName,
      inputTokens: requestData.inputTokens || 0,
      outputTokens: requestData.outputTokens || 0,
      audioSeconds: requestData.audioSeconds || null,
      cost: requestData.cost,
      metadata: requestData.metadata || null
    });

    return this.repository.save(request);
  }

  /**
   * Get LLM requests for a user
   */
  async getUserRequests(telegramId: number): Promise<LlmRequest[]> {
    return this.repository.find({
      where: { telegramId },
      order: { createdAt: 'DESC' }
    });
  }

  /**
   * Get LLM requests by telegramId
   */
  async getRequestsByTelegramId(telegramId: number): Promise<LlmRequest[]> {
    return this.getUserRequests(telegramId);
  }

  /**
   * Get total cost for a user
   */
  async getUserTotalCost(telegramId: number): Promise<number> {
    const result = await this.repository
      .createQueryBuilder('llm_request')
      .select('SUM(llm_request.cost)', 'total')
      .where('llm_request.telegram_id = :telegramId', { telegramId })
      .getRawOne();

    return result?.total || 0;
  }

  /**
   * Get requests statistics by model
   */
  async getStatsByModel(): Promise<
    { modelName: string; count: number; totalCost: number }[]
  > {
    return this.repository
      .createQueryBuilder('llm_request')
      .select('llm_request.model_name', 'modelName')
      .addSelect('COUNT(*)', 'count')
      .addSelect('SUM(llm_request.cost)', 'totalCost')
      .groupBy('llm_request.model_name')
      .getRawMany();
  }
}
