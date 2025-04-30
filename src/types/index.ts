/**
 * Type definitions for the application
 */
import { SupportedLanguage } from '../services/i18n';

export type DictationDifficulty = 'easy' | 'medium' | 'hard';
export type DictationFormat = 'words' | 'story';

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
  word: string;            // Hungarian word
  translation: string;     // Translation to user's language
  context?: string;        // Example sentence or context where the word was used
  addedDate: number;       // Timestamp when the word was added
  lastPracticed?: number;  // Timestamp of last practice
  errorCount: number;      // Number of times user made errors with this word
}

/**
 * User state
 */
export interface UserState {
  isActive: boolean;
  points: number;
  language: SupportedLanguage;
  isDiaryMode: boolean;
  diaryEntries: DiaryEntry[];
  processedDiaryEntries: ProcessedDiaryEntry[];
  chatHistory: ChatMessage[];
  lastChatTimestamp?: number;
  vocabulary: VocabularyEntry[];  // User's personal vocabulary
}

/**
 * Structure for vocabulary word pairs
 */
export interface WordPair {
  front: string; // Hungarian word
  back: string;  // Russian translation
}

/**
 * Voice options for text-to-speech
 */
export type OpenAIVoice = 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';

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