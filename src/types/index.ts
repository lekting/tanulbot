/**
 * Type definitions for the application
 */
import { SupportedLanguage, SupportedLearningLanguage } from '../services/i18n';

export type DictationDifficulty = 'easy' | 'medium' | 'hard';
export type DictationFormat = 'words' | 'phrases' | 'stories';

/**
 * Structure for dictation state tracking
 */
export interface DictationState {
  currentIndex: number;
  phrases: { text: string; audioPath: string }[];
  points: number;
  difficulty?: DictationDifficulty;
  format?: DictationFormat;
}

/**
 * Chat message structure
 */
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

/**
 * User vocabulary word entry
 */
export interface VocabularyEntry {
  word: string; // Word in learning language
  translation: string; // Translation to user's language
  context?: string; // Example sentence or context where the word was used
  addedDate: number; // Timestamp when the word was added
  lastPracticed?: number; // Timestamp of last practice
  errorCount: number; // Number of times user made errors with this word
}

/**
 * Subscription plan types
 */
export type SubscriptionPlan = 'free' | 'basic' | 'premium';

/**
 * Subscription status interface
 */
export interface SubscriptionStatus {
  plan: SubscriptionPlan;
  isActive: boolean;
  expiresAt?: number;
  paymentChargeId?: string;
  features: string[];
}

/**
 * User state
 */
export interface UserState {
  isActive: boolean;
  points: number;
  language: SupportedLanguage;
  learningLanguage: SupportedLearningLanguage;
  isDiaryMode: boolean;
  diaryEntries: DiaryEntry[];
  processedDiaryEntries: ProcessedDiaryEntry[];
  chatHistory: ChatMessage[];
  lastChatTimestamp?: number;
  vocabulary: VocabularyEntry[]; // User's personal vocabulary
  subscription: SubscriptionStatus; // User subscription status
}

/**
 * Structure for vocabulary word pairs
 */
export interface WordPair {
  front: string; // Word in learning language
  back: string; // Translation to user's native language
}

/**
 * Voice options for text-to-speech
 */
export type OpenAIVoice =
  | 'alloy'
  | 'echo'
  | 'fable'
  | 'onyx'
  | 'nova'
  | 'shimmer';

/**
 * Structure for diary entries
 */
export interface DiaryEntry {
  text: string;
  date: string;
  userId: number;
}

/**
 * Structure for processed diary entry
 */
export interface ProcessedDiaryEntry {
  originalText: string;
  correctedText: string;
  improvements: string[];
  unknownWords: WordPair[];
  mnemonics: {
    word: string;
    mnemonic: string;
    exampleSentence?: string;
    pronunciation?: string;
  }[];
}

/**
 * Structure for Anki deck
 */
export interface AnkiDeck {
  name: string;
  words: WordPair[];
  date: string;
  userId: number;
  filePath?: string;
}
