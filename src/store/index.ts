/**
 * Application state management
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

/**
 * In-memory state store
 */
export class StateStore {
  private users: Map<number, UserState> = new Map();

  // Users actively practicing their learning language
  private activeChatUsers = new Map<number, number>();

  // Active dictation sessions
  private activeDictations = new Map<number, DictationState>();

  // User scores
  private userScores = new Map<number, number>();

  // Temporary user data for multi-step interactions
  private temporaryUserData = new Map<number, Record<string, any>>();

  // Last processed word pairs
  private lastWordPairs: WordPair[] = [];

  private getOrCreateUser(userId: number): UserState {
    if (!this.users.has(userId)) {
      this.users.set(userId, {
        isActive: false,
        points: 0,
        language: DEFAULT_LANGUAGE,
        learningLanguage: DEFAULT_LEARNING_LANGUAGE,
        isDiaryMode: false,
        diaryEntries: [],
        processedDiaryEntries: [],
        chatHistory: [],
        vocabulary: [],
        subscription: {
          plan: 'free',
          isActive: true,
          features: getSubscriptionFeatures(DEFAULT_LANGUAGE).free
        }
      });
    }
    return this.users.get(userId)!;
  }

  /**
   * Track a user as active in chat
   * @param userId - Telegram user ID
   */
  setUserActive(userId: number): void {
    const user = this.getOrCreateUser(userId);
    user.isActive = true;
    this.activeChatUsers.set(userId, Date.now());
  }

  /**
   * Check if a user is active
   * @param userId - Telegram user ID
   */
  isUserActive(userId: number): boolean {
    return this.getOrCreateUser(userId).isActive;
  }

  /**
   * Get all active users with their last active timestamp
   */
  getActiveUsers(): Map<number, number> {
    return this.activeChatUsers;
  }

  /**
   * Remove user from active users
   * @param userId - Telegram user ID
   */
  removeActiveUser(userId: number): void {
    this.activeChatUsers.delete(userId);
  }

  /**
   * Get user's preferred language
   * @param userId - Telegram user ID
   */
  getUserLanguage(userId: number): SupportedLanguage {
    return this.getOrCreateUser(userId).language;
  }

  /**
   * Set user's preferred language
   * @param userId - Telegram user ID
   * @param language - Language code
   */
  setUserLanguage(userId: number, language: SupportedLanguage): void {
    const user = this.getOrCreateUser(userId);
    user.language = language;

    // Update subscription features to match the new language
    if (user.subscription) {
      user.subscription.features =
        getSubscriptionFeatures(language)[user.subscription.plan];
    }
  }

  /**
   * Start dictation for a user
   * @param userId - Telegram user ID
   * @param state - Initial dictation state
   */
  startDictation(userId: number, state: DictationState): void {
    const user = this.getOrCreateUser(userId);
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
  addPoints(userId: number, points: number): void {
    const user = this.getOrCreateUser(userId);
    user.points += points;
  }

  /**
   * Get a user's score
   * @param userId - Telegram user ID
   */
  getPoints(userId: number): number {
    return this.getOrCreateUser(userId).points;
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

  // Diary methods
  setUserDiaryMode(userId: number, isDiaryMode: boolean): void {
    const user = this.getOrCreateUser(userId);
    user.isDiaryMode = isDiaryMode;
  }

  isUserInDiaryMode(userId: number): boolean {
    return this.getOrCreateUser(userId).isDiaryMode;
  }

  addDiaryEntry(userId: number, entry: DiaryEntry): void {
    const user = this.getOrCreateUser(userId);
    user.diaryEntries.push(entry);
  }

  getUserDiaryEntries(userId: number): DiaryEntry[] {
    return this.getOrCreateUser(userId).diaryEntries;
  }

  addProcessedDiaryEntry(userId: number, entry: ProcessedDiaryEntry): void {
    const user = this.getOrCreateUser(userId);
    user.processedDiaryEntries.push(entry);
  }

  getUserProcessedDiaryEntries(userId: number): ProcessedDiaryEntry[] {
    return this.getOrCreateUser(userId).processedDiaryEntries;
  }

  /**
   * Add message to user's chat history
   * @param userId - Telegram user ID
   * @param message - The chat message to add
   * @param maxHistory - Maximum number of messages to keep in history (default: 10)
   */
  addChatMessage(
    userId: number,
    message: ChatMessage,
    maxHistory: number = 10
  ): void {
    const user = this.getOrCreateUser(userId);
    user.chatHistory.push(message);

    // Trim history if it exceeds maximum length
    if (user.chatHistory.length > maxHistory) {
      user.chatHistory = user.chatHistory.slice(-maxHistory);
    }

    // Update last chat timestamp
    user.lastChatTimestamp = Date.now();
  }

  /**
   * Get user's chat history
   * @param userId - Telegram user ID
   * @param limit - Maximum number of messages to return (default: all messages)
   * @returns Array of chat messages
   */
  getUserChatHistory(userId: number, limit?: number): ChatMessage[] {
    const user = this.getOrCreateUser(userId);
    if (limit && limit > 0) {
      return user.chatHistory.slice(-limit);
    }
    return user.chatHistory;
  }

  /**
   * Clear user's chat history
   * @param userId - Telegram user ID
   */
  clearUserChatHistory(userId: number): void {
    const user = this.getOrCreateUser(userId);
    user.chatHistory = [];
  }

  /**
   * Get last chat timestamp
   * @param userId - Telegram user ID
   * @returns Timestamp of last chat message or undefined
   */
  getLastChatTimestamp(userId: number): number | undefined {
    return this.getOrCreateUser(userId).lastChatTimestamp;
  }

  /**
   * Add or update a word in user's vocabulary
   * @param userId - Telegram user ID
   * @param entry - The vocabulary entry to add/update
   */
  addToVocabulary(userId: number, entry: VocabularyEntry): void {
    const user = this.getOrCreateUser(userId);

    // Check if the word already exists
    const existingIndex = user.vocabulary.findIndex(
      (item) => item.word.toLowerCase() === entry.word.toLowerCase()
    );

    if (existingIndex >= 0) {
      // Update existing entry
      const existing = user.vocabulary[existingIndex];
      user.vocabulary[existingIndex] = {
        ...existing,
        translation: entry.translation || existing.translation,
        context: entry.context || existing.context,
        lastPracticed: entry.lastPracticed || existing.lastPracticed,
        errorCount: existing.errorCount + (entry.errorCount || 1)
      };
    } else {
      // Add new entry
      user.vocabulary.push({
        ...entry,
        addedDate: entry.addedDate || Date.now(),
        errorCount: entry.errorCount || 1
      });
    }
  }

  /**
   * Get user's vocabulary
   * @param userId - Telegram user ID
   * @param limit - Maximum number of entries to return (optional)
   * @param sortBy - Sort field (optional, defaults to addedDate)
   * @returns Array of vocabulary entries
   */
  getUserVocabulary(
    userId: number,
    limit?: number,
    sortBy: keyof VocabularyEntry = 'addedDate'
  ): VocabularyEntry[] {
    const user = this.getOrCreateUser(userId);

    // Sort entries by the specified field
    const sorted = [...user.vocabulary].sort((a, b) => {
      if (typeof a[sortBy] === 'number' && typeof b[sortBy] === 'number') {
        return (b[sortBy] as number) - (a[sortBy] as number);
      }
      return 0;
    });

    // Apply limit if specified
    if (limit && limit > 0) {
      return sorted.slice(0, limit);
    }

    return sorted;
  }

  /**
   * Search user's vocabulary
   * @param userId - Telegram user ID
   * @param query - Search query
   * @returns Matching vocabulary entries
   */
  searchVocabulary(userId: number, query: string): VocabularyEntry[] {
    const user = this.getOrCreateUser(userId);
    const searchTerm = query.toLowerCase();

    return user.vocabulary.filter(
      (entry) =>
        entry.word.toLowerCase().includes(searchTerm) ||
        entry.translation.toLowerCase().includes(searchTerm)
    );
  }

  /**
   * Remove a word from user's vocabulary
   * @param userId - Telegram user ID
   * @param word - The word to remove
   * @returns True if word was found and removed, false otherwise
   */
  removeFromVocabulary(userId: number, word: string): boolean {
    const user = this.getOrCreateUser(userId);
    const initialLength = user.vocabulary.length;

    user.vocabulary = user.vocabulary.filter(
      (entry) => entry.word.toLowerCase() !== word.toLowerCase()
    );

    return user.vocabulary.length < initialLength;
  }

  /**
   * Export user's vocabulary to Anki deck
   * @param userId - Telegram user ID
   * @returns Vocabulary entries in WordPair format for Anki
   */
  exportVocabularyToWordPairs(userId: number): WordPair[] {
    const user = this.getOrCreateUser(userId);

    return user.vocabulary.map((entry) => ({
      front: entry.word,
      back: entry.translation
    }));
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
   * @returns User's subscription status
   */
  getUserSubscription(userId: number): SubscriptionStatus {
    return this.getOrCreateUser(userId).subscription;
  }

  /**
   * Update user's subscription plan
   * @param userId - Telegram user ID
   * @param plan - Subscription plan to set
   * @param expiresAt - Expiration timestamp (optional)
   * @param paymentChargeId - Telegram payment charge ID (for refunds)
   */
  setUserSubscription(
    userId: number,
    plan: SubscriptionPlan,
    expiresAt?: number,
    paymentChargeId?: string
  ): void {
    const user = this.getOrCreateUser(userId);
    user.subscription = {
      plan,
      isActive: true,
      expiresAt,
      paymentChargeId,
      features: getSubscriptionFeatures(user.language)[plan]
    };
  }

  /**
   * Check if user's subscription is active
   * @param userId - Telegram user ID
   * @returns Whether the subscription is active
   */
  isSubscriptionActive(userId: number): boolean {
    const subscription = this.getUserSubscription(userId);

    if (!subscription.isActive) {
      return false;
    }

    // If there's an expiration date, check if it's still valid
    if (subscription.expiresAt) {
      return Date.now() < subscription.expiresAt;
    }

    return true;
  }

  /**
   * Check if user has access to a specific premium feature
   * @param userId - Telegram user ID
   * @param planLevel - Minimum subscription plan required
   * @returns Whether the user has access to the feature
   */
  hasFeatureAccess(userId: number, planLevel: SubscriptionPlan): boolean {
    const planRanking = { free: 0, basic: 1, premium: 2 };
    const subscription = this.getUserSubscription(userId);

    // Make sure subscription is active
    if (!this.isSubscriptionActive(userId)) {
      return planLevel === 'free';
    }

    return planRanking[subscription.plan] >= planRanking[planLevel];
  }

  /**
   * Cancel user's subscription
   * @param userId - Telegram user ID
   */
  cancelSubscription(userId: number): void {
    const user = this.getOrCreateUser(userId);
    user.subscription.isActive = false;
  }

  /**
   * Get chat history limit based on user's subscription
   * @param userId - Telegram user ID
   * @returns Maximum number of chat messages to keep
   */
  getChatHistoryLimit(userId: number): number {
    const subscription = this.getUserSubscription(userId);

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
  getUserLearningLanguage(userId: number): SupportedLearningLanguage {
    return this.getOrCreateUser(userId).learningLanguage;
  }

  /**
   * Set user's learning language
   * @param userId - Telegram user ID
   * @param language - Learning language code
   */
  setUserLearningLanguage(
    userId: number,
    language: SupportedLearningLanguage
  ): void {
    const user = this.getOrCreateUser(userId);
    user.learningLanguage = language;
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
}

// Export singleton instance
export const store = new StateStore();
