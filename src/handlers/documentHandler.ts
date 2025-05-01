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

// Define callback data for buttons
const CALLBACK_ACCEPT = 'process_pdf_accept';
const CALLBACK_CANCEL = 'process_pdf_cancel';

// Telegram file size limits
const MAX_BOT_FILE_SIZE = 20 * 1024 * 1024; // 20MB - Telegram bot API limit

// Add WordPair type at the top of the file
interface WordPair {
  front: string;
  back: string;
}

// Store pending document processing tasks
interface PendingTask {
  filePath: string;
  text: string;
  messageId: number;
  pageCount: number;
}

const pendingTasks = new Map<number, PendingTask>();

/**
 * Format file size in human-readable format
 * @param bytes - File size in bytes
 * @returns Formatted file size string
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Create a text-based progress bar
 * @param percent - Percentage completion (0-100)
 * @returns Progress bar string
 */
function progressBar(percent: number): string {
  const completed = Math.floor(percent / 10);
  const remaining = 10 - completed;

  return (
    '▓'.repeat(completed) + '░'.repeat(remaining) + ` ${Math.round(percent)}%`
  );
}

/**
 * Get user language safely handling undefined user IDs
 * @param userId - User ID or undefined
 * @returns Language code
 */
function getUserLang(userId: number | undefined): SupportedLanguage {
  if (userId === undefined) {
    return 'en'; // Default to English if no user ID
  }
  return store.getUserLanguage(userId);
}

/**
 * Handle document upload (PDF files)
 * @param ctx - Telegram context
 */
export async function handleDocumentUpload(ctx: Context): Promise<void> {
  const userId = ctx.from?.id;
  if (!userId) {
    await ctx.reply(t('document.user_not_identified', 'en'));
    return;
  }
  try {
    // Get file from message
    const file = ctx.message?.document;
    if (!file) {
      await ctx.reply(t('document.file_not_found', getUserLang(ctx.from?.id!)));
      return;
    }

    // Get user ID

    // Ensure user directory exists
    const userDir = await ensureUserDir(userId);
    const userLang = getUserLang(userId);

    // Check file size
    if (file.file_size && file.file_size > MAX_BOT_FILE_SIZE) {
      // File is too large, provide instructions for handling large files
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

    // Download the file
    const fileId = file.file_id;
    const fileInfo = await ctx.api.getFile(fileId);
    const fileName = file.file_name ?? `temp-${Date.now()}.pdf`;
    const filePath = path.join(userDir, fileName);

    // Get file URL and download
    const fileLink = `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${fileInfo.file_path}`;

    // Send initial message
    const processingMsg = await ctx.reply(t('document.downloading', userLang));
    await downloadFile(fileLink, filePath);

    // Update message after download
    await ctx.api.editMessageText(
      ctx.chat?.id || ctx.from?.id || 0,
      processingMsg.message_id,
      t('document.analyzing', userLang)
    );

    // Create a debounced message update function to prevent API spam
    // Only update Telegram message at most once per second
    const updateMessage = debounce(async (text: string) => {
      try {
        await ctx.api.editMessageText(
          ctx.chat?.id || ctx.from?.id || 0,
          processingMsg.message_id,
          text
        );
      } catch (error) {
        console.error('Error updating progress message:', error);
      }
    }, 1000);

    // Last progress state to track significant changes
    let lastProgress = 0;
    let lastPage = 0;

    // Extract text with OCR if needed, with debounced progress updates
    const { text, pageCount, ocrUsed } = await extractTextFromPdf(
      filePath,
      async (info) => {
        try {
          let statusMessage = info.status;

          // Add time estimation if available
          if (info.estimatedTimeRemaining) {
            const formattedTime = formatTime(
              info.estimatedTimeRemaining,
              getUserLang(userId)
            );
            statusMessage +=
              '\n' +
              t('general.time.estimated', getUserLang(userId), {
                time: formattedTime
              });
          }

          // Add page info if available
          if (info.pageCount) {
            if (info.currentPage !== undefined) {
              statusMessage +=
                '\n' +
                t('general.page.current', getUserLang(userId), {
                  current: info.currentPage,
                  total: info.pageCount
                });
            } else {
              statusMessage +=
                '\n' +
                t('general.page.total', getUserLang(userId), {
                  count: info.pageCount
                });
            }
          }

          // Add progress indicator
          statusMessage += `\n${progressBar(info.progress)}`;

          // Only update if progress changed significantly (>5%) or page changed
          // This provides an additional layer of protection against frequent updates
          const progressDelta = Math.abs(info.progress - lastProgress);
          const pageChanged =
            info.currentPage !== undefined && info.currentPage !== lastPage;

          if (progressDelta >= 5 || pageChanged || info.progress >= 100) {
            lastProgress = info.progress;
            if (info.currentPage !== undefined) {
              lastPage = info.currentPage;
            }

            // Use debounced update
            updateMessage(statusMessage);
          }
        } catch (error) {
          console.error('Error preparing progress update:', error);
        }
      }
    );

    // Check if text was extracted
    if (!text || text.trim().length === 0) {
      await ctx.api.editMessageText(
        ctx.chat?.id || ctx.from?.id || 0,
        processingMsg.message_id,
        t('document.extraction_failed', getUserLang(userId))
      );
      await fs.unlink(filePath);
      return;
    }

    // Update the final OCR status
    const extractionMethod = ocrUsed
      ? t('document.extraction_ocr', getUserLang(userId))
      : t('document.extraction_direct', getUserLang(userId));

    await ctx.api.editMessageText(
      ctx.chat?.id || ctx.from?.id || 0,
      processingMsg.message_id,
      t('document.extraction_success', getUserLang(userId), {
        method: extractionMethod
      })
    );

    // Calculate tokens and estimated cost
    const { inputTokens, outputTokens, cost } = await tokenizeAndEstimateCost({
      model: `openrouter/${MODELS.CHAT}`,
      input: text
    });
    const tokens = inputTokens + outputTokens;

    // Create inline keyboard with accept/cancel buttons
    const keyboard = new InlineKeyboard()
      .text(t('document.continue', getUserLang(userId)), CALLBACK_ACCEPT)
      .text(t('document.cancel', getUserLang(userId)), CALLBACK_CANCEL);

    // Send token info as a new message
    const tokenMessage = await ctx.reply(
      t('document.text_analysis', getUserLang(userId), {
        pages: pageCount,
        tokens: tokens,
        cost: cost?.toFixed(4) || '0.00'
      }),
      { reply_markup: keyboard }
    );

    // Store the pending task with the new message ID
    if (userId) {
      pendingTasks.set(ctx.from.id, {
        filePath,
        text,
        messageId: tokenMessage.message_id,
        pageCount
      });
    }
  } catch (error) {
    console.error('Ошибка обработки файла:', error);

    // Check for specific error types
    if (error instanceof Error) {
      if (error.message.includes('file is too big')) {
        await ctx.reply(t('document.large_file_error', getUserLang(userId)));
        return;
      }
    }

    await ctx.reply(t('document.error_processing', getUserLang(userId)));
  }
}

/**
 * Handle button callbacks for document processing
 * @param ctx - Telegram context
 */
export async function handleDocumentCallback(ctx: Context): Promise<void> {
  if (!ctx.callbackQuery?.data || !ctx.from?.id) return;

  const userId = ctx.from.id;
  try {
    const userLang = getUserLang(userId);
    const data = ctx.callbackQuery.data;

    const task = pendingTasks.get(userId);
    if (!task) {
      await ctx.answerCallbackQuery(t('document.task_expired', userLang));
      return;
    }

    if (data === CALLBACK_ACCEPT) {
      await ctx.answerCallbackQuery(t('document.processing_start', userLang));

      await ctx.api.editMessageText(
        ctx.chat?.id || userId,
        task.messageId,
        t('document.splitting_text', userLang),
        { reply_markup: undefined }
      );

      const startTime = Date.now();

      // Split text into chunks
      const chunks = await splitTextIntoChunks(
        `openrouter/${MODELS.CHAT}`,
        task.text
      );

      let allWordPairs: WordPair[] = [];
      let processedChunks = 0;

      // Process each chunk
      for (const chunk of chunks) {
        processedChunks++;

        await ctx.api.editMessageText(
          ctx.chat?.id || userId,
          task.messageId,
          t('document.processing_chunk', userLang, {
            current: processedChunks,
            total: chunks.length,
            count: chunk.tokenCount
          }),
          { reply_markup: undefined }
        );

        const chunkWordPairs = await extractWordPairs(chunk.text);
        allWordPairs = [...allWordPairs, ...chunkWordPairs];
      }

      // Remove duplicates by converting to string and back
      allWordPairs = Array.from(
        new Map(
          allWordPairs.map((pair) => [JSON.stringify(pair), pair])
        ).values()
      );

      // Update progress
      await ctx.api.editMessageText(
        ctx.chat?.id || userId,
        task.messageId,
        t('document.creating_deck', userLang, { count: allWordPairs.length }),
        { reply_markup: undefined }
      );

      store.setLastWordPairs(allWordPairs);

      // Ensure user directory exists
      const userDir = await ensureUserDir(userId);

      // Create Anki deck
      const deckName = `Hungarian Vocabulary - ${new Date().toLocaleDateString()}`;
      const buffer = await createAnkiDeck(deckName, allWordPairs, userId);
      const deckPath = path.join(userDir, `hungarian_${Date.now()}.apkg`);
      await fs.writeFile(deckPath, buffer);

      // Calculate total processing time
      const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);

      // Update final message
      await ctx.api.editMessageText(
        ctx.chat?.id || userId,
        task.messageId,
        t('document.processing_complete', userLang, {
          time: totalTime,
          pages: task.pageCount,
          words: allWordPairs.length
        }),
        { reply_markup: undefined }
      );

      // Send deck to user
      await ctx.replyWithDocument(new InputFile(deckPath), {
        caption: t('document.deck_ready', userLang, {
          count: allWordPairs.length
        })
      });

      // Clean up files
      await fs.unlink(task.filePath);
      await fs.unlink(deckPath);

      // Clean up the task
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
    console.error('Ошибка при обработке кнопки:', error);
    await ctx.answerCallbackQuery(
      t('document.callback_error', getUserLang(userId))
    );
  }
}
