import { Tiktoken } from 'tiktoken/lite';
import { load } from 'tiktoken/load';
import registry from 'tiktoken/registry.json';
import modelToEncoding from 'tiktoken/model_to_encoding.json';
import modelPricesAndContextWindow from './model_prices_and_context_window.json'; // https://github.com/BerriAI/litellm/blob/main/model_prices_and_context_window.json

interface TokenizeAndEstimateCostParams {
  model: string;
  input?: string;
  output?: string;
}

interface EstimateCostParams {
  model: string;
  inputTokens?: number;
  outputTokens?: number;
}

interface TokenizationResult {
  inputTokens: number;
  outputTokens: number;
  cost?: number;
}

interface ModelPrice {
  input_cost_per_token?: number;
  output_cost_per_token?: number;
  context_window?: number;
  max_input_tokens?: number;
  max_output_tokens?: number;
  [key: string]: any;
}

interface TextChunk {
  text: string;
  tokenCount: number;
}

const cachedModel: Record<string, { model: any; encoder: Tiktoken }> = {};

const initTikToken = async (modelName: string) => {
  if (!cachedModel[modelName]) {
    const fallback = 'gpt-4o';
    const gptModelName = modelName in modelToEncoding ? modelName : fallback;

    const encoding =
      modelToEncoding[gptModelName as keyof typeof modelToEncoding];
    const registryInfo = registry[encoding as keyof typeof registry];
    const model = await load(registryInfo);
    const encoder = new Tiktoken(
      model.bpe_ranks,
      model.special_tokens,
      model.pat_str
    );

    cachedModel[modelName] = { model, encoder };
  }

  return cachedModel[modelName];
};

async function countTokens(model: string, text: string): Promise<number> {
  if (!text) return 0;

  const { encoder } = await initTikToken(model);
  return encoder.encode(text).length;
}

export async function tokenizeAndEstimateCost({
  model,
  input,
  output
}: TokenizeAndEstimateCostParams): Promise<TokenizationResult> {
  const inputTokens = (input && (await countTokens(model, input))) || 0;
  const outputTokens = (output && (await countTokens(model, output))) || 0;

  const cost = estimateCost({ model, inputTokens, outputTokens });

  return {
    inputTokens,
    outputTokens,
    cost
  };
}

export function estimateCost({
  model,
  inputTokens,
  outputTokens
}: EstimateCostParams): number | undefined {
  const modelPrice = modelPricesAndContextWindow[
    model as keyof typeof modelPricesAndContextWindow
  ] as ModelPrice;
  const { input_cost_per_token, output_cost_per_token } = modelPrice || {};

  return input_cost_per_token || output_cost_per_token
    ? (inputTokens || 0) * (input_cost_per_token ?? 0) +
        (outputTokens || 0) * (output_cost_per_token ?? 0)
    : undefined;
}

export function getModelLimits(model: string): {
  maxInputTokens: number;
  maxOutputTokens: number;
} {
  const modelPrice = modelPricesAndContextWindow[
    model as keyof typeof modelPricesAndContextWindow
  ] as ModelPrice;

  return {
    maxInputTokens: modelPrice?.max_input_tokens || 8192, // Default fallback
    maxOutputTokens: modelPrice?.max_output_tokens || 2048 // Default fallback
  };
}

export async function splitTextIntoChunks(
  model: string,
  text: string,
  maxChunkTokens?: number
): Promise<TextChunk[]> {
  const { maxInputTokens } = getModelLimits(model);
  const targetTokens = maxChunkTokens || Math.floor(maxInputTokens * 0.8); // Use 80% of max tokens by default
  const chunks: TextChunk[] = [];

  // Split text into paragraphs
  const paragraphs = text.split(/\n\s*\n/);
  let currentChunk = '';
  let currentTokenCount = 0;

  for (const paragraph of paragraphs) {
    const paragraphTokens = await countTokens(model, paragraph + '\n\n');

    // If a single paragraph exceeds target, split it into sentences
    if (paragraphTokens > targetTokens) {
      const sentences = paragraph.match(/[^.!?]+[.!?]+/g) || [paragraph];
      for (const sentence of sentences) {
        const sentenceTokens = await countTokens(model, sentence + ' ');

        if (currentTokenCount + sentenceTokens > targetTokens) {
          if (currentChunk) {
            chunks.push({
              text: currentChunk.trim(),
              tokenCount: currentTokenCount
            });
          }
          currentChunk = sentence + ' ';
          currentTokenCount = sentenceTokens;
        } else {
          currentChunk += sentence + ' ';
          currentTokenCount += sentenceTokens;
        }
      }
    }
    // If adding paragraph doesn't exceed limit, add it
    else if (currentTokenCount + paragraphTokens <= targetTokens) {
      currentChunk += paragraph + '\n\n';
      currentTokenCount += paragraphTokens;
    }
    // If adding paragraph would exceed limit, create new chunk
    else {
      if (currentChunk) {
        chunks.push({
          text: currentChunk.trim(),
          tokenCount: currentTokenCount
        });
      }
      currentChunk = paragraph + '\n\n';
      currentTokenCount = paragraphTokens;
    }
  }

  // Add the last chunk if it exists
  if (currentChunk) {
    chunks.push({
      text: currentChunk.trim(),
      tokenCount: currentTokenCount
    });
  }

  return chunks;
}
