/**
 * Document handler for processing PDF files
 */
import * as fs from 'fs/promises';
import * as path from 'path';
import { Context, InputFile, InlineKeyboard } from 'grammy';
import { TELEGRAM_BOT_TOKEN, TMP_DIR } from '../config';
import { countTokens, estimateCost } from '../utils/text';
import { extractTextFromPdf, downloadFile, createAnkiDeck, formatTime } from '../services/document';
import { extractWordPairs } from '../services/openai/index';
import { store } from '../store';

// Define callback data for buttons
const CALLBACK_ACCEPT = 'process_pdf_accept';
const CALLBACK_CANCEL = 'process_pdf_cancel';

// Telegram file size limits
const MAX_BOT_FILE_SIZE = 20 * 1024 * 1024; // 20MB - Telegram bot API limit

// Store pending document processing tasks
interface PendingTask {
  filePath: string;
  text: string;
  messageId: number;
  pageCount: number;
}

const pendingTasks = new Map<number, PendingTask>();

/**
 * Handle document upload (PDF files)
 * @param ctx - Telegram context
 */
export async function handleDocumentUpload(ctx: Context): Promise<void> {
  try {
    // Get file from message
    const file = ctx.message?.document;
    if (!file) {
      await ctx.reply('⚠️ Файл не найден.');
      return;
    }

    // Check file size
    if (file.file_size && file.file_size > MAX_BOT_FILE_SIZE) {
      // File is too large, provide instructions for handling large files
      const instructionsKeyboard = new InlineKeyboard()
        .url('Как работать с большими файлами', 'https://ocrmypdf.readthedocs.io/en/latest/installation.html');
      
      await ctx.reply(
        '📚 Файл слишком большой для обработки через Telegram Bot API (лимит 20MB).\n\n' +
        'Для обработки больших файлов вы можете:\n' +
        '1. Разделить PDF на несколько меньших файлов\n' +
        '2. Уменьшить размер файла, сжав его\n' +
        '3. Использовать локальную установку OCRmyPDF и скрипты из репозитория\n\n' +
        '📏 Размер вашего файла: ' + formatFileSize(file.file_size),
        { reply_markup: instructionsKeyboard }
      );
      return;
    }

    // Download the file
    const fileId = file.file_id;
    const fileInfo = await ctx.api.getFile(fileId);
    const fileName = file.file_name ?? `temp-${Date.now()}.pdf`;
    const filePath = path.join(TMP_DIR, fileName);
    
    // Get file URL and download
    const fileLink = `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${fileInfo.file_path}`;
    
    // Send initial message
    const processingMsg = await ctx.reply('📥 Загружаем файл...');
    await downloadFile(fileLink, filePath);
    
    // Update message after download
    await ctx.api.editMessageText(
      ctx.chat?.id || ctx.from?.id || 0,
      processingMsg.message_id,
      '🔍 Анализируем PDF и извлекаем текст...'
    );

    // Extract text with OCR if needed, with progress updates
    const { text, pageCount, ocrUsed } = await extractTextFromPdf(filePath, async (info) => {
      try {
        let statusMessage = info.status;
        
        // Add time estimation if available
        if (info.estimatedTimeRemaining) {
          statusMessage += `\n⏱ Примерное время: ${formatTime(info.estimatedTimeRemaining)}`;
        }
        
        // Add page info if available
        if (info.pageCount) {
          if (info.currentPage !== undefined) {
            statusMessage += `\n📄 Страница ${info.currentPage}/${info.pageCount}`;
          } else {
            statusMessage += `\n📄 Всего страниц: ${info.pageCount}`;
          }
        }
        
        // Add progress indicator
        statusMessage += `\n${progressBar(info.progress)}`;
        
        await ctx.api.editMessageText(
          ctx.chat?.id || ctx.from?.id || 0,
          processingMsg.message_id,
          statusMessage
        );
      } catch (error) {
        console.error('Error updating progress:', error);
      }
    });

    // Check if text was extracted
    if (!text || text.trim().length === 0) {
      await ctx.api.editMessageText(
        ctx.chat?.id || ctx.from?.id || 0,
        processingMsg.message_id,
        '⚠️ Не удалось извлечь текст даже после OCR.'
      );
      await fs.unlink(filePath);
      return;
    }

    // Calculate tokens and estimated cost
    const tokens = countTokens(text);
    const cost = estimateCost(tokens);
    
    // Create inline keyboard with accept/cancel buttons
    const keyboard = new InlineKeyboard()
      .text('✅ Продолжить', CALLBACK_ACCEPT)
      .text('❌ Отменить', CALLBACK_CANCEL);
    
    // Final success message with info
    const finalMessage = `📄 Извлечение текста завершено!\n\n` +
      `${ocrUsed ? '🔎 Использован OCR для извлечения текста' : '📝 Текст извлечен напрямую'}\n` +
      `📚 Всего страниц: ${pageCount}\n` +
      `🔤 Извлечено ${tokens} токенов\n` +
      `💰 Оценочная стоимость обработки: $${cost.toFixed(4)}\n\n` +
      `Хотите продолжить обработку?`;
    
    // Update the message
    await ctx.api.editMessageText(
      ctx.chat?.id || ctx.from?.id || 0,
      processingMsg.message_id,
      finalMessage,
      { reply_markup: keyboard }
    );
    
    // Store the pending task
    if (ctx.from?.id) {
      pendingTasks.set(ctx.from.id, {
        filePath,
        text,
        messageId: processingMsg.message_id,
        pageCount
      });
    }

  } catch (error) {
    console.error('Ошибка обработки файла:', error);
    
    // Check for specific error types
    if (error instanceof Error) {
      if (error.message.includes('file is too big')) {
        await ctx.reply(
          '📚 Файл слишком большой для обработки через Telegram Bot API (лимит 20MB).\n\n' +
          'Пожалуйста, разделите файл на части меньше 20MB или используйте локальную установку.'
        );
        return;
      }
    }
    
    await ctx.reply('❌ Произошла ошибка при обработке файла. Пожалуйста, попробуйте снова.');
  }
}

/**
 * Handle button callbacks for document processing
 * @param ctx - Telegram context
 */
export async function handleDocumentCallback(ctx: Context): Promise<void> {
  try {
    // Check if this is a callback query
    if (!ctx.callbackQuery?.data || !ctx.from?.id) return;
    
    const userId = ctx.from.id;
    const data = ctx.callbackQuery.data;
    
    // Get the pending task for this user
    const task = pendingTasks.get(userId);
    if (!task) {
      await ctx.answerCallbackQuery('Задача не найдена или устарела.');
      return;
    }
    
    // Handle the accept action
    if (data === CALLBACK_ACCEPT) {
      await ctx.answerCallbackQuery('Начинаем обработку текста...');
      
      // Update the message to show processing status
      await ctx.api.editMessageText(
        ctx.chat?.id || userId,
        task.messageId,
        '⏳ Обрабатываем текст и создаем карточки...',
        { reply_markup: undefined }
      );
      
      // Start time tracking
      const startTime = Date.now();
      
      // Extract word pairs
      const wordPairs = await extractWordPairs(task.text);
      
      // Update progress
      await ctx.api.editMessageText(
        ctx.chat?.id || userId,
        task.messageId,
        `⏳ Извлечено ${wordPairs.length} слов. Создаем колоду...`,
        { reply_markup: undefined }
      );
      
      store.setLastWordPairs(wordPairs);

      // Create Anki deck
      const buffer = await createAnkiDeck('Hungarian Vocabulary', wordPairs);
      const deckPath = path.join(TMP_DIR, 'hungarian.apkg');
      await fs.writeFile(deckPath, buffer);
      
      // Calculate total processing time
      const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);

      // Update final message
      await ctx.api.editMessageText(
        ctx.chat?.id || userId,
        task.messageId,
        `✅ Обработка завершена за ${totalTime} сек!\n` +
        `📄 Обработано страниц: ${task.pageCount}\n` +
        `🔤 Извлечено слов: ${wordPairs.length}\n` +
        `📦 Колода готова к скачиванию.`,
        { reply_markup: undefined }
      );

      // Send deck to user
      await ctx.replyWithDocument(new InputFile(deckPath), { 
        caption: `🎯 Ваша колода Anki готова! Содержит ${wordPairs.length} карточек.` 
      });

      // Clean up files
      await fs.unlink(task.filePath);
      await fs.unlink(deckPath);
      
      // Clean up the task
      pendingTasks.delete(userId);
    }
    // Handle the cancel action
    else if (data === CALLBACK_CANCEL) {
      await ctx.answerCallbackQuery('Операция отменена.');
      
      // Update the message to show cancellation
      await ctx.api.editMessageText(
        ctx.chat?.id || userId,
        task.messageId,
        '❌ Операция отменена.',
        { reply_markup: undefined }
      );
      
      // Clean up file
      await fs.unlink(task.filePath);
      
      // Clean up the task
      pendingTasks.delete(userId);
    }
    
  } catch (error) {
    console.error('Ошибка при обработке кнопки:', error);
    await ctx.answerCallbackQuery('Произошла ошибка при обработке запроса.');
  }
}

/**
 * Create a text-based progress bar
 * @param percent - Percentage completion (0-100)
 * @returns Progress bar string
 */
function progressBar(percent: number): string {
  const completed = Math.floor(percent / 10);
  const remaining = 10 - completed;
  
  return '▓'.repeat(completed) + '░'.repeat(remaining) + ` ${Math.round(percent)}%`;
}

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