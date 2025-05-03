import * as fs from 'fs/promises';
import { store } from '../../store';
import { DiaryEntry, ProcessedDiaryEntry, WordPair } from '../../types';
import { chatCompletion, extractJsonContent } from '../openai';
import * as path from 'path';
import { ensureUserDir } from '../../config';
import {
  CODE_TO_LANGUAGE,
  SupportedLanguage,
  LEARNING_LANGUAGE_TO_NAME
} from '../i18n';
import { normalizeText } from '../../utils/text';
import { execFile as execFileCallback } from 'child_process';
import { promisify } from 'util';
import { DatabaseService } from '../DatabaseService';

const execFile = promisify(execFileCallback);

// Create a database service instance for logging
const databaseService = new DatabaseService();

// Define the response structure for type safety
interface ProcessedDiaryResult {
  correctedText: string;
  improvements: string[];
  mnemonics: {
    word: string;
    mnemonic: string;
    exampleSentence?: string;
    pronunciation?: string;
  }[];
  wordPairs: { front: string; back: string }[];
}

/**
 * Process diary entry and get corrections, improvements, etc.
 */
export async function processDiaryEntry(
  entry: DiaryEntry,
  language: SupportedLanguage
): Promise<ProcessedDiaryEntry> {
  // Get the user's learning language
  const learningLanguage = await store.getUserLearningLanguage(
    entry.telegramId
  );
  const languageName = LEARNING_LANGUAGE_TO_NAME[learningLanguage];
  const nativeLanguageName = CODE_TO_LANGUAGE[language];

  const prompt = `
You are a ${languageName} language learning assistant.

Analyze this ${languageName} diary entry. Some words might be in ${nativeLanguageName} (in parentheses).

Entry: "${entry.text}"

Create a JSON response with these fields:
1. "correctedText": A grammatically corrected version with unknown words translated to ${languageName}
2. "improvements": Array of 3-5 specific improvement suggestions in ${nativeLanguageName}
3. "mnemonics": Array of objects for 2-3 important words with:
   - "word": The ${languageName} word
   - "mnemonic": A memorable way to remember it in ${nativeLanguageName}
   - "exampleSentence": A simple ${languageName} sentence using the word
   - "pronunciation": How to pronounce it (if applicable)
4. "wordPairs": Array of ${languageName}-${nativeLanguageName} word pairs from the text, formatted as:
   {"front": "word1", "back": "translation1"},
   {"front": "word2", "back": "translation2"}

Format as valid JSON.`;

  try {
    const content = await chatCompletion(
      prompt,
      0.7,
      entry.telegramId, // Pass user ID for logging
      databaseService // Pass database service for logging
    );

    if (!content) {
      throw new Error('Empty response from LLM');
    }

    const result = JSON.parse(
      extractJsonContent(content)
    ) as ProcessedDiaryResult;

    // Map word pairs to expected format
    const wordPairs: WordPair[] = result.wordPairs.map((pair) => ({
      front: pair.front,
      back: pair.back
    }));

    return {
      telegramId: entry.telegramId,
      originalText: entry.text,
      correctedText: result.correctedText,
      improvements: result.improvements,
      unknownWords: wordPairs,
      mnemonics: result.mnemonics
    };
  } catch (error) {
    console.error('Error processing diary entry:', error);
    throw new Error('Failed to process diary entry');
  }
}

/**
 * Create Anki deck from processed diary entries
 */
export async function createAnkiDeck(
  entries: ProcessedDiaryEntry[],
  userId: number
): Promise<{
  name: string;
  words: WordPair[];
  date: string;
  userId: number;
  filePath?: string;
}> {
  // Validate userId is a proper number
  if (isNaN(userId) || !Number.isInteger(userId)) {
    throw new Error(`Invalid user ID: ${userId}`);
  }

  // Get the user's learning language
  const learningLanguage = await store.getUserLearningLanguage(userId);
  const languageName = LEARNING_LANGUAGE_TO_NAME[learningLanguage];

  try {
    // Extract unique words from all entries
    const wordMap = new Map<string, WordPair>();

    entries.forEach((entry) => {
      entry.unknownWords.forEach((pair) => {
        const key = normalizeText(pair.front);
        if (!wordMap.has(key) && pair.front && pair.back) {
          wordMap.set(key, {
            front: pair.front,
            back: pair.back
          });
        }
      });
    });

    const words = Array.from(wordMap.values());
    const date = new Date().toLocaleDateString();
    const deckName = `${languageName} Diary Words - ${date}`;

    // Prepare word pairs JSON file
    const userDir = await ensureUserDir(userId);
    const jsonPath = path.join(userDir, `word_pairs_${Date.now()}.json`);
    await fs.writeFile(jsonPath, JSON.stringify(words, null, 2), 'utf-8');

    // Generate Anki deck file
    const outputPath = path.join(userDir, `deck_${Date.now()}.apkg`);

    // Run Python script to generate Anki deck
    try {
      await execFile(
        'python',
        ['create-anki-deck.py', jsonPath, outputPath, '--deck-name', deckName],
        {
          timeout: 30000 // 30 seconds timeout
        }
      );

      return {
        name: deckName,
        words,
        date,
        userId,
        filePath: outputPath
      };
    } catch (pythonError) {
      console.error('Error running Python script:', pythonError);
      throw new Error(
        `Failed to generate Anki deck: ${
          pythonError instanceof Error ? pythonError.message : 'Unknown error'
        }`
      );
    }
  } catch (error) {
    console.error('Error creating Anki deck:', error);
    throw error;
  }
}

/**
 * Remove Anki deck file after sending
 */
export async function cleanupAnkiDeckFile(filePath: string): Promise<void> {
  try {
    await fs.unlink(filePath);
    console.log(`Anki deck file removed: ${filePath}`);
  } catch (error) {
    console.error(`Error removing Anki deck file ${filePath}:`, error);
  }
}

/**
 * Generate learning suggestions for vocabulary
 */
export async function generateLearningSuggestions(
  entries: ProcessedDiaryEntry[],
  language: SupportedLanguage
): Promise<string[]> {
  // Get learning language from the first entry's user ID
  const userId = entries[0]?.telegramId;
  const learningLanguage = await store.getUserLearningLanguage(userId);
  const languageName = LEARNING_LANGUAGE_TO_NAME[learningLanguage];

  // Extract all word pairs
  const allWords = entries.flatMap((entry) => entry.unknownWords);

  if (allWords.length === 0) {
    return ['No vocabulary words to create suggestions.'];
  }

  // Create word list for the prompt
  const wordList = allWords
    .map((pair) => `${pair.front} - ${pair.back}`)
    .join('\n');

  const prompt = `
You are a language learning expert. Based on these ${languageName} vocabulary words, provide 3-5 learning tips in ${CODE_TO_LANGUAGE[language]}.

Words:
${wordList}

Provide tips for effective memorization, usage patterns, or common mistakes to avoid.
Keep each tip brief (1-2 sentences).
SEND ONLY THE TIPS, NO OTHER TEXT.
`;

  try {
    const response = await chatCompletion(
      prompt,
      0.7,
      userId, // Pass user ID for logging
      databaseService // Pass database service for logging
    );
    // Split the response into separate tips
    return response
      .split('\n')
      .filter((line) => line.trim().length > 0)
      .map((line) => line.replace(/^\d+\.\s*/, '').trim());
  } catch (error) {
    console.error('Error generating learning suggestions:', error);
    return [
      `Error generating suggestions. Try reviewing the words in small batches of 5-10 at a time.`
    ];
  }
}
