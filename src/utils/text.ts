import {
  LANGUAGE_SPECIFIC_CHARS,
  SupportedLearningLanguage
} from '../services/i18n';

/**
 * Checks if text appears to be in the specified language
 * @param text - The text to analyze
 * @param language - The learning language to check for
 * @returns Boolean indicating if text appears to be in the specified language
 */
export function looksLikeLearningLanguage(
  text: string,
  language: SupportedLearningLanguage
): boolean {
  const languageRegex = LANGUAGE_SPECIFIC_CHARS[language];
  return languageRegex.test(text);
}

/**
 * Removes numbering prefix from text (e.g., "1. Text" -> "Text")
 * @param text - Text to clean
 * @returns Text without numbering
 */
export function removeNumbering(text: string): string {
  return text.replace(/^\d+\.\s*/, '');
}

/**
 * Gets number word for a given number in the specified language
 * @param num - Number to convert
 * @param language - The learning language
 * @returns Number word in the specified language
 */
export function getNumberInLanguage(
  num: number,
  language: SupportedLearningLanguage
): string {
  const numbers: Record<SupportedLearningLanguage, string[]> = {
    hungarian: [
      'nulla',
      'egy',
      'kettő',
      'három',
      'négy',
      'öt',
      'hat',
      'hét',
      'nyolc',
      'kilenc',
      'tíz'
    ],
    spanish: [
      'cero',
      'uno',
      'dos',
      'tres',
      'cuatro',
      'cinco',
      'seis',
      'siete',
      'ocho',
      'nueve',
      'diez'
    ],
    french: [
      'zéro',
      'un',
      'deux',
      'trois',
      'quatre',
      'cinq',
      'six',
      'sept',
      'huit',
      'neuf',
      'dix'
    ],
    german: [
      'null',
      'eins',
      'zwei',
      'drei',
      'vier',
      'fünf',
      'sechs',
      'sieben',
      'acht',
      'neun',
      'zehn'
    ],
    italian: [
      'zero',
      'uno',
      'due',
      'tre',
      'quattro',
      'cinque',
      'sei',
      'sette',
      'otto',
      'nove',
      'dieci'
    ]
  };

  return numbers[language][num] || num.toString();
}

/**
 * Prepares text for audio synthesis by adding number word if needed
 * @param text - Original text
 * @param index - Current index (0-based)
 * @param language - The learning language
 * @returns Text prepared for audio
 */
export function prepareForAudio(
  text: string,
  index: number,
  language: SupportedLearningLanguage = 'hungarian'
): string {
  const match = text.match(/^(\d+)\.\s*(.+)$/);
  if (match) {
    // If text has numbering, use that number
    const num = parseInt(match[1], 10);
    const actualText = match[2];
    return `${getNumberInLanguage(num, language)}, ${actualText}`;
  } else if (index >= 0) {
    // If no numbering but index provided, use index+1
    return `${getNumberInLanguage(index + 1, language)}, ${text}`;
  }
  return text;
}

/**
 * Normalizes text for comparison
 * Removes punctuation, extra spaces, and converts to lowercase
 * @param text - Text to normalize
 * @returns Normalized text
 */
export function normalizeText(text: string): string {
  return removeNumbering(text)
    .toLowerCase() // Convert to lowercase
    .replace(/[.,!?;:"""''„«»\(\)\/\[\]{}]/g, '') // Remove punctuation
    .replace(/[^\p{L}\p{N}\s]/gu, '') // Remove emojis and special characters, keep letters and numbers
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .trim(); // Remove leading/trailing spaces
}

/**
 * Compares two texts for equality
 * Uses fuzzy matching to allow for minor differences
 * @param input - User input text
 * @param expected - Expected correct text
 * @returns Boolean indicating if texts match
 */
export function compareTexts(input: string, expected: string): boolean {
  // Remove numbering and normalize both texts
  const normalizedInput = normalizeText(input);
  const normalizedExpected = normalizeText(expected);

  // Direct match
  if (normalizedInput === normalizedExpected) {
    return true;
  }

  // Get words from both texts
  const inputWords = normalizedInput.split(' ');
  const expectedWords = normalizedExpected.split(' ');

  // If number of words is different, texts don't match
  if (inputWords.length !== expectedWords.length) {
    return false;
  }

  // Compare each word
  for (let i = 0; i < inputWords.length; i++) {
    const inputWord = inputWords[i];
    const expectedWord = expectedWords[i];

    // Words must match exactly after normalization
    if (inputWord !== expectedWord) {
      return false;
    }
  }

  return true;
}

/**
 * Determines user level based on points
 * @param points - User's point score
 * @param language - The learning language
 * @returns User level label
 */
export function getUserLevel(
  points: number,
  language: SupportedLearningLanguage = 'hungarian'
): string {
  const levels: Record<SupportedLearningLanguage, string[]> = {
    hungarian: [
      '🌱 Újónc (Beginner)',
      '🎯 Tanuló (Student)',
      '🚀 Haladó (Advanced)',
      '🏆 Mester (Master)'
    ],
    spanish: [
      '🌱 Principiante (Beginner)',
      '🎯 Estudiante (Student)',
      '🚀 Avanzado (Advanced)',
      '🏆 Maestro (Master)'
    ],
    french: [
      '🌱 Débutant (Beginner)',
      '🎯 Étudiant (Student)',
      '🚀 Avancé (Advanced)',
      '🏆 Maître (Master)'
    ],
    german: [
      '🌱 Anfänger (Beginner)',
      '🎯 Student (Student)',
      '🚀 Fortgeschritten (Advanced)',
      '🏆 Meister (Master)'
    ],
    italian: [
      '🌱 Principiante (Beginner)',
      '🎯 Studente (Student)',
      '🚀 Avanzato (Advanced)',
      '🏆 Maestro (Master)'
    ]
  };

  if (points < 100) return levels[language][0];
  if (points < 300) return levels[language][1];
  if (points < 600) return levels[language][2];
  return levels[language][3];
}

export function prepareTextForAudio(text: string): string {
  // Remove special characters and normalize whitespace
  return text
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// For backward compatibility
export const looksHungarian = (text: string) =>
  looksLikeLearningLanguage(text, 'hungarian');
export const getHungarianNumber = (num: number) =>
  getNumberInLanguage(num, 'hungarian');
export const normalizeHungarianText = normalizeText;
export const compareHungarianTexts = compareTexts;
