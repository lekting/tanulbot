/**
 * OpenAI service configuration and common functionality
 */
import { OpenAI } from 'openai';
import * as fs from 'fs/promises';
import { OPENAI_API_KEY, OPENROUTER_API_KEY } from '../../config';
import { OpenAIVoice, DictationDifficulty } from '../../types';
import { CODE_TO_LANGUAGE, SupportedLanguage, t } from '../i18n';

// Initialize OpenAI client
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
const openrouter = new OpenAI({
  apiKey: OPENROUTER_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1'
});

// Model configurations
export const MODELS = {
  CHAT: 'google/gemini-2.0-flash-001',
  TTS: 'gpt-4o-mini-tts'
} as const;

/**
 * Base function for making chat completions
 * @param prompt - Prompt text
 * @param temperature - Temperature for response generation (0-1)
 * @returns Generated text
 */
export async function chatCompletion(
  prompt: string,
  temperature: number = 0.7
): Promise<string> {
  const completion = await openrouter.chat.completions.create({
    model: MODELS.CHAT,
    messages: [{ role: 'user', content: prompt }],
    temperature
  });

  return completion.choices[0]?.message?.content ?? '';
}

/**
 * Interact with the user in Hungarian, providing gentle corrections if needed
 * @param userText - Input text from user
 * @param language - User's preferred language for explanations
 * @param chatHistory - Previous chat messages
 * @param maxHistoryTokens - Maximum number of tokens to use from history
 * @returns A conversational reply with gentle corrections if needed
 */
export async function correctAndReply(
  userText: string,
  language: SupportedLanguage = 'ru',
  chatHistory: { role: 'user' | 'assistant'; content: string }[] = [],
  maxHistoryTokens: number = 800
): Promise<string> {
  // Create system message focused on natural conversation
  const systemMessage = `
You are a fluent Hungarian speaker chatting with a language learner. Act like a friendly, helpful native speaker, not a teacher.

Style guide:
- Respond primarily in simple Hungarian, making the conversation feel natural
- If the user makes a minor mistake, subtly use the correct form in your response without explicitly pointing it out
- For major mistakes that impact meaning, gently offer a correction in ${CODE_TO_LANGUAGE[language]} in parentheses 
- Include some follow-up questions to keep the conversation flowing
- Occasionally suggest a new word or phrase to expand their vocabulary
- Keep your responses conversational and brief (1-3 sentences in Hungarian)

Remember: you're having a real conversation, not giving a language lesson. Your goal is to help them practice naturally.
`;

  // Create messages array with system message
  const messages = [{ role: 'system', content: systemMessage }];

  // Add recent chat history if available
  if (chatHistory.length > 0) {
    // Limit history based on token count
    let tokenCount = 0;
    const relevantHistory = [];

    // Process messages in reverse order to include most relevant messages
    for (let i = chatHistory.length - 1; i >= 0; i--) {
      const message = chatHistory[i];
      const messageTokens = Math.ceil(message.content.length / 4);

      if (tokenCount + messageTokens <= maxHistoryTokens) {
        relevantHistory.unshift(message); // Add to beginning to maintain order
        tokenCount += messageTokens;
      } else {
        break;
      }
    }

    // Add relevant history to messages
    messages.push(...relevantHistory);
  }

  // Add the current user message
  messages.push({ role: 'user', content: userText });

  // Create completion with conversation context
  try {
    const completion = await openrouter.chat.completions.create({
      model: MODELS.CHAT,
      messages: messages as any,
      temperature: 0.7 // Higher temperature for more natural responses
    });

    return completion.choices[0]?.message?.content ?? '';
  } catch (error) {
    console.error('Error in conversation API call:', error);

    // Provide fallback response if API call fails
    return t('practice.fallback', language);
  }
}

/**
 * Interact with the user in Hungarian and extract corrected words as JSON
 * @param userText - Input text from user
 * @param language - User's preferred language for explanations
 * @param chatHistory - Previous chat messages
 * @param maxHistoryTokens - Maximum number of tokens to use from history
 * @returns A JSON object with conversational reply and extracted word pairs
 */
export async function correctAndReplyWithWords(
  userText: string,
  language: SupportedLanguage = 'ru',
  chatHistory: { role: 'user' | 'assistant'; content: string }[] = [],
  maxHistoryTokens: number = 800
): Promise<{ text: string; words: { front: string; back: string }[] }> {
  // Create system message focused on natural conversation and word extraction
  const systemMessage = `
You are a fluent Hungarian speaker chatting with a language learner. Act like a friendly, helpful native speaker, not a teacher.

Style guide:
- Respond primarily in simple Hungarian, making the conversation feel natural
- If the user makes a minor mistake, subtly use the correct form in your response without explicitly pointing it out
- For major mistakes that impact meaning, gently offer a correction in ${CODE_TO_LANGUAGE[language]} in parentheses 
- Include some follow-up questions to keep the conversation flowing
- Occasionally suggest a new word or phrase to expand their vocabulary
- Keep your responses conversational and brief (1-3 sentences in Hungarian)

IMPORTANT: Your response MUST be in JSON format with two fields:
1. "text" - Your conversational reply that will be sent to the user
2. "words" - An array of objects with "front" (Hungarian word) and "back" (${CODE_TO_LANGUAGE[language]} translation) for any words that:
   - Were corrected or taught in this conversation
   - Are important for the user to remember
   - Maximum 3-5 words per conversation

Remember: your goal is to have a natural conversation while helping them build vocabulary.
`;

  // Create messages array with system message
  const messages = [{ role: 'system', content: systemMessage }];

  // Add recent chat history if available
  if (chatHistory.length > 0) {
    // Limit history based on token count
    let tokenCount = 0;
    const relevantHistory = [];

    // Process messages in reverse order to include most relevant messages
    for (let i = chatHistory.length - 1; i >= 0; i--) {
      const message = chatHistory[i];
      const messageTokens = Math.ceil(message.content.length / 4);

      if (tokenCount + messageTokens <= maxHistoryTokens) {
        relevantHistory.unshift(message); // Add to beginning to maintain order
        tokenCount += messageTokens;
      } else {
        break;
      }
    }

    // Add relevant history to messages
    messages.push(...relevantHistory);
  }

  // Add the current user message
  messages.push({ role: 'user', content: userText });

  // Create completion with conversation context
  try {
    const completion = await openrouter.chat.completions.create({
      model: MODELS.CHAT,
      messages: messages as any,
      temperature: 0.7, // Higher temperature for more natural responses
      response_format: { type: 'json_object' }
    });

    const content = completion.choices[0]?.message?.content ?? '{}';

    try {
      const response = JSON.parse(extractJsonContent(content)) as {
        text: string;
        words: { front: string; back: string }[];
      };

      // Ensure the response has the expected structure
      return {
        text: response.text || '',
        words: Array.isArray(response.words) ? response.words : []
      };
    } catch (error) {
      console.error('Failed to parse JSON response:', error);
      return {
        text: content,
        words: []
      };
    }
  } catch (error) {
    console.error('Error in conversation API call:', error);

    // Provide fallback response if API call fails
    const fallbackText = t('practice.fallback', language);

    return {
      text: fallbackText,
      words: []
    };
  }
}

/**
 * Synthesizes speech using OpenAI TTS
 * @param text - Text to convert to speech
 * @param filePath - Output file path
 * @param voice - Voice to use for synthesis
 */
export async function synthesizeSpeech(
  text: string,
  filePath: string,
  voice: OpenAIVoice = 'nova'
): Promise<void> {
  const response = await openai.audio.speech.create({
    model: MODELS.TTS,
    input: text,
    voice
  });

  const buffer = Buffer.from(await response.arrayBuffer());
  await fs.writeFile(filePath, buffer);
}

/**
 * Processes text to extract Hungarian-Russian word pairs
 * @param fullText - Text to process
 * @returns Array of word pairs
 */
export async function extractWordPairs(
  fullText: string
): Promise<{ front: string; back: string }[]> {
  const prompt = `
You are a bilingual assistant fluent in Hungarian and Russian.
Extract unique Hungarian words and their Russian translations.
Format: "Hungarian word - Russian translation" per line.
FIRST WORD IS HUNGARIAN, SECOND IS RUSSIAN.
Focus on everyday useful words. If words have errors, fix them.
Dont extract only letters or abbreviations.
EXTRACT ALL POSSIBLE PAIRS.
Text:
"""
${fullText}
"""`;
  const response = await chatCompletion(prompt, 0.3);
  const uniquePairs = new Map<string, { front: string; back: string }>();

  response
    .split('\n')
    .map((line: string) => {
      const [front, back] = line.split('-').map((s: string) => s.trim());
      return front && back ? { front, back } : null;
    })
    .filter((pair): pair is { front: string; back: string } => pair !== null)
    .forEach((pair) => {
      const key = `${pair.front.toLowerCase()}-${pair.back.toLowerCase()}`;
      if (!uniquePairs.has(key)) {
        uniquePairs.set(key, pair);
      }
    });

  const result = Array.from(uniquePairs.values());
  return result;
}

/**
 * Generates Hungarian phrases for dictation
 * @param difficulty - Difficulty level
 * @param count - Number of phrases to generate
 * @param wordsOnly - Whether to generate single words instead of phrases
 * @returns Array of Hungarian phrases or words
 */
export async function generateHungarianPhrases(
  difficulty: DictationDifficulty,
  count: number,
  wordsOnly: boolean = false
): Promise<string[]> {
  const difficultyDescriptions = {
    easy: 'simple greetings, basic phrases of 1-3 words, numbers, days of the week',
    medium:
      'everyday phrases of 3-5 words, simple questions, action descriptions',
    hard: 'complex sentences of 5-8 words, using different tenses, complex grammatical constructions'
  };

  const wordDifficultyDescriptions = {
    easy: 'most basic Hungarian words (numbers, colors, days of the week, greetings)',
    medium:
      'everyday words of medium difficulty (food, transportation, work, leisure)',
    hard: 'complex words (abstract concepts, professional terms, rarely used words)'
  };

  const description = wordsOnly
    ? wordDifficultyDescriptions
    : difficultyDescriptions;
  const contentType = wordsOnly ? 'words' : 'phrases';

  const prompt = `
Generate ${count} unique Hungarian ${contentType} for language learning.
Difficulty level: ${difficulty} (${description[difficulty]})

Requirements:
${
  wordsOnly
    ? `
- Each item should be a single Hungarian word
- Include common, practical words
- Match the difficulty level
- No phrases or sentences, only individual words
- No translations, only Hungarian text
- Each word on a new line
`
    : `
- Each phrase should be grammatically correct
- Include common, practical expressions
- Match the difficulty level
- For easy level: 1-3 words
- For medium level: 3-5 words
- For hard level: 5-8 words
- Include variety of topics (greetings, questions, statements)
- No translations, only Hungarian text
- Each phrase on a new line
`
}

${contentType.charAt(0).toUpperCase() + contentType.slice(1)}:`;

  const response = await chatCompletion(prompt, 0.7);

  return response
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .slice(0, count);
}

/**
 * Generates a Hungarian story for dictation
 * @param difficulty - Difficulty level
 * @returns Array of story sentences
 */
export async function generateHungarianStory(
  difficulty: DictationDifficulty
): Promise<string[]> {
  const difficultyDescriptions = {
    easy: 'simple story with 3-4 short sentences, basic grammar, present tense',
    medium:
      'story with 4-5 medium-length sentences, simple past tense, simple dialogues',
    hard: 'story with 5-6 complex sentences, mixed tenses, complex grammatical structures'
  };

  const prompt = `
Generate a short Hungarian story for language learning.
Difficulty level: ${difficulty} (${difficultyDescriptions[difficulty]})

Requirements:
- Story should be coherent and engaging
- Each sentence on a new line
- Match the difficulty level:
  * Easy: 3-4 short sentences, basic grammar, present tense
  * Medium: 4-5 medium sentences, past tense, simple dialogues
  * Hard: 5-6 complex sentences, mixed tenses, complex grammar
- Use common vocabulary
- Include some dialogue if appropriate
- No translations, only Hungarian text

Story:`;

  const response = await chatCompletion(prompt, 0.7);

  return response
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

/**
 * Base function for making chat completions with JSON response format
 * @param prompt - Prompt text
 * @param temperature - Temperature for response generation (0-1)
 * @returns Generated text in JSON format
 */
export async function jsonChatCompletion<T = any>(
  prompt: string,
  temperature: number = 0.7
): Promise<T> {
  const completion = await openrouter.chat.completions.create({
    model: MODELS.CHAT,
    messages: [{ role: 'user', content: prompt }],
    temperature,
    response_format: { type: 'json_object' }
  });

  const content = completion.choices[0]?.message?.content || '{}';

  try {
    return JSON.parse(extractJsonContent(content)) as T;
  } catch (error) {
    console.error('Failed to parse JSON response:', error);
    throw new Error('Invalid JSON response from API');
  }
}

export const extractJsonContent = (text: string) => {
  if (!text) {
    return '';
  }

  const regex = /```json\s*([\s\S]*?)\s*```/;
  const match = text.match(regex);

  if (match && match[1]) {
    return match[1].trim();
  }

  return text;
};
