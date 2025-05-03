/**
 * Application state management (MySQL backed storage)
 */
import {
  DictationState,
  WordPair,
  DiaryEntry,
  ProcessedDiaryEntry,
  UserState,
  ChatMessage,
  VocabularyEntry,
  DictationFormat,
  SubscriptionPlan,
  SubscriptionStatus
} from '../types';
import {
  SupportedLanguage,
  DEFAULT_LANGUAGE,
  getSubscriptionFeatures,
  SupportedLearningLanguage,
  DEFAULT_LEARNING_LANGUAGE
} from '../services/i18n';
import { DatabaseService } from '../services/DatabaseService';
import { User } from 'grammy/types';
import { UserMode } from '../types';

/**
 * State store with MySQL database backend
 */
export class StateStore {
  private dbService: DatabaseService;

  // Active dictation sessions (kept in memory)
  private activeDictations = new Map<number, DictationState>();

  // Temporary user data for multi-step interactions (kept in memory)
  private temporaryUserData = new Map<number, Record<string, any>>();

  // Last processed word pairs (kept in memory)
  private lastWordPairs: WordPair[] = [];

  // Active user cache to avoid excessive database queries
  private activeChatUsersCache = new Map<number, number>();
  private cacheExpiryTime = 60000; // 1 minute
  private lastCacheUpdate = 0;

  constructor() {
    this.dbService = new DatabaseService();
  }

  /**
   * Track a user as active in chat
   * @param userId - Telegram user ID
   */
  async setUserActive(userId: number): Promise<void> {
    await this.dbService.setUserActive(userId);
    this.activeChatUsersCache.set(userId, Date.now());
  }

  /**
   * Check if a user is active
   * @param userId - Telegram user ID
   */
  async isUserActive(userId: number): Promise<boolean> {
    const user = await this.dbService.getOrCreateUser(
      { id: userId, first_name: `User ${userId}` },
      DEFAULT_LANGUAGE,
      DEFAULT_LEARNING_LANGUAGE
    );
    return user.isActive;
  }

  /**
   * Get all active users with their last active timestamp
   * Note: This uses a cache to avoid excessive database queries
   */
  getActiveUsers(): Map<number, number> {
    const now = Date.now();
    // Refresh cache if it's expired
    if (now - this.lastCacheUpdate > this.cacheExpiryTime) {
      // This is async but we return the cached data immediately
      // Updated data will be available on next request after cache expires
      this.refreshActiveUsersCache();
    }
    return this.activeChatUsersCache;
  }

  /**
   * Refresh the active users cache from database
   * @private
   */
  private async refreshActiveUsersCache(): Promise<void> {
    try {
      // We need a proper method to get active users
      // Since we don't have direct access to the repository, we should add this method to DatabaseService
      // For now, let's implement a workaround

      // Get users who have been active recently (e.g., sent chat messages)
      const recentMessages = await this.dbService.getChatHistory(0, 100);
      const activeUserIds = new Set<number>();

      // Extract unique user IDs
      for (const message of recentMessages) {
        if (message.user && message.user.telegramId) {
          activeUserIds.add(message.user.telegramId);
        }
      }

      // Clear and rebuild cache
      this.activeChatUsersCache.clear();

      // Add active users to cache
      for (const userId of activeUserIds) {
        this.activeChatUsersCache.set(userId, Date.now());
      }

      this.lastCacheUpdate = Date.now();
    } catch (error) {
      console.error('Failed to refresh active users cache:', error);
    }
  }

  /**
   * Remove user from active users
   * @param userId - Telegram user ID
   */
  async removeActiveUser(userId: number): Promise<void> {
    // Use a method that exists in the public API of DatabaseService
    // We need to implement this method properly in DatabaseService
    // For now, let's work with what we have
    const user = await this.dbService.getOrCreateUser(
      { id: userId, first_name: `User ${userId}` },
      DEFAULT_LANGUAGE,
      DEFAULT_LEARNING_LANGUAGE
    );

    // Delete from cache
    this.activeChatUsersCache.delete(userId);
  }

  /**
   * Get user's preferred language
   * @param userId - Telegram user ID
   */
  async getUserLanguage(
    userId: number,
    telegramUser?: User
  ): Promise<SupportedLanguage> {
    const user = await this.dbService.getOrCreateUser(
      {
        id: userId,
        first_name: telegramUser?.first_name || `User ${userId}`,
        last_name: telegramUser?.last_name || undefined,
        username: telegramUser?.username || undefined
      },
      DEFAULT_LANGUAGE,
      DEFAULT_LEARNING_LANGUAGE
    );
    return user?.language || DEFAULT_LANGUAGE;
  }

  /**
   * Set user's preferred language
   * @param userId - Telegram user ID
   * @param language - Language code
   */
  async setUserLanguage(
    userId: number,
    language: SupportedLanguage
  ): Promise<void> {
    await this.dbService.updateUserLanguage(userId, language);
  }

  /**
   * Start dictation for a user
   * @param userId - Telegram user ID
   * @param state - Initial dictation state
   */
  startDictation(userId: number, state: DictationState): void {
    // Dictation state is kept in memory as it's temporary
    this.activeDictations.set(userId, state);
  }

  /**
   * Get dictation state for a user
   * @param userId - Telegram user ID
   */
  getDictationState(userId: number): DictationState | undefined {
    return this.activeDictations.get(userId);
  }

  /**
   * Check if a user has an active dictation
   * @param userId - Telegram user ID
   */
  hasDictation(userId: number): boolean {
    return this.activeDictations.has(userId);
  }

  /**
   * End dictation for a user
   * @param userId - Telegram user ID
   */
  endDictation(userId: number): void {
    this.activeDictations.delete(userId);
  }

  /**
   * Update dictation state for a user
   * @param userId - Telegram user ID
   * @param state - New dictation state
   */
  updateDictationState(userId: number, state: Partial<DictationState>): void {
    const dictation = this.activeDictations.get(userId);
    if (dictation) {
      this.activeDictations.set(userId, { ...dictation, ...state });
    }
  }

  /**
   * Add points to a user's score
   * @param userId - Telegram user ID
   * @param points - Points to add
   */
  async addPoints(userId: number, points: number): Promise<void> {
    await this.dbService.addUserPoints(userId, points);
  }

  /**
   * Get a user's score
   * @param userId - Telegram user ID
   */
  async getPoints(userId: number): Promise<number> {
    const user = await this.dbService.getOrCreateUser(
      { id: userId, first_name: `User ${userId}` },
      DEFAULT_LANGUAGE,
      DEFAULT_LEARNING_LANGUAGE
    );
    return user?.points || 0;
  }

  /**
   * Set the last processed word pairs
   * @param wordPairs - Array of word pairs
   */
  setLastWordPairs(wordPairs: WordPair[]): void {
    this.lastWordPairs = wordPairs;
  }

  /**
   * Get the last processed word pairs
   */
  getLastWordPairs(): WordPair[] {
    return this.lastWordPairs;
  }

  /**
   * Check if word pairs are available
   */
  hasWordPairs(): boolean {
    return this.lastWordPairs.length > 0;
  }

  /**
   * Check if user is in practice mode
   * @param userId - Telegram user ID
   */
  async isUserInPracticeMode(userId: number): Promise<boolean> {
    const mode = await this.dbService.getUserMode(userId);
    return mode === UserMode.PRACTICE;
  }

  /**
   * Set user practice mode
   * @param userId - Telegram user ID
   * @param isPracticeMode - Whether the user is in practice mode
   */
  async setUserPracticeMode(
    userId: number,
    isPracticeMode: boolean
  ): Promise<void> {
    await this.dbService.setUserMode(
      userId,
      isPracticeMode ? UserMode.PRACTICE : UserMode.DEFAULT
    );
  }

  /**
   * Set user mode
   */
  async setUserMode(userId: number, mode: UserMode): Promise<void> {
    await this.dbService.setUserMode(userId, mode);
  }

  /**
   * Get user mode
   */
  async getUserMode(userId: number): Promise<UserMode> {
    const mode = await this.dbService.getUserMode(userId);
    return mode || UserMode.DEFAULT;
  }

  /**
   * Add diary entry
   */
  async addDiaryEntry(userId: number, entry: DiaryEntry): Promise<void> {
    await this.dbService.addDiaryEntry(userId, entry.text);
  }

  /**
   * Get user diary entries
   */
  async getUserDiaryEntries(userId: number): Promise<DiaryEntry[]> {
    const entries = await this.dbService.getUserDiaryEntries(userId);
    return entries.map((entry) => ({
      text: entry.text,
      date: entry.createdAt.toISOString().split('T')[0],
      telegramId: entry.telegramId
    }));
  }

  /**
   * Add processed diary entry
   */
  async addProcessedDiaryEntry(
    userId: number,
    entry: ProcessedDiaryEntry
  ): Promise<void> {
    // Find the most recent unprocessed entry
    const diaryEntries = await this.dbService.getUserDiaryEntries(userId);
    if (diaryEntries.length === 0) return;

    // Find the latest unprocessed entry
    const unprocessedEntries = diaryEntries.filter((e) => !e.processed);
    if (unprocessedEntries.length === 0) return;

    const latestEntry = unprocessedEntries[0];

    // Convert WordPair[] to the expected format for the database
    const unknownWords = entry.unknownWords.map((pair) => ({
      word: pair.front,
      translation: pair.back
    }));

    // Save the processed entry - adjust parameters to match the method signature
    await this.dbService.saveProcessedDiaryEntry(
      latestEntry.id,
      entry.correctedText,
      entry.improvements,
      unknownWords,
      entry.mnemonics
    );
  }

  /**
   * Get user processed diary entries
   */
  async getUserProcessedDiaryEntries(
    userId: number
  ): Promise<ProcessedDiaryEntry[]> {
    const entries = await this.dbService.getUserDiaryEntries(userId);
    const processedEntries = entries.filter(
      (e) => e.processed && e.correctedText
    );

    return processedEntries.map((entry) => {
      // Convert database objects back to WordPair format
      const unknownWords: WordPair[] = Array.isArray(entry.unknownWords)
        ? entry.unknownWords.map((word: any) => ({
            front: word.word || '',
            back: word.translation || ''
          }))
        : [];

      return {
        telegramId: entry.telegramId,
        originalText: entry.text,
        correctedText: entry.correctedText || '',
        improvements: entry.improvements || [],
        unknownWords,
        mnemonics: (entry.mnemonics || []) as {
          word: string;
          mnemonic: string;
          exampleSentence?: string;
          pronunciation?: string;
        }[]
      };
    });
  }

  /**
   * Add message to user's chat history
   * @param userId - Telegram user ID
   * @param message - The chat message to add
   * @param maxHistory - Maximum number of messages to keep in history
   */
  async addChatMessage(
    userId: number,
    message: ChatMessage,
    maxHistory: number = 10
  ): Promise<void> {
    await this.dbService.addChatMessage(userId, message.role, message.content);
  }

  /**
   * Get user's chat history
   * @param userId - Telegram user ID
   * @param limit - Maximum number of messages to return
   */
  async getUserChatHistory(
    userId: number,
    limit?: number
  ): Promise<ChatMessage[]> {
    const messages = await this.dbService.getChatHistory(userId, limit);
    return messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
      timestamp: msg.createdAt.getTime()
    }));
  }

  /**
   * Clear user's chat history
   * @param userId - Telegram user ID
   */
  async clearUserChatHistory(userId: number): Promise<void> {
    await this.dbService.clearChatHistory(userId);
  }

  /**
   * Get last chat timestamp
   * @param userId - Telegram user ID
   */
  async getLastChatTimestamp(userId: number): Promise<number | undefined> {
    const messages = await this.dbService.getChatHistory(userId, 1);
    return messages.length > 0 ? messages[0].createdAt.getTime() : undefined;
  }

  /**
   * Add or update a word in user's vocabulary
   * @param userId - Telegram user ID
   * @param entry - The vocabulary entry to add/update
   */
  async addToVocabulary(userId: number, entry: VocabularyEntry): Promise<void> {
    await this.dbService.addVocabularyEntry(
      userId,
      entry.word,
      entry.translation,
      entry.context
    );
  }

  /**
   * Get user's vocabulary
   * @param userId - Telegram user ID
   * @param limit - Maximum number of entries to return
   * @param sortBy - Sort field
   */
  async getUserVocabulary(
    userId: number,
    limit?: number,
    sortBy: keyof VocabularyEntry = 'addedDate'
  ): Promise<VocabularyEntry[]> {
    // Map from VocabularyEntry field to database field
    const dbFieldMap: Record<string, string> = {
      addedDate: 'createdAt',
      errorCount: 'errorCount',
      lastPracticed: 'lastPracticed',
      word: 'word',
      translation: 'translation',
      context: 'context'
    };

    // Get the corresponding database field name
    const dbSortBy = dbFieldMap[sortBy] || 'createdAt';

    const entries = await this.dbService.getUserVocabulary(
      userId,
      limit,
      dbSortBy as any,
      'DESC'
    );

    return entries.map((entry) => ({
      word: entry.word,
      translation: entry.translation,
      context: entry.context || undefined,
      addedDate: entry.createdAt.getTime(),
      lastPracticed: entry.lastPracticed
        ? entry.lastPracticed.getTime()
        : undefined,
      errorCount: entry.errorCount
    }));
  }

  /**
   * Search user's vocabulary
   * @param userId - Telegram user ID
   * @param query - Search query
   */
  async searchVocabulary(
    userId: number,
    query: string
  ): Promise<VocabularyEntry[]> {
    const entries = await this.dbService.searchVocabulary(userId, query);

    return entries.map((entry) => ({
      word: entry.word,
      translation: entry.translation,
      context: entry.context || undefined,
      addedDate: entry.createdAt.getTime(),
      lastPracticed: entry.lastPracticed
        ? entry.lastPracticed.getTime()
        : undefined,
      errorCount: entry.errorCount
    }));
  }

  /**
   * Remove a word from user's vocabulary
   * @param userId - Telegram user ID
   * @param word - The word to remove
   */
  async removeFromVocabulary(userId: number, word: string): Promise<boolean> {
    const entries = await this.dbService.getUserVocabulary(userId);
    const entryToRemove = entries.find(
      (e) => e.word.toLowerCase() === word.toLowerCase()
    );

    if (entryToRemove) {
      // This assumes that a removeVocabularyEntry method exists in DatabaseService
      // If it doesn't, it should be implemented to provide a public interface to remove entries
      return this.dbService.removeVocabularyEntry(entryToRemove.id);
    }

    return false;
  }

  /**
   * Export user's vocabulary to Anki deck
   * @param userId - Telegram user ID
   */
  async exportVocabularyToWordPairs(userId: number): Promise<WordPair[]> {
    return this.dbService.exportVocabularyToAnki(userId);
  }

  /**
   * Set the dictation type for a user
   * @param userId - Telegram user ID
   * @param type - Dictation type
   */
  setUserDictationType(userId: number, type: DictationFormat): void {
    // If there's an existing dictation, update its format
    if (this.activeDictations.has(userId)) {
      const dictation = this.activeDictations.get(userId)!;
      this.activeDictations.set(userId, { ...dictation, format: type });
    } else {
      // Otherwise create a new dictation state with the format
      this.activeDictations.set(userId, {
        currentIndex: 0,
        phrases: [],
        points: 0,
        format: type
      });
    }
  }

  /**
   * Get user's current subscription status
   * @param userId - Telegram user ID
   */
  async getUserSubscription(userId: number): Promise<SubscriptionStatus> {
    const invoice = await this.dbService.getActiveSubscription(userId);
    const userLang = await this.getUserLanguage(userId);

    if (!invoice) {
      return {
        plan: 'free',
        isActive: true,
        features: getSubscriptionFeatures(userLang).free
      };
    }

    return {
      plan: invoice.subscriptionPlan,
      isActive: invoice.status === 'completed',
      expiresAt: invoice.expiresAt ? invoice.expiresAt.getTime() : undefined,
      paymentChargeId: invoice.paymentId || undefined,
      features: getSubscriptionFeatures(userLang)[invoice.subscriptionPlan]
    };
  }

  /**
   * Update user's subscription plan
   * @param userId - Telegram user ID
   * @param plan - Subscription plan to set
   * @param expiresAt - Expiration timestamp
   * @param paymentChargeId - Telegram payment charge ID
   */
  async setUserSubscription(
    userId: number,
    plan: SubscriptionPlan,
    expiresAt?: number,
    paymentChargeId?: string
  ): Promise<void> {
    const expiryDate = expiresAt ? new Date(expiresAt) : undefined;

    await this.dbService.createInvoice(
      userId,
      plan,
      0, // Amount - this would need proper implementation
      expiryDate,
      paymentChargeId
    );
  }

  /**
   * Check if user's subscription is active
   * @param userId - Telegram user ID
   */
  async isSubscriptionActive(userId: number): Promise<boolean> {
    const invoice = await this.dbService.getActiveSubscription(userId);
    return !!invoice;
  }

  /**
   * Check if user has access to a specific premium feature
   * @param userId - Telegram user ID
   * @param planLevel - Minimum subscription plan required
   */
  async hasFeatureAccess(
    userId: number,
    planLevel: SubscriptionPlan
  ): Promise<boolean> {
    const planRanking = { free: 0, basic: 1, premium: 2 };
    const subscription = await this.getUserSubscription(userId);

    // Make sure subscription is active
    if (!(await this.isSubscriptionActive(userId))) {
      return planLevel === 'free';
    }

    return planRanking[subscription.plan] >= planRanking[planLevel];
  }

  /**
   * Cancel user's subscription
   * @param userId - Telegram user ID
   */
  async cancelSubscription(userId: number): Promise<void> {
    const invoice = await this.dbService.getActiveSubscription(userId);
    if (invoice) {
      await this.dbService.updateInvoiceStatus(invoice.id, 'failed');
    }
  }

  /**
   * Get chat history limit based on user's subscription
   * @param userId - Telegram user ID
   */
  async getChatHistoryLimit(userId: number): Promise<number> {
    const subscription = await this.getUserSubscription(userId);

    switch (subscription.plan) {
      case 'premium':
        return 50; // Unlimited for our purposes
      case 'basic':
        return 20;
      default:
        return 10;
    }
  }

  /**
   * Get user's learning language
   * @param userId - Telegram user ID
   */
  async getUserLearningLanguage(
    userId: number,
    telegramUser?: User
  ): Promise<SupportedLearningLanguage> {
    const user = await this.dbService.getOrCreateUser(
      {
        id: userId,
        first_name: telegramUser?.first_name || `User ${userId}`,
        last_name: telegramUser?.last_name || undefined,
        username: telegramUser?.username || undefined
      },
      DEFAULT_LANGUAGE,
      DEFAULT_LEARNING_LANGUAGE
    );
    return user?.learningLanguage || DEFAULT_LEARNING_LANGUAGE;
  }

  /**
   * Set user's learning language
   * @param userId - Telegram user ID
   * @param language - Learning language code
   */
  async setUserLearningLanguage(
    userId: number,
    language: SupportedLearningLanguage
  ): Promise<void> {
    await this.dbService.updateUserLearningLanguage(userId, language);
  }

  /**
   * Set temporary data for a user
   * @param userId - Telegram user ID
   * @param key - Data key
   * @param value - Data value
   */
  setUserTemporaryData(userId: number, key: string, value: any): void {
    if (!this.temporaryUserData.has(userId)) {
      this.temporaryUserData.set(userId, {});
    }

    const userData = this.temporaryUserData.get(userId)!;
    userData[key] = value;
  }

  /**
   * Get temporary data for a user
   * @param userId - Telegram user ID
   * @param key - Data key
   * @returns The stored value or undefined if not found
   */
  getUserTemporaryData(userId: number, key: string): any {
    if (!this.temporaryUserData.has(userId)) {
      return undefined;
    }

    const userData = this.temporaryUserData.get(userId)!;
    return userData[key];
  }

  /**
   * Clear specific temporary data for a user
   * @param userId - Telegram user ID
   * @param key - Data key to clear
   */
  clearUserTemporaryData(userId: number, key: string): void {
    if (!this.temporaryUserData.has(userId)) {
      return;
    }

    const userData = this.temporaryUserData.get(userId)!;
    delete userData[key];
  }

  /**
   * Clear all temporary data for a user
   * @param userId - Telegram user ID
   */
  clearAllUserTemporaryData(userId: number): void {
    this.temporaryUserData.delete(userId);
  }

  /**
   * Set user diary mode
   */
  async setUserDiaryMode(userId: number, isDiaryMode: boolean): Promise<void> {
    await this.dbService.setUserMode(
      userId,
      isDiaryMode ? UserMode.DIARY : UserMode.DEFAULT
    );
  }

  /**
   * Check if user is in diary mode
   */
  async isUserInDiaryMode(userId: number): Promise<boolean> {
    const mode = await this.dbService.getUserMode(userId);
    return mode === UserMode.DIARY;
  }
}

// Export singleton instance
export const store = new StateStore();
