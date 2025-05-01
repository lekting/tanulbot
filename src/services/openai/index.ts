/**
 * OpenAI service configuration and common functionality
 */
import OpenAI from 'openai';
import { promises as fs } from 'fs';

// Import DatabaseService
import { DatabaseService } from '../DatabaseService';
// Import token calculator
import { tokenizeAndEstimateCost } from '../token-calculator';

import {
  OPENAI_API_KEY,
  MAX_CHUNK_TOKENS,
  OPENROUTER_API_KEY
} from '../../config';
import { OpenAIVoice, DictationDifficulty } from '../../types';
import {
  CODE_TO_LANGUAGE,
  SupportedLanguage,
  SupportedLearningLanguage,
  LEARNING_LANGUAGE_TO_NAME,
  t
} from '../i18n';

// Helper function to truncate text based on token count (simple estimate)
function truncateText(text: string, maxTokens: number): string {
  // Simple token estimation (4 chars ≈ 1 token)
  const tokenEstimate = Math.ceil(text.length / 4);
  if (tokenEstimate <= maxTokens) return text;

  // If text is too long, truncate it
  const charsToKeep = maxTokens * 4;
  return text.slice(0, charsToKeep);
}

// OpenAI client setup
const openai = new OpenAI({
  apiKey: OPENAI_API_KEY
});

const openrouter = new OpenAI({
  apiKey: OPENROUTER_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1'
});

// OpenAI model configuration
export const MODELS = {
  CHAT: 'google/gemini-2.0-flash-001',
  TTS: 'gpt-4o-mini-tts',
  WHISPER: 'whisper-1'
};

/**
 * Base function for making chat completions
 * @param prompt - Prompt text
 * @param temperature - Temperature for response generation (0-1)
 * @param telegramId - Telegram user ID for logging (optional)
 * @param databaseService - Database service for logging (optional)
 * @returns Generated text
 */
export async function chatCompletion(
  prompt: string,
  temperature: number = 0.7,
  telegramId?: number,
  databaseService?: DatabaseService
): Promise<string> {
  const completion = await openrouter.chat.completions.create({
    model: MODELS.CHAT,
    messages: [{ role: 'user', content: prompt }],
    temperature
  });

  // Log LLM request if telegramId and databaseService are provided
  if (telegramId && databaseService) {
    const inputTokens = completion.usage?.prompt_tokens || 0;
    const outputTokens = completion.usage?.completion_tokens || 0;
    const response = completion.choices[0]?.message?.content || '';

    // Calculate cost using token calculator
    const tokenResult = await tokenizeAndEstimateCost({
      model: MODELS.CHAT,
      input: prompt,
      output: response
    });

    // Use the more accurate token count from the API if available
    const finalInputTokens = inputTokens || tokenResult.inputTokens;
    const finalOutputTokens = outputTokens || tokenResult.outputTokens;

    // Use the calculated cost or fallback
    const cost =
      tokenResult.cost || (finalInputTokens + finalOutputTokens) * 0.00001;

    await databaseService.logLlmRequest(
      telegramId,
      'chat',
      MODELS.CHAT,
      cost,
      finalInputTokens,
      finalOutputTokens
    );
  }

  return completion.choices[0]?.message?.content ?? '';
}

/**
 * Interacts with the user in the learning language providing corrections
 */
export async function correctAndReply(
  userText: string,
  language: SupportedLanguage = 'ru',
  chatHistory: { role: 'user' | 'assistant'; content: string }[] = [],
  maxHistoryTokens: number = 800,
  learningLanguage: SupportedLearningLanguage = 'hungarian',
  telegramId?: number,
  databaseService?: DatabaseService
): Promise<string> {
  const languageName = LEARNING_LANGUAGE_TO_NAME[learningLanguage];

  try {
    // Prepare system message with instructions
    const systemMessage = `
You are a fluent ${languageName} speaker chatting with a language learner. Act like a friendly, helpful native speaker, not a teacher.

Guidelines:
- Respond primarily in simple ${languageName}, making the conversation feel natural
- If the user makes grammar or vocabulary mistakes, correct them subtly in your response
- For major errors, you can provide a brief explanation in ${CODE_TO_LANGUAGE[language]}
- Keep your responses conversational and brief (1-3 sentences in ${languageName})
- Adapt to the user's language level - use simple constructions if they're a beginner
- Respond to the content of the user's message
- Never refuse to respond in ${languageName} - the user needs practice
`;

    // Prepare messages for the API call
    const historyMessages = chatHistory.map((msg) => ({
      role: msg.role,
      content: msg.content
    }));

    // Add the current user message
    const messages = [
      { role: 'system', content: systemMessage },
      ...historyMessages,
      { role: 'user', content: userText }
    ] as { role: 'system' | 'user' | 'assistant'; content: string }[];

    // Serialize the entire prompt for token counting
    const fullPrompt = JSON.stringify(messages);

    // Call the OpenAI API
    const response = await openrouter.chat.completions.create({
      model: MODELS.CHAT,
      messages,
      temperature: 0.7,
      max_tokens: MAX_CHUNK_TOKENS,
      presence_penalty: 0.6
    });

    const responseText = response.choices[0].message.content || '';

    // Log LLM request if telegramId and databaseService are provided
    if (telegramId && databaseService) {
      const inputTokens = response.usage?.prompt_tokens || 0;
      const outputTokens = response.usage?.completion_tokens || 0;

      // Calculate cost using token calculator
      const tokenResult = await tokenizeAndEstimateCost({
        model: MODELS.CHAT,
        input: fullPrompt,
        output: responseText
      });

      // Use the more accurate token count from the API if available
      const finalInputTokens = inputTokens || tokenResult.inputTokens;
      const finalOutputTokens = outputTokens || tokenResult.outputTokens;

      // Use the calculated cost or fallback
      const cost =
        tokenResult.cost || (finalInputTokens + finalOutputTokens) * 0.00001;

      await databaseService.logLlmRequest(
        telegramId,
        'chat',
        MODELS.CHAT,
        cost,
        finalInputTokens,
        finalOutputTokens
      );
    }

    return responseText;
  } catch (error) {
    console.error('Error in conversation API call:', error);
    // Provide fallback response if API call fails
    return t('practice.fallback', language);
  }
}

/**
 * Interacts with the user in the learning language and extracts corrected words as JSON
 */
export async function correctAndReplyWithWords(
  userText: string,
  language: SupportedLanguage = 'ru',
  chatHistory: { role: 'user' | 'assistant'; content: string }[] = [],
  maxHistoryTokens: number = 800,
  learningLanguage: SupportedLearningLanguage = 'hungarian',
  telegramId?: number,
  databaseService?: DatabaseService
): Promise<{ text: string; words: { front: string; back: string }[] }> {
  const languageName = LEARNING_LANGUAGE_TO_NAME[learningLanguage];

  try {
    // Prepare system message with instructions
    const systemMessage = `
You are a fluent ${languageName} speaker chatting with a language learner. Act like a friendly, helpful native speaker, not a teacher.

Guidelines:
- Respond primarily in simple ${languageName}, making the conversation feel natural
- If the user makes grammar or vocabulary mistakes, correct them subtly in your response
- For major errors, you can provide a brief explanation in ${CODE_TO_LANGUAGE[language]}
- Keep your responses conversational and brief (1-3 sentences in ${languageName})
- Adapt to the user's language level - use simple constructions if they're a beginner

IMPORTANT: Your response must be valid JSON with these keys:
1. "text" - Your conversational response in ${languageName}
2. "words" - An array of objects with "front" (${languageName} word) and "back" (${CODE_TO_LANGUAGE[language]} translation) for any words that:
   - The user might not know
   - Are important for understanding your response
   - Were used incorrectly by the user (in this case include the correct version)

Example response format:
{
  "text": "Your conversational response here",
  "words": [
    {"front": "${languageName} word", "back": "${CODE_TO_LANGUAGE[language]} translation"},
    {"front": "another word", "back": "translation"}
  ]
}
`;

    // Prepare messages for the API call
    const historyMessages = chatHistory.map((msg) => ({
      role: msg.role,
      content: msg.content
    }));

    // Truncate history to avoid token limit
    const truncatedHistory = truncateText(
      JSON.stringify(historyMessages),
      maxHistoryTokens
    );
    const parsedHistory = JSON.parse(truncatedHistory);

    // Add the current user message
    const messages = [
      { role: 'system', content: systemMessage },
      ...parsedHistory,
      { role: 'user', content: userText }
    ] as { role: 'system' | 'user' | 'assistant'; content: string }[];

    // Serialize the entire prompt for token counting
    const fullPrompt = JSON.stringify(messages);

    // Call the OpenAI API
    const response = await openrouter.chat.completions.create({
      model: MODELS.CHAT,
      messages,
      temperature: 0.7,
      max_tokens: MAX_CHUNK_TOKENS,
      response_format: { type: 'json_object' }
    });

    const content = response.choices[0].message.content || '';

    // Log LLM request if telegramId and databaseService are provided
    if (telegramId && databaseService) {
      const inputTokens = response.usage?.prompt_tokens || 0;
      const outputTokens = response.usage?.completion_tokens || 0;

      // Calculate cost using token calculator
      const tokenResult = await tokenizeAndEstimateCost({
        model: MODELS.CHAT,
        input: fullPrompt,
        output: content
      });

      // Use the more accurate token count from the API if available
      const finalInputTokens = inputTokens || tokenResult.inputTokens;
      const finalOutputTokens = outputTokens || tokenResult.outputTokens;

      // Use the calculated cost or fallback
      const cost =
        tokenResult.cost || (finalInputTokens + finalOutputTokens) * 0.00001;

      await databaseService.logLlmRequest(
        telegramId,
        'chat',
        MODELS.CHAT,
        cost,
        finalInputTokens,
        finalOutputTokens
      );
    }

    try {
      const parsedResponse = JSON.parse(extractJsonContent(content));
      return {
        text: parsedResponse.text || '',
        words: Array.isArray(parsedResponse.words) ? parsedResponse.words : []
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

export function extractJsonContent(text: string) {
  if (!text) {
    return '';
  }

  const regex = /```json\s*([\s\S]*?)\s*```/;
  const match = text.match(regex);

  if (match && match[1]) {
    return match[1].trim();
  }

  return text;
}

/**
 * Synthesizes speech using OpenAI TTS
 * @param text - Text to convert to speech
 * @param filePath - Output file path
 * @param voice - Voice to use for synthesis
 * @param telegramId - Telegram user ID for logging (optional)
 * @param databaseService - Database service for logging (optional)
 */
export async function synthesizeSpeech(
  text: string,
  filePath: string,
  voice: OpenAIVoice = 'nova',
  telegramId?: number,
  databaseService?: DatabaseService
): Promise<void> {
  const response = await openai.audio.speech.create({
    model: MODELS.TTS,
    input: text,
    voice
  });

  // Log TTS request if telegramId and databaseService are provided
  if (telegramId && databaseService) {
    // Use tokenizeAndEstimateCost to get token count and costs
    const tokenResult = await tokenizeAndEstimateCost({
      model: MODELS.TTS,
      input: text
    });

    // Calculate audio duration in seconds (approx. 150 words per minute)
    const wordCount = text.split(/\s+/).length;
    const audioSeconds = wordCount / 2.5; // 150 words per minute = 2.5 words per second

    await databaseService.logLlmRequest(
      telegramId,
      'tts',
      MODELS.TTS,
      tokenResult.cost || text.length * 0.000015, // Fallback if cost not provided
      tokenResult.inputTokens,
      0,
      audioSeconds
    );
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  await fs.writeFile(filePath, buffer);
}

/**
 * Processes text to extract word pairs between learning language and user language
 */
export async function extractWordPairs(
  fullText: string,
  learningLanguage: SupportedLearningLanguage = 'hungarian',
  userLanguage: SupportedLanguage = 'ru',
  telegramId?: number,
  databaseService?: DatabaseService
): Promise<{ front: string; back: string }[]> {
  const learningLanguageName = LEARNING_LANGUAGE_TO_NAME[learningLanguage];
  const userLanguageName = CODE_TO_LANGUAGE[userLanguage];

  const prompt = `
You are a bilingual assistant fluent in ${learningLanguageName} and ${userLanguageName}.
Extract unique ${learningLanguageName} words and their ${userLanguageName} translations.
Format: "${learningLanguageName} word - ${userLanguageName} translation" per line.
FIRST WORD IS ${learningLanguageName.toUpperCase()}, SECOND IS ${userLanguageName.toUpperCase()}.
Focus on everyday useful words. If words have errors, fix them.
Don't extract only letters or abbreviations.
EXTRACT ALL POSSIBLE PAIRS.
Text:
"""
${fullText}
"""`;

  const response = await chatCompletion(
    prompt,
    0.3,
    telegramId,
    databaseService
  );

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
 * Generates phrases for dictation in the learning language
 */
export async function generatePhrases(
  language: SupportedLearningLanguage,
  difficulty: DictationDifficulty,
  count: number,
  wordsOnly: boolean = false,
  telegramId?: number,
  databaseService?: DatabaseService
): Promise<string[]> {
  const languageName = LEARNING_LANGUAGE_TO_NAME[language];

  const difficultyDescriptions = {
    easy: 'simple greetings, basic phrases of 1-3 words, numbers, days of the week',
    medium:
      'everyday phrases of 3-5 words, simple questions, action descriptions',
    hard: 'complex sentences of 5-8 words, using different tenses, complex grammatical constructions'
  };

  const wordDifficultyDescriptions = {
    easy: `most basic ${languageName} words (numbers, colors, days of the week, greetings)`,
    medium: `everyday words of medium difficulty (food, transportation, work, leisure)`,
    hard: `complex words (abstract concepts, professional terms, rarely used words)`
  };

  const description = wordsOnly
    ? wordDifficultyDescriptions
    : difficultyDescriptions;
  const contentType = wordsOnly ? 'words' : 'phrases';

  const prompt = `
Generate ${count} unique ${languageName} ${contentType} for language learning.
Difficulty level: ${difficulty} (${description[difficulty]})

Requirements:
${
  wordsOnly
    ? `
- Each item should be a single ${languageName} word
- Include common, practical words
- Match the difficulty level
- No phrases or sentences, only individual words
- No translations, only ${languageName} text
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
- No translations, only ${languageName} text
- Each phrase on a new line
`
}

${contentType.charAt(0).toUpperCase() + contentType.slice(1)}:`;

  const response = await chatCompletion(
    prompt,
    0.7,
    telegramId,
    databaseService
  );

  return response
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .slice(0, count);
}

/**
 * Generates a story for dictation in the learning language
 */
export async function generateStory(
  language: SupportedLearningLanguage,
  difficulty: DictationDifficulty,
  telegramId?: number,
  databaseService?: DatabaseService
): Promise<string[]> {
  const languageName = LEARNING_LANGUAGE_TO_NAME[language];

  const difficultyDescriptions = {
    easy: 'simple story with 3-4 short sentences, basic grammar, present tense',
    medium:
      'story with 4-5 medium-length sentences, simple past tense, simple dialogues',
    hard: 'story with 5-6 complex sentences, mixed tenses, complex grammatical structures'
  };

  const prompt = `
Generate a short ${languageName} story for language learning.
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
- No translations, only ${languageName} text

Story:`;

  const response = await chatCompletion(
    prompt,
    0.7,
    telegramId,
    databaseService
  );

  return response
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}
