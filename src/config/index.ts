/**
 * Application configuration
 */
import * as dotenv from 'dotenv';
import path from 'path';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import * as fs from 'fs';
import { getSubscriptionPlans } from '../services/i18n';

// Load environment variables
dotenv.config();

// API Keys and Tokens
export const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
export const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;
export const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY!;
export const SENTRY_DSN = process.env.SENTRY_DSN!;

// Paths and Resources
export const TMP_DIR = path.join(process.cwd(), 'tmp');
export const FFMPEG_PATH = ffmpegInstaller.path;
export const AUDIO_PATH = path.join(TMP_DIR, 'audio');

/**
 * Get user-specific directory path
 * @param userId - Telegram user ID
 * @param subDir - Optional subdirectory name
 * @returns Path to user-specific directory
 */
export function getUserDir(userId: number, subDir?: string): string {
  const userDir = path.join(TMP_DIR, `user_${userId}`);
  return subDir ? path.join(userDir, subDir) : userDir;
}

/**
 * Get user-specific audio directory path
 * @param userId - Telegram user ID
 * @returns Path to user-specific audio directory
 */
export function getUserAudioDir(userId: number): string {
  return getUserDir(userId, 'audio');
}

/**
 * Ensure user directory exists and is writable
 * @param userId - Telegram user ID
 * @param subDir - Optional subdirectory name
 * @returns Path to the created directory
 */
export async function ensureUserDir(
  userId: number,
  subDir?: string
): Promise<string> {
  const dirPath = getUserDir(userId, subDir);

  try {
    await fs.promises.mkdir(dirPath, { recursive: true });

    // Verify write access
    const testFile = path.join(dirPath, `.write-test-${Date.now()}.tmp`);
    await fs.promises.writeFile(testFile, 'test');
    await fs.promises.unlink(testFile);

    return dirPath;
  } catch (error) {
    console.error(`Error ensuring user directory ${dirPath}:`, error);
    throw error;
  }
}

// Create necessary directories on startup
try {
  // Ensure TMP_DIR exists
  if (!fs.existsSync(TMP_DIR)) {
    fs.mkdirSync(TMP_DIR, { recursive: true });
    console.log(`Created directory: ${TMP_DIR}`);
  } else {
    // Verify we have write access to the directory
    const testFile = path.join(TMP_DIR, `.write-test-${Date.now()}.tmp`);
    try {
      fs.writeFileSync(testFile, 'test');
      fs.unlinkSync(testFile);
      console.log(`Verified write access to: ${TMP_DIR}`);
    } catch (writeError) {
      console.error(
        `WARNING: Cannot write to ${TMP_DIR}. File operations may fail!`,
        writeError
      );
    }
  }

  // Ensure AUDIO_PATH exists
  if (!fs.existsSync(AUDIO_PATH)) {
    fs.mkdirSync(AUDIO_PATH, { recursive: true });
    console.log(`Created directory: ${AUDIO_PATH}`);
  }
} catch (error) {
  console.error('Error creating directories:', error);
}

// Constants
export const FRIENDLY_PHRASES = [
  '🌱 Hogy vagy ma?',
  '📚 Mit tanultál mostanában?',
  '✨ Mesélj egy szép pillanatról!'
];

// User level thresholds
export const USER_LEVELS = {
  BEGINNER: { min: 0, max: 99, label: '🌱 Újonc (Новичок)' },
  STUDENT: { min: 100, max: 299, label: '🎯 Tanuló (Ученик)' },
  ADVANCED: { min: 300, max: 599, label: '🚀 Haladó (Продвинутый)' },
  MASTER: { min: 600, max: Infinity, label: '🏆 Mester (Мастер)' }
};

// Timing configurations
export const INACTIVITY_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes
export const PING_INTERVAL_MS = 60_000; // 1 minute

// Text processing
export const MAX_CHUNK_TOKENS = 5000;
export const MAX_DICTATION_PHRASES = 5;

// Chat history settings
export const MAX_CHAT_HISTORY = 20; // Maximum number of messages to store per user
export const CHAT_HISTORY_TOKENS = 800; // Maximum tokens to include in API requests

// Export subscription plans
export { getSubscriptionPlans };
