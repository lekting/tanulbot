/**
 * Dictation service
 */
import path from 'path';
import {
  MAX_DICTATION_PHRASES,
  TMP_DIR,
  AUDIO_PATH,
  getUserAudioDir,
  ensureUserDir
} from '../config';
import {
  WordPair,
  DictationDifficulty,
  DictationFormat,
  DictationState
} from '../types';
import { synthesizeSpeech, generatePhrases, generateStory } from './openai';
import { prepareForAudio, prepareTextForAudio } from '../utils/text';
import { SupportedLearningLanguage } from '../services/i18n';
import { store } from '../store';

/**
 * Generates dictation phrases with audio based on difficulty
 * @param difficulty - Difficulty level for phrases
 * @param userId - Telegram user ID
 * @param format - Dictation format (words, phrases, stories)
 * @returns Array of phrases with audio paths
 */
export async function generateDictationPhrasesByDifficulty(
  difficulty: DictationDifficulty,
  userId: number,
  format: DictationFormat = 'phrases'
): Promise<{ text: string; audioPath: string }[]> {
  // Ensure user audio directory exists
  const userAudioDir = await ensureUserDir(userId, 'audio');
  // Get user's learning language
  const learningLanguage = store.getUserLearningLanguage(userId);

  let generatedPhrases: string[] = [];

  // Generate content based on the selected format
  if (format === 'words') {
    // For words format, generate individual words
    generatedPhrases = await generatePhrases(
      learningLanguage,
      difficulty,
      MAX_DICTATION_PHRASES,
      true // Single words mode
    );
  } else if (format === 'stories') {
    // For stories format, generate a short story
    generatedPhrases = await generateStory(learningLanguage, difficulty);
  } else {
    // Default to phrases
    generatedPhrases = await generatePhrases(
      learningLanguage,
      difficulty,
      MAX_DICTATION_PHRASES
    );
  }

  // Create phrases with audio paths
  const phrases = generatedPhrases.map((text: string, index: number) => {
    // Add numbering to display text
    const displayText = `${index + 1}. ${text}`;
    // Prepare audio text with number in the learning language
    const audioText = prepareForAudio(text, index, learningLanguage);

    return {
      text: displayText,
      audioPath: path.join(
        userAudioDir,
        `audio_${Date.now()}_${Math.random().toString(36).substring(7)}.mp3`
      )
    };
  });

  // Generate audio for each phrase
  for (let i = 0; i < phrases.length; i++) {
    const phrase = phrases[i];
    const audioText = prepareForAudio(phrase.text, i, learningLanguage);
    await synthesizeSpeech(audioText, phrase.audioPath);
  }

  return phrases;
}

/**
 * Generates dictation phrases with audio from word pairs
 * @param wordPairs - Array of word pairs to use
 * @param userId - Telegram user ID
 * @returns Array of phrases with audio paths
 */
export async function generateDictationPhrases(
  wordPairs: WordPair[],
  userId: number
): Promise<{ text: string; audioPath: string }[]> {
  // Ensure user audio directory exists
  const userAudioDir = await ensureUserDir(userId, 'audio');
  // Get user's learning language
  const learningLanguage = store.getUserLearningLanguage(userId);

  // Select a subset of pairs for dictation
  const selectedPairs = wordPairs.slice(0, MAX_DICTATION_PHRASES);

  // Create phrases with audio paths
  const phrases = selectedPairs.map((pair, index) => {
    // Add numbering to display text
    const displayText = `${index + 1}. ${pair.front}`;

    return {
      text: displayText,
      audioPath: path.join(
        userAudioDir,
        `audio_${Date.now()}_${Math.random().toString(36).substring(7)}.mp3`
      )
    };
  });

  // Generate audio for each phrase
  for (let i = 0; i < phrases.length; i++) {
    const phrase = phrases[i];
    const audioText = prepareForAudio(phrase.text, i, learningLanguage);
    await synthesizeSpeech(audioText, phrase.audioPath);
  }

  return phrases;
}

/**
 * Generates dictation content based on format and difficulty
 */
export async function generateDictationContent(
  format: DictationFormat,
  difficulty: DictationDifficulty,
  userId: number
): Promise<string[]> {
  // Get user's learning language
  const learningLanguage = store.getUserLearningLanguage(userId);

  if (format === 'words') {
    return generatePhrases(learningLanguage, difficulty, 5, true);
  } else if (format === 'phrases') {
    return generatePhrases(learningLanguage, difficulty, 5, false);
  } else {
    return generateStory(learningLanguage, difficulty);
  }
}

/**
 * Prepares audio files for dictation
 */
export async function prepareDictationAudio(
  phrases: string[],
  userId: number
): Promise<void> {
  // Ensure user audio directory exists
  const userAudioDir = await ensureUserDir(userId, 'audio');
  // Get user's learning language
  const learningLanguage = store.getUserLearningLanguage(userId);

  for (let i = 0; i < phrases.length; i++) {
    const audioText = prepareForAudio(phrases[i], i, learningLanguage);
    const audioFile = path.join(
      userAudioDir,
      `dictation_${userId}_${i + 1}.mp3`
    );
    await synthesizeSpeech(audioText, audioFile);
  }
}

/**
 * Creates initial dictation state
 */
export function createDictationState(
  format: DictationFormat,
  difficulty: DictationDifficulty,
  phrases: string[],
  userId: number
): DictationState {
  const userAudioDir = getUserAudioDir(userId);

  const formattedPhrases = phrases.map((text, index) => ({
    text,
    audioPath: path.join(
      userAudioDir,
      `dictation_${userId}_${Date.now()}_${index + 1}.mp3`
    )
  }));

  return {
    format,
    difficulty,
    phrases: formattedPhrases,
    currentIndex: 0,
    points: 0
  };
}
