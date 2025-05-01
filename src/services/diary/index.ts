/**
 * Diary processing service with AI assistance
 */
import { chatCompletion, jsonChatCompletion } from '../openai';
import {
  DiaryEntry,
  ProcessedDiaryEntry,
  WordPair,
  AnkiDeck
} from '../../types';
import { extractWordPairs } from '../openai';
import { normalizeHungarianText } from '../../utils/text';
import * as fs from 'fs/promises';
import path from 'path';
import { TMP_DIR, ensureUserDir } from '../../config';
import { createAnkiDeck as createDocumentAnkiDeck } from '../document';
import { CODE_TO_LANGUAGE, SupportedLanguage } from '../i18n';

// Define the response structures for type safety
interface DiaryProcessingResponse {
  correctedText: string;
  improvements: string[];
  wordPairs: { hungarian: string; russian: string }[];
  mnemonics: {
    word: string;
    mnemonic: string;
    exampleSentence?: string;
    pronunciation?: string;
  }[];
}

interface LearningSuggestionsResponse {
  patterns: string[];
  priorityWords: string[];
  grammarPoints: string[];
  practiceIdeas: string[];
}

/**
 * Process diary entry with AI assistance
 */
export async function processDiaryEntry(
  entry: DiaryEntry,
  language: SupportedLanguage
): Promise<ProcessedDiaryEntry> {
  try {
    // First, let's analyze the text and identify Russian words
    const prompt = `
You are a Hungarian language learning assistant.

Analyze this Hungarian diary entry. Some words might be in Russian (in parentheses).
Identify grammar mistakes, suggest improvements, and create mnemonics for new words.

Text:
"""
${entry.text}
"""

Respond with JSON in the following format:
{
  "correctedText": "Text with Russian words translated to Hungarian",
  "improvements": ["Suggestion 1", "Suggestion 2", ...],
  "wordPairs": [
    {"hungarian": "word1", "russian": "translation1"},
    {"hungarian": "word2", "russian": "translation2"}
  ],
  "mnemonics": [
    {
      "word": "word1", 
      "mnemonic": "Memory aid 1",
      "exampleSentence": "Example sentence using the word",
      "pronunciation": "Approximate pronunciation guide"
    },
    {
      "word": "word2", 
      "mnemonic": "Memory aid 2",
      "exampleSentence": "Example sentence using the word",
      "pronunciation": "Approximate pronunciation guide"
    }
  ]
}

Use ${CODE_TO_LANGUAGE[language]} language for the mnemonics.

Include at least 3 mnemonics for the most important words.
For each mnemonic, provide:
1. A memorable association in ${CODE_TO_LANGUAGE[language]}
2. A simple example sentence in Hungarian
3. A pronunciation guide using Russian phonetics`;

    // Use the new jsonChatCompletion function
    const response = await jsonChatCompletion<DiaryProcessingResponse>(
      prompt,
      0.7
    );

    // Convert word pairs to required format
    const wordPairs: WordPair[] = response.wordPairs.map((pair) => ({
      front: pair.hungarian,
      back: pair.russian
    }));

    return {
      originalText: entry.text,
      correctedText: response.correctedText,
      improvements: response.improvements,
      unknownWords: wordPairs,
      mnemonics: response.mnemonics
    };
  } catch (error) {
    console.error('Failed to process diary entry:', error);

    // Fallback to a simple response in case of error
    return {
      originalText: entry.text,
      correctedText: entry.text,
      improvements: ['Could not process text properly. Please try again.'],
      unknownWords: [],
      mnemonics: []
    };
  }
}

/**
 * Create Anki deck from processed diary entries
 */
export async function createAnkiDeck(
  entries: ProcessedDiaryEntry[],
  userId: number
): Promise<AnkiDeck> {
  try {
    // Collect all unique word pairs and mnemonics
    const uniqueWords = new Map<string, WordPair>();
    const mnemonicsMap = new Map<
      string,
      {
        exampleSentence?: string;
        pronunciation?: string;
        mnemonic: string;
      }
    >();

    entries.forEach((entry) => {
      // Collect word pairs
      entry.unknownWords.forEach((pair) => {
        if (!uniqueWords.has(pair.front)) {
          uniqueWords.set(pair.front, pair);
        }
      });

      // Collect mnemonics
      entry.mnemonics.forEach((m) => {
        if (!mnemonicsMap.has(m.word)) {
          mnemonicsMap.set(m.word, {
            exampleSentence: m.exampleSentence,
            pronunciation: m.pronunciation,
            mnemonic: m.mnemonic
          });
        }
      });
    });

    const wordPairs = Array.from(uniqueWords.values());
    const deckName = `Hungarian Diary Words - ${new Date().toLocaleDateString()}`;

    // Ensure user directory exists
    const userDir = await ensureUserDir(userId);
    const deckFilePath = path.join(
      userDir,
      `anki_diary_${userId}_${Date.now()}.apkg`
    );

    // Create enhanced word pairs with mnemonic information
    // We'll format the 'back' side of the card to include mnemonics, example sentences, etc.
    const enhancedWordPairs = wordPairs.map((pair) => {
      const mnemonic = mnemonicsMap.get(pair.front);
      let enhancedBack = pair.back;

      // If we have mnemonic data, add it to the back of the card
      if (mnemonic) {
        if (mnemonic.exampleSentence) {
          enhancedBack += `\n\nExample: ${mnemonic.exampleSentence}`;
        }
        if (mnemonic.pronunciation) {
          enhancedBack += `\n\nPronunciation: ${mnemonic.pronunciation}`;
        }
        if (mnemonic.mnemonic) {
          enhancedBack += `\n\nMnemonic: ${mnemonic.mnemonic}`;
        }
      }

      return {
        front: pair.front,
        back: enhancedBack
      };
    });

    // Use the document.ts createAnkiDeck function to generate the Anki package
    // This returns a Buffer with the Anki package data
    const ankiPackageBuffer = await createDocumentAnkiDeck(
      deckName,
      enhancedWordPairs,
      userId
    );

    // Write the buffer to the specified file path
    await fs.writeFile(deckFilePath, ankiPackageBuffer);

    console.log(`Anki deck file saved to: ${deckFilePath}`);

    return {
      name: deckName,
      words: wordPairs,
      date: new Date().toISOString(),
      userId,
      filePath: deckFilePath
    };
  } catch (error) {
    console.error('Error in createAnkiDeck:', error);
    throw new Error(
      `Failed to create Anki deck: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * Generate learning suggestions based on diary entries
 */
export async function generateLearningSuggestions(
  entries: ProcessedDiaryEntry[],
  language: SupportedLanguage
): Promise<string[]> {
  try {
    const prompt = `
You are a Hungarian language learning assistant.

Based on these diary entries and their corrections, suggest learning strategies.
Focus on common patterns and frequently used words.

Entries:
${entries
  .map(
    (e) => `
Original: ${e.originalText}
Corrected: ${e.correctedText}
`
  )
  .join('\n')}

Respond with JSON in the following format:
{
  "patterns": ["Common pattern 1", "Common pattern 2", ...],
  "priorityWords": ["Word 1", "Word 2", ...],
  "grammarPoints": ["Grammar point 1", "Grammar point 2", ...],
  "practiceIdeas": ["Practice idea 1", "Practice idea 2", ...]
}

Use ${
      CODE_TO_LANGUAGE[language]
    } language for the suggestions, identify grammar mistakes and suggest improvements.

Include at least 3 items in each category.`;

    // Use the new jsonChatCompletion function
    const response = await jsonChatCompletion<LearningSuggestionsResponse>(
      prompt,
      0.7
    );

    // Combine all suggestions into a single array with icons
    return [
      ...response.patterns.map((p) => `📊 Pattern: ${p}`),
      ...response.priorityWords.map((w) => `📝 Priority Word: ${w}`),
      ...response.grammarPoints.map((g) => `📖 Grammar: ${g}`),
      ...response.practiceIdeas.map((i) => `🏋️‍♂️ Practice: ${i}`)
    ];
  } catch (error) {
    console.error('Failed to generate learning suggestions:', error);
    return ['Could not generate learning suggestions. Please try again.'];
  }
}

/**
 * Clean up Anki deck file after sending
 * @param filePath - Path to the Anki deck file
 */
export async function cleanupAnkiDeckFile(filePath: string): Promise<void> {
  try {
    if (!filePath) {
      console.log('No file path provided for cleanup');
      return;
    }

    // Check if file exists before attempting to delete
    try {
      await fs.access(filePath);
      // Delete the file
      await fs.unlink(filePath);
      console.log(`Cleaned up temporary Anki deck file: ${filePath}`);
    } catch (error) {
      // File doesn't exist or can't be accessed
      console.warn(
        `File not found or cannot be accessed for cleanup: ${filePath}`
      );
    }
  } catch (error) {
    // Don't throw errors during cleanup
    console.error(`Failed to clean up Anki deck file: ${filePath}`, error);
  }
}
