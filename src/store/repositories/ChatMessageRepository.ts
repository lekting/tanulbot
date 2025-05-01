import { AppDataSource } from '../../config/database';
import { ChatMessage } from '../../entity/ChatMessage';
import { User } from '../../entity/User';

/**
 * Repository for ChatMessage entity operations
 */
export class ChatMessageRepository {
  private repository = AppDataSource.getRepository(ChatMessage);

  /**
   * Create a new chat message
   */
  async create(messageData: {
    user: User;
    role: 'user' | 'assistant';
    content: string;
    tokenCount?: number;
  }): Promise<ChatMessage> {
    const message = this.repository.create({
      telegramId: messageData.user.telegramId,
      user: messageData.user,
      role: messageData.role,
      content: messageData.content,
      tokenCount: messageData.tokenCount || null
    });

    return this.repository.save(message);
  }

  /**
   * Get chat history for a user by telegramId
   */
  async getUserChatHistory(
    telegramId: number,
    limit?: number
  ): Promise<ChatMessage[]> {
    const options: any = {
      where: { telegramId },
      order: { createdAt: 'ASC' },
      relations: ['user']
    };

    if (limit) {
      options.take = limit;
    }

    return this.repository.find(options);
  }

  /**
   * Get chat history for a specific chat (by telegramId)
   */
  async getChatHistoryByTelegramId(
    telegramId: number,
    limit?: number
  ): Promise<ChatMessage[]> {
    return this.getUserChatHistory(telegramId, limit);
  }

  /**
   * Clear chat history for a user
   */
  async clearUserChatHistory(telegramId: number): Promise<void> {
    await this.repository.delete({ telegramId });
  }

  /**
   * Clear chat history by telegramId
   */
  async clearChatHistoryByTelegramId(telegramId: number): Promise<void> {
    await this.clearUserChatHistory(telegramId);
  }
}
