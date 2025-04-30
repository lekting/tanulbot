/**
 * Dictation service
 */
import path from 'path';
import { MAX_DICTATION_PHRASES, TMP_DIR, AUDIO_PATH } from '../config';
import { WordPair, DictationDifficulty, DictationFormat, DictationState } from '../types';
import { synthesizeSpeech, generateHungarianPhrases, generateHungarianStory } from './openai';
import { prepareForAudio, prepareTextForAudio } from '../utils/text';

/**
 * Generates dictation phrases with audio based on difficulty
 * @param difficulty - Difficulty level for phrases
 * @returns Array of phrases with audio paths
 */
export async function generateDictationPhrasesByDifficulty(
  difficulty: DictationDifficulty
): Promise<{ text: string; audioPath: string }[]> {
  // Generate phrases using OpenAI
  const generatedPhrases = await generateHungarianPhrases(difficulty, MAX_DICTATION_PHRASES);
  
  // Create phrases with audio paths
  const phrases = generatedPhrases.map((text: string, index: number) => {
    // Add numbering to display text
    const displayText = `${index + 1}. ${text}`;
    // Prepare audio text with Hungarian number
    const audioText = prepareForAudio(text, index);
    
    return {
      text: displayText,
      audioPath: path.join(TMP_DIR, `audio_${Date.now()}_${Math.random().toString(36).substring(7)}.mp3`)
    };
  });

  // Generate audio for each phrase
  for (let i = 0; i < phrases.length; i++) {
    const phrase = phrases[i];
    const audioText = prepareForAudio(phrase.text, i);
    await synthesizeSpeech(audioText, phrase.audioPath);
  }

  return phrases;
}

/**
 * Generates dictation phrases with audio from word pairs
 * @param wordPairs - Array of word pairs to use
 * @returns Array of phrases with audio paths
 */
export async function generateDictationPhrases(
  wordPairs: WordPair[]
): Promise<{ text: string; audioPath: string }[]> {
  // Select a subset of pairs for dictation
  const selectedPairs = wordPairs.slice(0, MAX_DICTATION_PHRASES);
  
  // Create phrases with audio paths
  const phrases = selectedPairs.map((pair, index) => {
    // Add numbering to display text
    const displayText = `${index + 1}. ${pair.front}`;
    
    return {
      text: displayText,
      audioPath: path.join(TMP_DIR, `audio_${Date.now()}_${Math.random().toString(36).substring(7)}.mp3`)
    };
  });

  // Generate audio for each phrase
  for (let i = 0; i < phrases.length; i++) {
    const phrase = phrases[i];
    const audioText = prepareForAudio(phrase.text, i);
    await synthesizeSpeech(audioText, phrase.audioPath);
  }

  return phrases;
}

/**
 * Generates dictation content based on format and difficulty
 */
export async function generateDictationContent(
  format: DictationFormat,
  difficulty: DictationDifficulty
): Promise<string[]> {
  if (format === 'words') {
    return generateHungarianPhrases(difficulty, 5);
  } else {
    return generateHungarianStory(difficulty);
  }
}

/**
 * Prepares audio files for dictation
 */
export async function prepareDictationAudio(
  phrases: string[],
  chatId: number
): Promise<void> {
  for (let i = 0; i < phrases.length; i++) {
    const audioText = prepareForAudio(phrases[i], i);
    const audioFile = path.join(AUDIO_PATH, `dictation_${chatId}_${i + 1}.mp3`);
    await synthesizeSpeech(audioText, audioFile);
  }
}

/**
 * Creates initial dictation state
 */
export function createDictationState(
  format: DictationFormat,
  difficulty: DictationDifficulty,
  phrases: string[]
): DictationState {
  const formattedPhrases = phrases.map((text, index) => ({
    text,
    audioPath: path.join(AUDIO_PATH, `dictation_${Date.now()}_${index + 1}.mp3`)
  }));

  return {
    format,
    difficulty,
    phrases: formattedPhrases,
    currentIndex: 0,
    points: 0
  };
} 