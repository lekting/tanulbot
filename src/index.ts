/**
 * Main application entry point
 */
import { Bot } from 'grammy';
import ffmpeg from 'fluent-ffmpeg';
import { TELEGRAM_BOT_TOKEN, FFMPEG_PATH } from './config';
import {
  handleDocumentUpload,
  handleDocumentCallback,
  handleTextMessage
} from './handlers';
import { startActiveUserWorker, startFileCleanupWorker } from './workers/index';

// Configure external dependencies
ffmpeg.setFfmpegPath(FFMPEG_PATH);

// Initialize bot
const bot = new Bot(TELEGRAM_BOT_TOKEN);

// Register document handlers
bot.on('message:document', handleDocumentUpload);
bot.on('callback_query:data', handleDocumentCallback);

// Register text message handler
bot.on('message:text', handleTextMessage);

// Start workers
const activeUserWorker = startActiveUserWorker(bot);
const fileCleanupWorker = startFileCleanupWorker();

// Start the bot
bot.start().catch((error) => {
  console.error('Error starting bot:', error);
});

console.log('🤖 TanulBot started!');
console.log('🌍 Internationalization enabled (ru/en)');

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
