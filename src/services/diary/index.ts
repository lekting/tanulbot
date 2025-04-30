/**
 * Diary processing service with AI assistance
 */
import { chatCompletion, jsonChatCompletion } from '../openai';
import { DiaryEntry, ProcessedDiaryEntry, WordPair, AnkiDeck } from '../../types';
import { extractWordPairs } from '../openai';
import { normalizeHungarianText } from '../../utils/text';
import * as fs from 'fs/promises';
import path from 'path';
import { Package, Deck, Note, Model, Field, Card } from 'anki-apkg-generator';
import { TMP_DIR } from '../../config';

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
export async function processDiaryEntry(entry: DiaryEntry): Promise<ProcessedDiaryEntry> {
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

Include at least 3 mnemonics for the most important words.
For each mnemonic, provide:
1. A memorable association in English
2. A simple example sentence in Hungarian
3. A pronunciation guide using Russian phonetics`;

    // Use the new jsonChatCompletion function
    const response = await jsonChatCompletion<DiaryProcessingResponse>(prompt, 0.7);
    
    // Convert word pairs to required format
    const wordPairs: WordPair[] = response.wordPairs.map(pair => ({
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
    const mnemonicsMap = new Map<string, {
      exampleSentence?: string;
      pronunciation?: string;
      mnemonic: string;
    }>();
    
    entries.forEach(entry => {
      // Collect word pairs
      entry.unknownWords.forEach(pair => {
        if (!uniqueWords.has(pair.front)) {
          uniqueWords.set(pair.front, pair);
        }
      });
      
      // Collect mnemonics
      entry.mnemonics.forEach(m => {
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
    
    // Ensure TMP_DIR exists
    try {
      await fs.access(TMP_DIR);
    } catch (error) {
      // Create directory if it doesn't exist
      await fs.mkdir(TMP_DIR, { recursive: true });
      console.log(`Created directory: ${TMP_DIR}`);
    }
    
    const deckFilePath = path.join(TMP_DIR, `anki_${userId}_${Date.now()}.apkg`);
    
    // Create the Anki deck using anki-apkg-generator
    // Define enhanced card fields - now with example sentence, pronunciation, and mnemonic
    const fields = [
      { name: 'Front' },
      { name: 'Back' },
      { name: 'Example' },
      { name: 'Pronunciation' },
      { name: 'Mnemonic' }
    ];

    // Create enhanced card template
    const card = new Card();
    card.setCss(`
      .card {
        font-family: Arial;
        font-size: 20px;
        text-align: center;
        color: black;
        background-color: white;
      }
      .front {
        font-size: 28px;
        font-weight: bold;
        color: #333333;
      }
      .back {
        font-size: 24px;
        color: #0066cc;
      }
      .example {
        font-style: italic;
        color: #009900;
        margin: 10px 0;
      }
      .pronunciation {
        color: #cc6600;
        margin-bottom: 10px;
      }
      .mnemonic {
        font-size: 16px;
        color: #666666;
        margin-top: 15px;
        border-top: 1px solid #cccccc;
        padding-top: 8px;
      }
    `)
      .setTemplates([
        {
          name: 'Card 1',
          qfmt: '<div class="front">{{Front}}</div>',
          afmt: `
            <div class="front">{{Front}}</div>
            <hr>
            <div class="back">{{Back}}</div>
            {{#Example}}
            <div class="example">{{Example}}</div>
            {{/Example}}
            {{#Pronunciation}}
            <div class="pronunciation">🔊 {{Pronunciation}}</div>
            {{/Pronunciation}}
            {{#Mnemonic}}
            <div class="mnemonic">💡 {{Mnemonic}}</div>
            {{/Mnemonic}}
          `,
        },
      ]);

    // Create model with the card template
    const model = new Model(card);
    model
      .setName(deckName)
      .setSticky(true)
      .setFields(fields.map((f, index) => new Field(f.name).setOrd(index)));

    // Create deck
    const deck = new Deck(deckName);

    // Add enhanced cards to deck
    for (const pair of wordPairs) {
      const note = new Note(model);
      const mnemonic = mnemonicsMap.get(pair.front);
      
      // Set field values with additional info if available
      note.setFieldsValue([
        pair.front,  // Hungarian word
        pair.back,   // Russian translation
        mnemonic?.exampleSentence || '',  // Example sentence
        mnemonic?.pronunciation || '',    // Pronunciation
        mnemonic?.mnemonic || ''         // Mnemonic
      ]);
      
      deck.addNote(note);
    }

    // Create package and save to file
    const pkg = new Package(deck);
    
    try {
      // Try the no-argument version first which returns Buffer or other binary data
      const zipData = await pkg.writeToFile();
      
      // Check if we got zip data back instead of having the file written directly
      if (zipData) {
        // Convert the data to Buffer regardless of what type it is
        let buffer: Buffer;
        if (zipData instanceof Buffer) {
          buffer = zipData;
        } else if (typeof zipData === 'string') {
          buffer = Buffer.from(zipData, 'binary');
        } else if (zipData instanceof ArrayBuffer || zipData instanceof Uint8Array) {
          buffer = Buffer.from(zipData);
        } else {
          throw new Error('Unexpected zip data type');
        }
        
        // Write the buffer to file ourselves
        await fs.writeFile(deckFilePath, buffer);
        console.log(`Anki deck created at: ${deckFilePath}`);
      } else {
        // The API might have already written the file
        try {
          // Verify the file exists
          await fs.access(deckFilePath);
          console.log(`Anki deck created and verified at: ${deckFilePath}`);
        } catch (accessError) {
          throw new Error('Failed to verify the Anki deck file was created');
        }
      }
    } catch (writeError) {
      // Fallback to explicitly providing the path
      try {
        await pkg.writeToFile(deckFilePath);
        console.log(`Anki deck created with explicit path at: ${deckFilePath}`);
        
        // Verify the file exists
        await fs.access(deckFilePath);
      } catch (fallbackError) {
        throw new Error(`Failed to create Anki deck file: ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}`);
      }
    }

    return {
      name: deckName,
      words: wordPairs,
      date: new Date().toISOString(),
      userId,
      filePath: deckFilePath
    };
  } catch (error) {
    console.error('Error in createAnkiDeck:', error);
    throw new Error(`Failed to create Anki deck: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Generate learning suggestions based on diary entries
 */
export async function generateLearningSuggestions(entries: ProcessedDiaryEntry[]): Promise<string[]> {
  try {
    const prompt = `
You are a Hungarian language learning assistant.

Based on these diary entries and their corrections, suggest learning strategies.
Focus on common patterns and frequently used words.

Entries:
${entries.map(e => `
Original: ${e.originalText}
Corrected: ${e.correctedText}
`).join('\n')}

Respond with JSON in the following format:
{
  "patterns": ["Common pattern 1", "Common pattern 2", ...],
  "priorityWords": ["Word 1", "Word 2", ...],
  "grammarPoints": ["Grammar point 1", "Grammar point 2", ...],
  "practiceIdeas": ["Practice idea 1", "Practice idea 2", ...]
}

Include at least 3 items in each category.`;

    // Use the new jsonChatCompletion function
    const response = await jsonChatCompletion<LearningSuggestionsResponse>(prompt, 0.7);
    
    // Combine all suggestions into a single array with icons
    return [
      ...response.patterns.map(p => `📊 Pattern: ${p}`),
      ...response.priorityWords.map(w => `📝 Priority Word: ${w}`),
      ...response.grammarPoints.map(g => `📖 Grammar: ${g}`),
      ...response.practiceIdeas.map(i => `🏋️‍♂️ Practice: ${i}`)
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
      console.warn(`File not found or cannot be accessed for cleanup: ${filePath}`);
    }
  } catch (error) {
    // Don't throw errors during cleanup
    console.error(`Failed to clean up Anki deck file: ${filePath}`, error);
  }
} 