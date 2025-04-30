/**
 * Text processing utilities
 */
import { CHARS_PER_TOKEN, TOKEN_COST } from '../config';

/**
 * Estimates the number of tokens in a text
 * @param text - The text to analyze
 * @returns Estimated token count
 */
export function countTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

/**
 * Estimates the cost of processing a text
 * @param tokens - Number of tokens
 * @returns Estimated cost in USD
 */
export function estimateCost(tokens: number): number {
  return tokens * TOKEN_COST;
}

/**
 * Checks if text appears to be Hungarian
 * @param text - The text to analyze
 * @returns Boolean indicating if text appears to be Hungarian
 */
export function looksHungarian(text: string): boolean {
  const hungarianChars = /[áéíóöőúüű]/i;
  return hungarianChars.test(text);
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
 * Gets Hungarian number word for a given number
 * @param num - Number to convert
 * @returns Hungarian number word
 */
export function getHungarianNumber(num: number): string {
  const numbers = [
    'nulla', 'egy', 'kettő', 'három', 'négy', 
    'öt', 'hat', 'hét', 'nyolc', 'kilenc', 'tíz'
  ];
  return numbers[num] || num.toString();
}

/**
 * Prepares text for audio synthesis by adding number word if needed
 * @param text - Original text
 * @param index - Current index (0-based)
 * @returns Text prepared for audio
 */
export function prepareForAudio(text: string, index: number): string {
  const match = text.match(/^(\d+)\.\s*(.+)$/);
  if (match) {
    // If text has numbering, use that number
    const num = parseInt(match[1], 10);
    const actualText = match[2];
    return `${getHungarianNumber(num)}, ${actualText}`;
  } else if (index >= 0) {
    // If no numbering but index provided, use index+1
    return `${getHungarianNumber(index + 1)}, ${text}`;
  }
  return text;
}

/**
 * Normalizes Hungarian text for comparison
 * Removes punctuation, extra spaces, and converts to lowercase
 * @param text - Text to normalize
 * @returns Normalized text
 */
export function normalizeHungarianText(text: string): string {
  return removeNumbering(text)
    .toLowerCase() // Convert to lowercase
    .replace(/[.,!?;:"""''„«»\(\)\/\[\]{}]/g, '') // Remove punctuation
    .replace(/[^\p{L}\p{N}\s]/gu, '') // Remove emojis and special characters, keep letters and numbers
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .trim(); // Remove leading/trailing spaces
}

/**
 * Compares two Hungarian texts for equality
 * Uses fuzzy matching to allow for minor differences
 * @param input - User input text
 * @param expected - Expected correct text
 * @returns Boolean indicating if texts match
 */
export function compareHungarianTexts(input: string, expected: string): boolean {
  // Remove numbering and normalize both texts
  const normalizedInput = normalizeHungarianText(input);
  const normalizedExpected = normalizeHungarianText(expected);

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
 * @returns User level label
 */
export function getUserLevel(points: number): string {
  if (points < 100) return "🌱 Újónc (Beginner)";
  if (points < 300) return "🎯 Tanuló (Student)";
  if (points < 600) return "🚀 Haladó (Advanced)";
  return "🏆 Mester (Master)";
}

export function prepareTextForAudio(text: string): string {
  // Remove special characters and normalize whitespace
  return text
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
} 