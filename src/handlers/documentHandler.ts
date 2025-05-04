import * as fs from 'fs/promises';
import * as path from 'path';
import { Context, InputFile, InlineKeyboard } from 'grammy';
import { TELEGRAM_BOT_TOKEN, ensureUserDir } from '../config';
import {
  extractTextFromPdf,
  downloadFile,
  createAnkiDeck,
  formatTime
} from '../services/document';
import { extractWordPairs, MODELS } from '../services/openai/index';
import { store } from '../store';
import { debounce } from '../utils/debounce';
import {
  tokenizeAndEstimateCost,
  splitTextIntoChunks
} from '../services/token-calculator';
import { t, SupportedLanguage } from '../services/i18n';
import {
  CALLBACK_ACCEPT,
  CALLBACK_CANCEL,
  MAX_BOT_FILE_SIZE,
  PROGRESS_BAR_LENGTH,
  PROGRESS_UPDATE_THRESHOLD,
  DEBOUNCE_INTERVAL_MS,
  DEFAULT_OCR_LANGUAGES
} from '../constants/documentHandler';
import {
  getUserLang,
  formatFileSize,
  progressBar
} from '../utils/handlerUtils';
import { DatabaseService } from '../services';
import {
  generateFileHash,
  saveHashRecord,
  getHashRecord,
  saveExtractedTextForHash,
  getExtractedTextForHash
} from '../utils/fileHash';

import * as Sentry from '@sentry/node';

interface WordPair {
  front: string;
  back: string;
}

interface PendingTask {
  filePath: string;
  text: string;
  messageId: number;
  pageCount: number;
  fileHash?: string;
}

const pendingTasks = new Map<number, PendingTask>();
const databaseService = new DatabaseService();

export async function handleDocumentUpload(ctx: Context): Promise<void> {
  const userId = ctx.from?.id;
  if (!userId) {
    await ctx.reply(t('document.user_not_identified', 'en'));
    return;
  }
  const userLang = await getUserLang(userId, ctx.from);
  try {
    const file = ctx.message?.document;
    if (!file) {
      await ctx.reply(t('document.file_not_found', userLang));
      return;
    }

    const userDir = await ensureUserDir(userId);

    if (file.file_size && file.file_size > MAX_BOT_FILE_SIZE) {
      const instructionsKeyboard = new InlineKeyboard().url(
        t('document.how_to_handle_large_files', userLang),
        'https://ocrmypdf.readthedocs.io/en/latest/installation.html'
      );

      await ctx.reply(
        t('document.file_too_large', userLang, {
          size: formatFileSize(file.file_size)
        }),
        { reply_markup: instructionsKeyboard }
      );
      return;
    }

    const fileId = file.file_id;
    const fileInfo = await ctx.api.getFile(fileId);
    const fileName = file.file_name ?? `temp-${Date.now()}.pdf`;
    const filePath = path.join(userDir, fileName);
    const fileLink = `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${fileInfo.file_path}`;

    const processingMsg = await ctx.reply(t('document.downloading', userLang));
    await downloadFile(fileLink, filePath);

    await ctx.api.editMessageText(
      ctx.chat?.id || ctx.from?.id || 0,
      processingMsg.message_id,
      t('document.checking_file', userLang)
    );

    const fileHash = await generateFileHash(filePath);

    // Check if we've processed this file before
    const hashRecord = await getHashRecord(userId, fileHash);
    if (hashRecord) {
      const cachedText = await getExtractedTextForHash(userId, fileHash);

      if (cachedText) {
        await ctx.api.editMessageText(
          ctx.chat?.id || ctx.from?.id || 0,
          processingMsg.message_id,
          t('document.already_processed', userLang, {
            date: new Date(hashRecord.processedAt).toLocaleString(),
            words: hashRecord.wordPairCount
          })
        );

        // Process the cached text
        await processExtractedText(
          ctx,
          userLang,
          userId,
          fileHash,
          cachedText,
          hashRecord.pageCount,
          processingMsg.message_id
        );

        // We're done, clean up the downloaded file
        await fs.unlink(filePath);
        return;
      }
    }

    await ctx.api.editMessageText(
      ctx.chat?.id || ctx.from?.id || 0,
      processingMsg.message_id,
      t('document.analyzing', userLang)
    );

    const updateMessage = debounce(async (text: string) => {
      try {
        await ctx.api.editMessageText(
          ctx.chat?.id || ctx.from?.id || 0,
          processingMsg.message_id,
          text
        );
      } catch (error) {
        Sentry.captureException(error);
        console.error('Error updating progress message:', error);
      }
    }, DEBOUNCE_INTERVAL_MS);

    let lastProgress = 0;
    let lastPage = 0;

    const { text, pageCount, ocrUsed } = await extractTextFromPdf(
      filePath,
      async (info) => {
        try {
          let statusMessage = info.status;

          if (info.estimatedTimeRemaining) {
            const formattedTime = formatTime(
              info.estimatedTimeRemaining,
              userLang
            );
            statusMessage +=
              '\n' +
              t('general.time.estimated', userLang, {
                time: formattedTime
              });
          }

          if (info.pageCount) {
            if (info.currentPage !== undefined) {
              statusMessage +=
                '\n' +
                t('general.page.current', userLang, {
                  current: info.currentPage,
                  total: info.pageCount
                });
            } else {
              statusMessage +=
                '\n' +
                t('general.page.total', userLang, {
                  count: info.pageCount
                });
            }
          }

          statusMessage += `\n${progressBar(
            info.progress,
            PROGRESS_BAR_LENGTH
          )}`;

          const progressDelta = Math.abs(info.progress - lastProgress);
          const pageChanged =
            info.currentPage !== undefined && info.currentPage !== lastPage;

          if (
            progressDelta >= PROGRESS_UPDATE_THRESHOLD ||
            pageChanged ||
            info.progress >= 100
          ) {
            lastProgress = info.progress;
            if (info.currentPage !== undefined) {
              lastPage = info.currentPage;
            }

            updateMessage(statusMessage);
          }
        } catch (error) {
          Sentry.captureException(error);
          console.error('Error preparing progress update:', error);
        }
      },
      DEFAULT_OCR_LANGUAGES
    );

    if (!text || text.trim().length === 0) {
      await ctx.api.editMessageText(
        ctx.chat?.id || ctx.from?.id || 0,
        processingMsg.message_id,
        t('document.extraction_failed', userLang)
      );
      await fs.unlink(filePath);
      return;
    }

    // Save the extracted text with file hash
    if (fileHash) {
      await saveExtractedTextForHash(userId, fileHash, text);
    }

    const extractionMethod = ocrUsed
      ? t('document.extraction_ocr', userLang)
      : t('document.extraction_direct', userLang);

    await ctx.api.editMessageText(
      ctx.chat?.id || ctx.from?.id || 0,
      processingMsg.message_id,
      t('document.extraction_success', userLang, {
        method: extractionMethod
      })
    );

    const { inputTokens, outputTokens, cost } = await tokenizeAndEstimateCost({
      model: `openrouter/${MODELS.CHAT}`,
      input: text
    });
    const tokens = inputTokens + outputTokens;

    const keyboard = new InlineKeyboard()
      .text(t('document.continue', userLang), CALLBACK_ACCEPT)
      .text(t('document.cancel', userLang), CALLBACK_CANCEL);

    const tokenMessage = await ctx.reply(
      t('document.text_analysis', userLang, {
        pages: pageCount,
        tokens: tokens,
        cost: cost?.toFixed(4) || '0.00'
      }),
      { reply_markup: keyboard }
    );

    if (userId) {
      pendingTasks.set(ctx.from.id, {
        filePath,
        text,
        messageId: tokenMessage.message_id,
        pageCount,
        fileHash
      });
    }
  } catch (error) {
    Sentry.captureException(error);
    console.error('Error processing file:', error);

    if (error instanceof Error) {
      if (error.message.includes('file is too big')) {
        await ctx.reply(t('document.large_file_error', userLang));
        return;
      }
    }

    await ctx.reply(t('document.error_processing', userLang));
  }
}

/**
 * Process extracted text to generate word pairs and Anki deck
 */
async function processExtractedText(
  ctx: Context,
  userLang: SupportedLanguage,
  userId: number,
  fileHash: string,
  extractedText: string,
  pageCount: number,
  messageId: number
): Promise<void> {
  try {
    const learningLanguage = await store.getUserLearningLanguage(userId);
    const startTime = Date.now();

    await ctx.api.editMessageText(
      ctx.chat?.id || userId,
      messageId,
      t('document.splitting_text', userLang),
      { reply_markup: undefined }
    );

    const chunks = await splitTextIntoChunks(
      `openrouter/${MODELS.CHAT}`,
      extractedText
    );

    let allWordPairs: WordPair[] = [];
    let processedChunks = 0;

    for (const chunk of chunks) {
      processedChunks++;

      await ctx.api.editMessageText(
        ctx.chat?.id || userId,
        messageId,
        t('document.processing_chunk', userLang, {
          current: processedChunks,
          total: chunks.length,
          count: chunk.tokenCount
        }),
        { reply_markup: undefined }
      );

      const chunkWordPairs = await extractWordPairs(
        chunk.text,
        learningLanguage,
        userLang,
        userId,
        databaseService
      );
      allWordPairs = [...allWordPairs, ...chunkWordPairs];
    }

    allWordPairs = Array.from(
      new Map(allWordPairs.map((pair) => [JSON.stringify(pair), pair])).values()
    );

    await ctx.api.editMessageText(
      ctx.chat?.id || userId,
      messageId,
      t('document.creating_deck', userLang, { count: allWordPairs.length }),
      { reply_markup: undefined }
    );

    // Save the word count in the hash record
    if (fileHash) {
      await saveHashRecord(
        userId,
        fileHash,
        allWordPairs.length,
        pageCount,
        true // Assuming OCR was used
      );
    }

    // Store word pairs for future use
    store.setLastWordPairs(allWordPairs);

    // Validate userId is a valid integer
    if (isNaN(userId) || !Number.isInteger(userId)) {
      throw new Error(
        `Invalid user ID: ${userId}. User ID must be a valid integer.`
      );
    }

    const userDir = await ensureUserDir(userId);
    const deckName = `Hungarian Vocabulary - ${new Date().toLocaleDateString()}`;
    const buffer = await createAnkiDeck(deckName, allWordPairs, userId);
    const deckPath = path.join(userDir, `hungarian_${Date.now()}.apkg`);
    await fs.writeFile(deckPath, buffer);

    const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);

    await ctx.api.editMessageText(
      ctx.chat?.id || userId,
      messageId,
      t('document.processing_complete', userLang, {
        time: totalTime,
        pages: pageCount,
        words: allWordPairs.length
      }),
      { reply_markup: undefined }
    );

    await ctx.replyWithDocument(new InputFile(deckPath), {
      caption: t('document.deck_ready', userLang, {
        count: allWordPairs.length
      })
    });

    await fs.unlink(deckPath);
  } catch (error) {
    Sentry.captureException(error);
    console.error('Error processing extracted text:', error);
    await ctx.api.editMessageText(
      ctx.chat?.id || userId,
      messageId,
      t('document.error_processing', userLang),
      { reply_markup: undefined }
    );
  }
}

export async function handleDocumentCallback(ctx: Context): Promise<void> {
  if (!ctx.callbackQuery?.data || !ctx.from?.id) return;

  const userId = ctx.from.id;
  const userLang = await getUserLang(userId);
  try {
    const data = ctx.callbackQuery.data;

    const task = pendingTasks.get(userId);
    if (!task) {
      await ctx.answerCallbackQuery(t('document.task_expired', userLang));
      return;
    }

    if (data === CALLBACK_ACCEPT) {
      await ctx.answerCallbackQuery(t('document.processing_start', userLang));

      // Process the text
      await processExtractedText(
        ctx,
        userLang,
        userId,
        task.fileHash || '',
        task.text,
        task.pageCount,
        task.messageId
      );

      // Clean up the original file
      await fs.unlink(task.filePath);
      pendingTasks.delete(userId);
    } else if (data === CALLBACK_CANCEL) {
      await ctx.answerCallbackQuery(
        t('document.operation_cancelled', userLang)
      );

      await ctx.api.editMessageText(
        ctx.chat?.id || userId,
        task.messageId,
        t('document.operation_cancelled_message', userLang),
        { reply_markup: undefined }
      );

      await fs.unlink(task.filePath);
      pendingTasks.delete(userId);
    }
  } catch (error) {
    Sentry.captureException(error);
    console.error('Error handling callback:', error);
    await ctx.answerCallbackQuery(t('document.callback_error', userLang));
  }
}
