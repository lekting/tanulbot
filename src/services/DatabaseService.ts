import { User } from '../entity/User';
import { ChatMessage } from '../entity/ChatMessage';
import { Invoice } from '../entity/Invoice';
import { LlmRequest } from '../entity/LlmRequest';
import { VocabularyEntry } from '../entity/VocabularyEntry';
import { DiaryEntry } from '../entity/DiaryEntry';
import { TopicStudyResponse } from '../entity/TopicStudyResponse';
import { SupportedLanguage, SupportedLearningLanguage } from './i18n';
import {
  UserRepository,
  ChatMessageRepository,
  InvoiceRepository,
  LlmRequestRepository,
  VocabularyRepository,
  DiaryRepository,
  TopicStudyResponseRepository
} from '../store/repositories';
import { UserMode } from '../types';

/**
 * Service for handling database operations
 */
export class DatabaseService {
  private userRepository: UserRepository;
  private chatMessageRepository: ChatMessageRepository;
  private invoiceRepository: InvoiceRepository;
  private llmRequestRepository: LlmRequestRepository;
  private vocabularyRepository: VocabularyRepository;
  private diaryRepository: DiaryRepository;
  private topicStudyResponseRepository: TopicStudyResponseRepository;

  constructor() {
    this.userRepository = new UserRepository();
    this.chatMessageRepository = new ChatMessageRepository();
    this.invoiceRepository = new InvoiceRepository();
    this.llmRequestRepository = new LlmRequestRepository();
    this.vocabularyRepository = new VocabularyRepository();
    this.diaryRepository = new DiaryRepository();
    this.topicStudyResponseRepository = new TopicStudyResponseRepository();
  }

  /**
   * Get or create a user
   */
  async getOrCreateUser(
    telegramUser: {
      id: number;
      first_name: string;
      last_name?: string;
      username?: string;
    },
    language: SupportedLanguage,
    learningLanguage: SupportedLearningLanguage
  ): Promise<User> {
    let user = await this.userRepository.findByTelegramId(telegramUser.id);

    if (!user) {
      user = await this.userRepository.create({
        telegramId: telegramUser.id,
        firstName: telegramUser.first_name,
        lastName: telegramUser.last_name,
        username: telegramUser.username,
        language,
        learningLanguage
      });
    }

    return user;
  }

  /**
   * Update user language
   */
  async updateUserLanguage(
    telegramId: number,
    language: SupportedLanguage
  ): Promise<User | null> {
    return this.userRepository.updateLanguage(telegramId, language);
  }

  /**
   * Update user learning language
   */
  async updateUserLearningLanguage(
    telegramId: number,
    learningLanguage: SupportedLearningLanguage
  ): Promise<User | null> {
    return this.userRepository.updateLearningLanguage(
      telegramId,
      learningLanguage
    );
  }

  /**
   * Set user as active
   */
  async setUserActive(telegramId: number): Promise<User | null> {
    return this.userRepository.setActive(telegramId, true);
  }

  /**
   * Set user diary mode
   */
  async setUserDiaryMode(
    telegramId: number,
    isDiaryMode: boolean
  ): Promise<User | null> {
    return this.userRepository.setDiaryMode(telegramId, isDiaryMode);
  }

  /**
   * Set user mode
   */
  async setUserMode(telegramId: number, mode: UserMode): Promise<User | null> {
    return this.userRepository.setUserMode(telegramId, mode);
  }

  /**
   * Get user mode
   */
  async getUserMode(telegramId: number): Promise<UserMode | null> {
    return this.userRepository.getUserMode(telegramId);
  }

  /**
   * Add points to user
   */
  async addUserPoints(
    telegramId: number,
    points: number
  ): Promise<User | null> {
    return this.userRepository.addPoints(telegramId, points);
  }

  /**
   * Add chat message
   */
  async addChatMessage(
    telegramId: number,
    role: 'user' | 'assistant',
    content: string,
    tokenCount?: number
  ): Promise<ChatMessage | null> {
    const user = await this.userRepository.findByTelegramId(telegramId);
    if (!user) return null;

    return this.chatMessageRepository.create({
      user,
      role,
      content,
      tokenCount
    });
  }

  /**
   * Get chat history
   */
  async getChatHistory(
    telegramId: number,
    limit?: number
  ): Promise<ChatMessage[]> {
    return this.chatMessageRepository.getChatHistoryByTelegramId(
      telegramId,
      limit
    );
  }

  /**
   * Clear chat history
   */
  async clearChatHistory(telegramId: number): Promise<void> {
    await this.chatMessageRepository.clearChatHistoryByTelegramId(telegramId);
  }

  /**
   * Create invoice
   */
  async createInvoice(
    telegramId: number,
    subscriptionPlan: 'free' | 'basic' | 'premium',
    amount: number,
    expiresAt?: Date,
    paymentId?: string,
    paymentMethod?: string
  ): Promise<Invoice | null> {
    const user = await this.userRepository.findByTelegramId(telegramId);
    if (!user) return null;

    return this.invoiceRepository.create({
      user,
      subscriptionPlan,
      amount,
      status: 'pending',
      expiresAt,
      paymentId,
      paymentMethod
    });
  }

  /**
   * Update invoice status
   */
  async updateInvoiceStatus(
    invoiceId: number,
    status: 'pending' | 'completed' | 'failed' | 'refunded'
  ): Promise<Invoice | null> {
    return this.invoiceRepository.updateStatus(invoiceId, status);
  }

  /**
   * Get active subscription
   */
  async getActiveSubscription(telegramId: number): Promise<Invoice | null> {
    const user = await this.userRepository.findByTelegramId(telegramId);
    if (!user) return null;

    return this.invoiceRepository.getActiveSubscription(user.telegramId);
  }

  /**
   * Log LLM request
   */
  async logLlmRequest(
    telegramId: number,
    type: 'chat' | 'audio' | 'tts' | 'embedding',
    modelName: string,
    cost: number,
    inputTokens?: number,
    outputTokens?: number,
    audioSeconds?: number,
    metadata?: object
  ): Promise<LlmRequest | null> {
    const user = await this.userRepository.findByTelegramId(telegramId);
    if (!user) return null;

    return this.llmRequestRepository.create({
      user,
      type,
      modelName,
      cost,
      inputTokens,
      outputTokens,
      audioSeconds,
      metadata
    });
  }

  /**
   * Get user LLM request history
   */
  async getLlmRequests(telegramId: number): Promise<LlmRequest[]> {
    return this.llmRequestRepository.getRequestsByTelegramId(telegramId);
  }

  /**
   * Get user total LLM cost
   */
  async getUserTotalLlmCost(telegramId: number): Promise<number> {
    const user = await this.userRepository.findByTelegramId(telegramId);
    if (!user) return 0;

    return this.llmRequestRepository.getUserTotalCost(user.telegramId);
  }

  /**
   * Get LLM usage statistics
   */
  async getLlmStats(): Promise<
    { modelName: string; count: number; totalCost: number }[]
  > {
    return this.llmRequestRepository.getStatsByModel();
  }

  /**
   * Add vocabulary entry
   */
  async addVocabularyEntry(
    telegramId: number,
    word: string,
    translation: string,
    context?: string
  ): Promise<VocabularyEntry | null> {
    const user = await this.userRepository.findByTelegramId(telegramId);
    if (!user) return null;

    return this.vocabularyRepository.addEntry(user, word, translation, context);
  }

  /**
   * Get user vocabulary
   */
  async getUserVocabulary(
    telegramId: number,
    limit?: number,
    sortBy: keyof VocabularyEntry = 'createdAt',
    sortDirection: 'ASC' | 'DESC' = 'DESC'
  ): Promise<VocabularyEntry[]> {
    return this.vocabularyRepository.getVocabularyByTelegramId(
      telegramId,
      limit,
      sortBy,
      sortDirection
    );
  }

  /**
   * Get vocabulary for practice
   */
  async getVocabularyForPractice(
    telegramId: number,
    limit: number = 10
  ): Promise<VocabularyEntry[]> {
    const user = await this.userRepository.findByTelegramId(telegramId);
    if (!user) return [];

    return this.vocabularyRepository.getVocabularyForPractice(
      user.telegramId,
      limit
    );
  }

  /**
   * Search user vocabulary
   */
  async searchVocabulary(
    telegramId: number,
    query: string
  ): Promise<VocabularyEntry[]> {
    const user = await this.userRepository.findByTelegramId(telegramId);
    if (!user) return [];

    return this.vocabularyRepository.searchVocabulary(user.telegramId, query);
  }

  /**
   * Update vocabulary practice result
   */
  async updateVocabularyPracticeResult(
    entryId: number,
    hadError: boolean
  ): Promise<VocabularyEntry | null> {
    return this.vocabularyRepository.updatePracticeResult(entryId, hadError);
  }

  /**
   * Remove vocabulary entry
   */
  async removeVocabularyEntry(entryId: number): Promise<boolean> {
    return this.vocabularyRepository.removeEntry(entryId);
  }

  /**
   * Get vocabulary count
   */
  async getVocabularyCount(telegramId: number): Promise<number> {
    const user = await this.userRepository.findByTelegramId(telegramId);
    if (!user) return 0;

    return this.vocabularyRepository.getVocabularyCount(user.telegramId);
  }

  /**
   * Export vocabulary to Anki
   */
  async exportVocabularyToAnki(
    telegramId: number
  ): Promise<{ front: string; back: string }[]> {
    const user = await this.userRepository.findByTelegramId(telegramId);
    if (!user) return [];

    return this.vocabularyRepository.getVocabularyForExport(user.telegramId);
  }

  /**
   * Add diary entry
   */
  async addDiaryEntry(
    telegramId: number,
    text: string
  ): Promise<DiaryEntry | null> {
    const user = await this.userRepository.findByTelegramId(telegramId);
    if (!user) return null;
    return this.diaryRepository.createEntry(user, text);
  }

  /**
   * Get user diary entries
   */
  async getUserDiaryEntries(
    telegramId: number,
    limit?: number
  ): Promise<DiaryEntry[]> {
    return this.diaryRepository.getEntriesByTelegramId(telegramId, limit);
  }

  /**
   * Get diary entry by id
   */
  async getDiaryEntryById(entryId: number): Promise<DiaryEntry | null> {
    return this.diaryRepository.getEntryById(entryId);
  }

  /**
   * Get unprocessed diary entries
   */
  async getUnprocessedDiaryEntries(limit: number = 10): Promise<DiaryEntry[]> {
    return this.diaryRepository.getUnprocessedEntries(limit);
  }

  /**
   * Save processed diary entry
   */
  async saveProcessedDiaryEntry(
    entryId: number,
    correctedText: string,
    improvements: string[],
    unknownWords: object[],
    mnemonics: object[]
  ): Promise<DiaryEntry | null> {
    return this.diaryRepository.saveProcessedEntry(
      entryId,
      correctedText,
      improvements,
      unknownWords,
      mnemonics
    );
  }

  /**
   * Delete diary entry
   */
  async deleteDiaryEntry(entryId: number): Promise<boolean> {
    return this.diaryRepository.deleteEntry(entryId);
  }

  /**
   * Count user diary entries
   */
  async countUserDiaryEntries(telegramId: number): Promise<number> {
    const user = await this.userRepository.findByTelegramId(telegramId);
    if (!user) return 0;

    return this.diaryRepository.countUserEntries(user.telegramId);
  }

  /**
   * Find topic study response by text and learning language
   */
  async findTopicStudyResponse(
    text: string,
    learningLanguage: SupportedLearningLanguage
  ): Promise<TopicStudyResponse | null> {
    return this.topicStudyResponseRepository.findByTextAndLanguage(
      text,
      learningLanguage
    );
  }

  /**
   * Save topic study response
   */
  async saveTopicStudyResponse(
    telegramId: number,
    text: string,
    response: string,
    learningLanguage: SupportedLearningLanguage
  ): Promise<TopicStudyResponse | null> {
    const user = await this.userRepository.findByTelegramId(telegramId);
    if (!user) return null;

    return this.topicStudyResponseRepository.create({
      user,
      text,
      response,
      learningLanguage
    });
  }

  /**
   * Get topic study responses for a user
   */
  async getUserTopicStudyResponses(
    telegramId: number
  ): Promise<TopicStudyResponse[]> {
    return this.topicStudyResponseRepository.getUserResponses(telegramId);
  }

  /**
   * Clear old topic study responses (can be used in a maintenance worker)
   */
  async clearOldTopicStudyResponses(): Promise<void> {
    await this.topicStudyResponseRepository.clearOldResponses();
  }
}
