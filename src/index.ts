/**
 * Main application entry point
 */
import { Bot } from 'grammy';
import ffmpeg from 'fluent-ffmpeg';
import { TELEGRAM_BOT_TOKEN, FFMPEG_PATH } from './config';
import {
  handleDocumentUpload,
  handleDocumentCallback,
  handleTextMessage,
  handleWorksheetCallback
} from './handlers';
import { startActiveUserWorker, startFileCleanupWorker } from './workers/index';
import { registerSubscriptionHandlers } from './services/subscription';

// Configure external dependencies
ffmpeg.setFfmpegPath(FFMPEG_PATH);

// Initialize bot
const bot = new Bot(TELEGRAM_BOT_TOKEN);

// Register document handlers
bot.on('message:document', handleDocumentUpload);

// Register callback query handlers
bot.on('callback_query:data', (ctx) => {
  // Check the callback data to determine which handler to use
  const data = ctx.callbackQuery.data;

  if (data.startsWith('process_pdf')) {
    // Document processing callbacks
    return handleDocumentCallback(ctx);
  } else if (data.startsWith('worksheet_')) {
    // Worksheet generation callbacks
    return handleWorksheetCallback(ctx);
  }
});

// Register text message handler
bot.on('message:text', handleTextMessage);

// Register subscription handlers
registerSubscriptionHandlers(bot);

// Start workers
const activeUserWorker = startActiveUserWorker(bot);
const fileCleanupWorker = startFileCleanupWorker();

// Start the bot
bot.start().catch((error) => {
  console.error('Error starting bot:', error);
});

console.log('🤖 TanulBot started!');
console.log('🌍 Internationalization enabled (ru/en)');
console.log('💎 Telegram Stars payments enabled');

// Handle application shutdown
process.once('SIGINT', () => {
  console.log('Shutting down...');
  clearInterval(activeUserWorker);
  clearInterval(fileCleanupWorker);
  bot.stop();
});

process.once('SIGTERM', () => {
  console.log('Shutting down...');
  clearInterval(activeUserWorker);
  clearInterval(fileCleanupWorker);
  bot.stop();
});
