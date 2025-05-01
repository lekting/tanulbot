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
import { t } from '../services/i18n';
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

interface WordPair {
  front: string;
  back: string;
}

interface PendingTask {
  filePath: string;
  text: string;
  messageId: number;
  pageCount: number;
}

const pendingTasks = new Map<number, PendingTask>();

export async function handleDocumentUpload(ctx: Context): Promise<void> {
  const userId = ctx.from?.id;
  if (!userId) {
    await ctx.reply(t('document.user_not_identified', 'en'));
    return;
  }
  try {
    const file = ctx.message?.document;
    if (!file) {
      await ctx.reply(t('document.file_not_found', getUserLang(userId)));
      return;
    }

    const userDir = await ensureUserDir(userId);
    const userLang = getUserLang(userId);

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
              getUserLang(userId)
            );
            statusMessage +=
              '\n' +
              t('general.time.estimated', getUserLang(userId), {
                time: formattedTime
              });
          }

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
          console.error('Error preparing progress update:', error);
        }
      },
      DEFAULT_OCR_LANGUAGES
    );

    if (!text || text.trim().length === 0) {
      await ctx.api.editMessageText(
        ctx.chat?.id || ctx.from?.id || 0,
        processingMsg.message_id,
        t('document.extraction_failed', getUserLang(userId))
      );
      await fs.unlink(filePath);
      return;
    }

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

    const { inputTokens, outputTokens, cost } = await tokenizeAndEstimateCost({
      model: `openrouter/${MODELS.CHAT}`,
      input: text
    });
    const tokens = inputTokens + outputTokens;

    const keyboard = new InlineKeyboard()
      .text(t('document.continue', getUserLang(userId)), CALLBACK_ACCEPT)
      .text(t('document.cancel', getUserLang(userId)), CALLBACK_CANCEL);

    const tokenMessage = await ctx.reply(
      t('document.text_analysis', getUserLang(userId), {
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
        pageCount
      });
    }
  } catch (error) {
    console.error('Error processing file:', error);

    if (error instanceof Error) {
      if (error.message.includes('file is too big')) {
        await ctx.reply(t('document.large_file_error', getUserLang(userId)));
        return;
      }
    }

    await ctx.reply(t('document.error_processing', getUserLang(userId)));
  }
}

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
      const chunks = await splitTextIntoChunks(
        `openrouter/${MODELS.CHAT}`,
        task.text
      );

      let allWordPairs: WordPair[] = [];
      let processedChunks = 0;

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

      allWordPairs = Array.from(
        new Map(
          allWordPairs.map((pair) => [JSON.stringify(pair), pair])
        ).values()
      );

      await ctx.api.editMessageText(
        ctx.chat?.id || userId,
        task.messageId,
        t('document.creating_deck', userLang, { count: allWordPairs.length }),
        { reply_markup: undefined }
      );

      store.setLastWordPairs(allWordPairs);
      const userDir = await ensureUserDir(userId);
      const deckName = `Hungarian Vocabulary - ${new Date().toLocaleDateString()}`;
      const buffer = await createAnkiDeck(deckName, allWordPairs, userId);
      const deckPath = path.join(userDir, `hungarian_${Date.now()}.apkg`);
      await fs.writeFile(deckPath, buffer);

      const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);

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

      await ctx.replyWithDocument(new InputFile(deckPath), {
        caption: t('document.deck_ready', userLang, {
          count: allWordPairs.length
        })
      });

      await fs.unlink(task.filePath);
      await fs.unlink(deckPath);
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
    console.error('Error handling callback:', error);
    await ctx.answerCallbackQuery(
      t('document.callback_error', getUserLang(userId))
    );
  }
}
