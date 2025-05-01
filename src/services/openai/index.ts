/**
 * OpenAI service configuration and common functionality
 */
import OpenAI from 'openai';
import { promises as fs } from 'fs';
import { jsonrepair } from 'jsonrepair';

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
  t,
  LANGUAGE_SPECIFIC_CHARS
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
      model: `openrouter/${MODELS.CHAT}`,
      input: prompt,
      output: response
    });

    console.log('Token result:', tokenResult, inputTokens, outputTokens);

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
 * Resume an incomplete response from a previous LLM call
 * @param partialResponse - The incomplete response to continue
 * @param originalPrompt - The original prompt that generated the partial response
 * @param temperature - Temperature for response generation (0-1)
 * @param telegramId - Telegram user ID for logging (optional)
 * @param databaseService - Database service for logging (optional)
 * @returns Complete text that continues from the partial response
 */
export async function resumeCompletion(
  partialResponse: string,
  originalPrompt: string,
  temperature: number = 0.7,
  telegramId?: number,
  databaseService?: DatabaseService
): Promise<string> {
  // Determine if the response appears to be JSON
  const isJsonFormat =
    partialResponse.includes('[') || partialResponse.includes('{');

  // Create a resume prompt that tells the model to continue from where it left off
  const resumePrompt = isJsonFormat
    ? `
You previously started generating a JSON response to this prompt but were cut off. 
Continue EXACTLY where you left off without repeating anything, maintaining the same JSON format.

Original prompt: ${originalPrompt}

You started with this response (DO NOT REPEAT THIS PART, CONTINUE FROM EXACTLY WHERE IT ENDED):
${partialResponse}
`
    : `
You previously started generating a response to this prompt but were cut off. 
Continue EXACTLY where you left off without repeating anything.

Original prompt: ${originalPrompt}

You started with this response (DO NOT REPEAT THIS PART, CONTINUE FROM EXACTLY WHERE IT ENDED):
${partialResponse}
`;

  const continuation = await openrouter.chat.completions.create({
    model: MODELS.CHAT,
    messages: [{ role: 'user', content: resumePrompt }],
    temperature
  });

  // Log LLM request if telegramId and databaseService are provided
  if (telegramId && databaseService) {
    const inputTokens = continuation.usage?.prompt_tokens || 0;
    const outputTokens = continuation.usage?.completion_tokens || 0;
    const response = continuation.choices[0]?.message?.content || '';

    // Calculate cost using token calculator
    const tokenResult = await tokenizeAndEstimateCost({
      model: `openrouter/${MODELS.CHAT}`,
      input: resumePrompt,
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

  const continuationText = continuation.choices[0]?.message?.content ?? '';

  // For JSON responses, we may need to combine and repair the JSON
  if (isJsonFormat) {
    const combinedJson = partialResponse + continuationText;
    try {
      // Try to repair and parse the combined JSON
      const repairedJson = sanitizeJson(combinedJson);
      JSON.parse(repairedJson); // Just to validate
      return repairedJson;
    } catch (error) {
      console.error('Failed to combine and repair JSON response:', error);
      // If combining fails, at least return both parts
      return partialResponse + continuationText;
    }
  }

  // For regular text, simply concatenate
  return partialResponse + continuationText;
}

/**
 * Helper function to check if a string appears to be incomplete JSON
 */
export function isIncompleteJSON(text: string): boolean {
  if (!text) return false;

  // Count opening and closing brackets/braces
  const openSquareBrackets = (text.match(/\[/g) || []).length;
  const closeSquareBrackets = (text.match(/\]/g) || []).length;
  const openCurlyBraces = (text.match(/{/g) || []).length;
  const closeCurlyBraces = (text.match(/}/g) || []).length;

  // Basic check if brackets are unbalanced
  if (
    openSquareBrackets !== closeSquareBrackets ||
    openCurlyBraces !== closeCurlyBraces
  ) {
    return true;
  }

  // Check for specific incomplete JSON patterns
  const hasJsonStart = text.includes('[') || text.includes('{');
  const endsWithClosingBracket =
    text.trim().endsWith(']') || text.trim().endsWith('}');

  // If it has JSON start markers but doesn't end with a closing bracket
  if (hasJsonStart && !endsWithClosingBracket) {
    return true;
  }

  // If it has pairs like {"front": but the last one doesn't have a closing }
  if (text.includes('{"front":') && !text.includes('}]')) {
    const lastObjectStart = text.lastIndexOf('{"front":');
    const lastObjectEnd = text.lastIndexOf('}');

    // If the last opening brace is after the last closing brace, it's incomplete
    if (lastObjectStart > lastObjectEnd) {
      return true;
    }
  }

  // Try parsing as JSON, if it fails it might be incomplete
  try {
    JSON.parse(text);
    return false; // Successfully parsed, not incomplete
  } catch (e) {
    // But only return true if it actually has JSON-like structures
    return hasJsonStart;
  }
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

    let responseText = response.choices[0].message.content || '';

    // Check if the response appears to be truncated (ends without proper punctuation)
    const endsWithPunctuation = /[.!?،。؟]\s*$/.test(responseText.trim());
    const isSuspectedIncomplete =
      responseText.length >= MAX_CHUNK_TOKENS * 3 && !endsWithPunctuation;

    if (isSuspectedIncomplete) {
      console.log('Response appears to be truncated, attempting to resume...');
      responseText = await resumeCompletion(
        responseText,
        fullPrompt,
        0.7,
        telegramId,
        databaseService
      );
    }

    // Log LLM request if telegramId and databaseService are provided
    if (telegramId && databaseService) {
      const inputTokens = response.usage?.prompt_tokens || 0;
      const outputTokens = response.usage?.completion_tokens || 0;

      // Calculate cost using token calculator
      const tokenResult = await tokenizeAndEstimateCost({
        model: `openrouter/${MODELS.CHAT}`,
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

    let content = response.choices[0].message.content || '';

    // Check if we received an incomplete JSON response
    if (isIncompleteJSON(content)) {
      console.log(
        'Detected incomplete JSON response in correctAndReplyWithWords, attempting to resume...'
      );
      content = await resumeCompletion(
        content,
        fullPrompt,
        0.7,
        telegramId,
        databaseService
      );
    }

    // Log LLM request if telegramId and databaseService are provided
    if (telegramId && databaseService) {
      const inputTokens = response.usage?.prompt_tokens || 0;
      const outputTokens = response.usage?.completion_tokens || 0;

      // Calculate cost using token calculator
      const tokenResult = await tokenizeAndEstimateCost({
        model: `openrouter/${MODELS.CHAT}`,
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
      const jsonContent = extractJsonContent(content);

      // If JSON still appears incomplete after extraction, try one more resume
      if (isIncompleteJSON(jsonContent)) {
        console.log(
          'JSON content still appears incomplete after extraction, trying one more resume...'
        );
        const resumedContent = await resumeCompletion(
          content,
          fullPrompt,
          0.7,
          telegramId,
          databaseService
        );
        const resumedJsonContent = extractJsonContent(resumedContent);
        const parsedResponse = JSON.parse(resumedJsonContent);

        return {
          text: parsedResponse.text || '',
          words: Array.isArray(parsedResponse.words) ? parsedResponse.words : []
        };
      }

      const parsedResponse = JSON.parse(jsonContent);
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

  console.log('Extracting JSON content from:', text);

  // Handle various JSON code block formats
  const codeBlockRegexes = [
    /```json\s*([\s\S]*?)\s*```/, // ```json {...} ```
    /```\s*([\s\S]*?)\s*```/, // ``` {...} ```
    /`\s*([\s\S]*?)\s*`/ // ` {...} `
  ];

  for (const regex of codeBlockRegexes) {
    const match = text.match(regex);
    if (match && match[1]) {
      return sanitizeJson(match[1].trim());
    }
  }

  // Check if the text itself is JSON (starts with [ or {)
  const trimmedText = text.trim();
  if (
    (trimmedText.startsWith('[') && trimmedText.endsWith(']')) ||
    (trimmedText.startsWith('{') && trimmedText.endsWith('}'))
  ) {
    return sanitizeJson(trimmedText);
  }

  // As a last resort, try to find anything that looks like JSON
  const jsonRegex = /(\[|\{)[\s\S]*?(\]|\})/;
  const jsonMatch = text.match(jsonRegex);
  if (jsonMatch && jsonMatch[0]) {
    return sanitizeJson(jsonMatch[0].trim());
  }

  return sanitizeJson(text);
}

/**
 * Repair invalid JSON using jsonrepair library with fallback to custom repair
 */
function sanitizeJson(input: string): string {
  try {
    // First check if it's already valid JSON
    JSON.parse(input);
    return input;
  } catch (e) {
    // Not valid JSON, try to repair
    try {
      // Use jsonrepair library to fix the JSON
      const repaired = jsonrepair(input);

      // Verify the repaired result is valid
      JSON.parse(repaired);
      return repaired;
    } catch (repairError) {
      // jsonrepair failed, log the error
      console.warn('jsonrepair failed:', repairError);

      // Fall back to custom repair logic for simple cases
      try {
        let cleaned = input;

        // Remove any trailing commas in arrays and objects
        cleaned = cleaned.replace(/,\s*]/g, ']').replace(/,\s*}/g, '}');

        // Fix single quotes in property names and string values
        cleaned = cleaned.replace(/'/g, '"');

        // Handle unquoted property names
        cleaned = cleaned.replace(
          /([{,]\s*)([a-zA-Z0-9_$]+)(\s*:)/g,
          '$1"$2"$3'
        );

        // Verify the cleaned result
        JSON.parse(cleaned);
        return cleaned;
      } catch (customRepairError) {
        // All repair attempts failed
        console.warn(
          'Could not repair JSON:',
          input.slice(0, 100) + (input.length > 100 ? '...' : '')
        );

        // Fall back to the original input string if all repairs fail
        return input;
      }
    }
  }
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

  console.log(
    'Extracting word pairs...',
    learningLanguageName,
    userLanguageName
  );

  const prompt = `
You are a bilingual assistant fluent in ${learningLanguageName} and ${userLanguageName}.

IMPORTANT TASK:
1. Extract ALL ${learningLanguageName} words from the text, being as thorough and comprehensive as possible.
2. For each ${learningLanguageName} word, provide a ${userLanguageName} translation.
3. Your PRIMARY goal is to identify EVERY ${learningLanguageName} word in the text, even if it doesn't have an obvious translation pair.
4. For any ${learningLanguageName} word that appears alone without a translation, you MUST create an accurate translation.

OUTPUT FORMAT:
You must respond with a valid JSON array of objects in MINIFIED format (no extra spaces or line breaks to save tokens), where each object has:
- "front": the ${learningLanguageName} word
- "back": the ${userLanguageName} translation

STRICT RULES:
1. LANGUAGE ORDER IS CRITICAL: "front" MUST BE ${learningLanguageName.toUpperCase()}, "back" MUST BE ${userLanguageName.toUpperCase()} (never reverse this order)
2. Extract ALL nouns, verbs, adjectives, adverbs, and useful phrases
3. DO extract conjugated forms, declensions, and other grammatical variations as separate entries
4. NEVER extract single letters, punctuation, or abbreviations
5. Each ${learningLanguageName} word must be at least 2 characters long
6. Each ${userLanguageName} translation must be at least 2 characters long
7. Extract EVERY meaningful word that appears in the text
8. If you find words with typos or errors, provide the correct form
9. Extract at minimum 20 pairs, but ideally include ALL words (30-50+ pairs if possible)
10. Each pair must be a separate object in the JSON array
11. Output MUST be valid JSON that can be parsed with JSON.parse()
12. For ${learningLanguageName} words that don't have an explicit translation in the text, ALWAYS create a reasonable translation
13. DO NOT skip any ${learningLanguageName} words - comprehensive extraction is critical
14. VERY IMPORTANT: Do NOT include ${userLanguageName} words in the "front" field. ONLY include actual ${learningLanguageName} words.
15. Do not mistake ${userLanguageName} words written with Latin characters as ${learningLanguageName} words.
16. Make sure your response is COMPLETE and properly closed with all JSON brackets.
17. Use MINIFIED JSON format without extra whitespace to save tokens (example: [{"front":"word","back":"translation"},{"front":"word2","back":"translation2"}])
18. CRITICAL: NEVER include single letters - all words must be at least 3 characters
19. NO REPETITION: Do not repeat the same word pair multiple times
20. DO NOT include the same word multiple times with the same translation

EXAMPLE OUTPUT:
[{"front":"kutya","back":"собака"},{"front":"macska","back":"кошка"},{"front":"ház","back":"дом"},{"front":"nagy","back":"большой"},{"front":"fut","back":"бежать"},{"front":"megy","back":"идти"},{"front":"piros","back":"красный"}]

Remember: ${learningLanguageName} words as "front", ${userLanguageName} translations as "back". BE THOROUGH AND EXTRACT ALL ${learningLanguageName} WORDS.

Text to analyze:
"""
${fullText}
"""`;

  // Increase temperature slightly to reduce chances of repetition patterns
  const response = await chatCompletion(
    prompt,
    0.5,
    telegramId,
    databaseService
  );

  // Try to parse JSON response
  try {
    // Extract JSON if it's wrapped in code blocks
    let jsonContent = extractJsonContent(response);

    // Check if we have an incomplete JSON response
    const isIncompleteJson =
      (jsonContent.includes('[') && !jsonContent.trim().endsWith(']')) ||
      (jsonContent.includes('{') && !jsonContent.endsWith('}'));

    // If the response appears incomplete, attempt to resume it
    if (isIncompleteJson) {
      console.log('Detected incomplete JSON response, attempting to resume...');
      const resumedResponse = await resumeCompletion(
        response,
        prompt,
        0.5,
        telegramId,
        databaseService
      );
      jsonContent = extractJsonContent(resumedResponse);
    }

    // Additional handling for incomplete JSON
    // Check if the JSON array isn't properly closed
    if (jsonContent.includes('[') && !jsonContent.trim().endsWith(']')) {
      console.log('Detected incomplete JSON array, attempting to fix...');
      jsonContent = jsonContent.trim() + ']';
    }

    // Extra check for incomplete JSON objects within the array
    if (jsonContent.includes('{"front":') && !jsonContent.includes('}]')) {
      // Find the last complete object
      const lastCompleteObjectEnd = jsonContent.lastIndexOf('}');
      if (lastCompleteObjectEnd > 0) {
        jsonContent = jsonContent.substring(0, lastCompleteObjectEnd + 1) + ']';
        console.log('Fixed incomplete JSON object within array');
      }
    }

    const parsedResponse = JSON.parse(jsonContent);

    if (Array.isArray(parsedResponse)) {
      const validPairs: { front: string; back: string }[] = [];

      for (const pair of parsedResponse) {
        const { front, back } = pair;

        // Apply validation
        if (!front || !back) continue;
        if (typeof front !== 'string' || typeof back !== 'string') continue;

        // Strict length validation - must be at least 2 characters
        if (front.length < 2 || back.length < 2) {
          console.log(`Skipping short word: "${front}" - "${back}"`);
          continue;
        }

        // Skip single letters or numbers
        if (/^[a-zA-Z0-9]$/.test(front) || /^[а-яА-ЯёЁ0-9]$/.test(back)) {
          console.log(`Skipping single character: "${front}" - "${back}"`);
          continue;
        }

        validPairs.push({ front, back });
      }

      // More aggressive duplicate removal based on lowercased front word
      const uniquePairs = new Map<string, { front: string; back: string }>();

      validPairs.forEach((pair) => {
        const key = `${pair.front.toLowerCase()}`;
        if (!uniquePairs.has(key)) {
          uniquePairs.set(key, pair);
        }
      });

      const result = Array.from(uniquePairs.values());

      // If we have a lot of the same pair repeated, it's likely an error
      if (
        validPairs.length > 50 &&
        uniquePairs.size < validPairs.length * 0.5
      ) {
        console.warn(
          `Warning: Found too many duplicates (${validPairs.length} total pairs, but only ${uniquePairs.size} unique). This may indicate an issue with the extraction.`
        );
      }

      // If there are very few words, log a warning
      if (result.length < 5) {
        console.warn(
          `Warning: extractWordPairs extracted only ${result.length} valid pairs from text.`
        );
      }

      return result;
    }
  } catch (error) {
    console.error('Failed to parse JSON response:', error);
    console.error('Response received:', response.slice(0, 200) + '...');

    // Try to resume the response if it appears to be JSON but failed parsing
    if (response.includes('[') || response.includes('{')) {
      console.log('Attempting to resume incomplete JSON response...');
      try {
        const resumedResponse = await resumeCompletion(
          response,
          prompt,
          0.5,
          telegramId,
          databaseService
        );

        // Try to extract and parse the resumed response
        const jsonContent = extractJsonContent(resumedResponse);
        const parsedResponse = JSON.parse(jsonContent);

        if (Array.isArray(parsedResponse)) {
          // Apply the same validation as before
          const validPairs = parsedResponse
            .filter(
              (pair) =>
                pair.front &&
                pair.back &&
                typeof pair.front === 'string' &&
                typeof pair.back === 'string' &&
                pair.front.length >= 2 &&
                pair.back.length >= 2
            )
            .filter(
              (pair) =>
                !/^[a-zA-Z0-9]$/.test(pair.front) &&
                !/^[а-яА-ЯёЁ0-9]$/.test(pair.back)
            );

          // Remove duplicates
          const uniquePairs = new Map<
            string,
            { front: string; back: string }
          >();
          validPairs.forEach((pair) => {
            const key = pair.front.toLowerCase();
            if (!uniquePairs.has(key)) {
              uniquePairs.set(key, pair);
            }
          });

          return Array.from(uniquePairs.values());
        }
      } catch (resumeError) {
        console.error('Failed to resume and parse JSON:', resumeError);
      }
    }

    // Try one more approach - extract individual word pairs if JSON parsing fails
    try {
      // Extract anything that looks like {"front": "word", "back": "translation"}
      const pairRegex = /\{"front":\s*"([^"]+)",\s*"back":\s*"([^"]+)"\}/g;
      const matches = [...response.matchAll(pairRegex)];

      if (matches.length > 0) {
        console.log(`Extracted ${matches.length} pairs using regex fallback.`);

        const validPairs: { front: string; back: string }[] = [];

        for (const match of matches) {
          const front = match[1];
          const back = match[2];

          // Apply the same validation as before
          if (front.length < 2 || back.length < 2) continue;

          validPairs.push({ front, back });
        }

        // Remove duplicates
        const uniquePairs = new Map<string, { front: string; back: string }>();

        validPairs.forEach((pair) => {
          const key = `${pair.front.toLowerCase()}`;
          if (!uniquePairs.has(key)) {
            uniquePairs.set(key, pair);
          }
        });

        return Array.from(uniquePairs.values());
      }
    } catch (regexError) {
      console.error('Failed regex extraction fallback:', regexError);
    }
  }

  // Fallback to line-by-line parsing if JSON parsing fails
  const lines = response
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  const validPairs: { front: string; back: string }[] = [];

  for (const line of lines) {
    // Check if line follows the expected format with a dash separator
    if (!line.includes('-')) continue;

    const [front, back] = line.split('-').map((s) => s.trim());

    // Apply stricter validation
    if (!front || !back) continue; // Both parts must exist
    if (front.length < 2 || back.length < 2) continue; // Each part must be at least 2 chars

    // Skip single letters or numbers
    if (/^[a-zA-Z0-9]$/.test(front) || /^[а-яА-ЯёЁ0-9]$/.test(back)) {
      console.log(`Skipping single character: "${front}" - "${back}"`);
      continue;
    }

    validPairs.push({ front, back });
  }

  // Remove duplicates
  const uniquePairs = new Map<string, { front: string; back: string }>();

  validPairs.forEach((pair) => {
    // Only use the front for deduplication to keep unique learning language words
    const key = `${pair.front.toLowerCase()}`;
    if (!uniquePairs.has(key)) {
      uniquePairs.set(key, pair);
    }
  });

  const result = Array.from(uniquePairs.values());

  // If there are very few words, log a warning
  if (result.length < 5) {
    console.warn(
      `Warning: extractWordPairs extracted only ${result.length} valid pairs from text.`
    );
  }

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

  let response = await chatCompletion(prompt, 0.7, telegramId, databaseService);

  // Check if we might have an incomplete response (fewer phrases than requested)
  const lineCount = response
    .split('\n')
    .filter((line) => line.trim().length > 0).length;
  if (lineCount < count) {
    console.log(
      `Got only ${lineCount}/${count} phrases, attempting to resume...`
    );
    response = await resumeCompletion(
      response,
      prompt,
      0.7,
      telegramId,
      databaseService
    );
  }

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

  let response = await chatCompletion(prompt, 0.7, telegramId, databaseService);

  // Get expected sentence count based on difficulty
  const expectedSentenceCount = {
    easy: 4,
    medium: 5,
    hard: 6
  }[difficulty];

  // Check if we might have an incomplete story (fewer sentences than expected)
  const sentences = response
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (sentences.length < expectedSentenceCount) {
    console.log(
      `Got only ${sentences.length}/${expectedSentenceCount} sentences, attempting to resume the story...`
    );
    response = await resumeCompletion(
      response,
      prompt,
      0.7,
      telegramId,
      databaseService
    );
  }

  return response
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}
