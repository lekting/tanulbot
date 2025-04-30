/**
 * Application configuration
 */
import * as dotenv from 'dotenv';
import path from 'path';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import * as fs from 'fs';

// Load environment variables
dotenv.config();

// API Keys and Tokens
export const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
export const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;
export const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY!;

// Paths and Resources
export const TMP_DIR = path.join(process.cwd(), 'tmp');
export const FFMPEG_PATH = ffmpegInstaller.path;
export const AUDIO_PATH = path.join(TMP_DIR, 'audio');

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
      console.error(`WARNING: Cannot write to ${TMP_DIR}. File operations may fail!`, writeError);
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
  "🌱 Hogy vagy ma?",
  "📚 Mit tanultál mostanában?",
  "✨ Mesélj egy szép pillanatról!",
];

// User level thresholds
export const USER_LEVELS = {
  BEGINNER: { min: 0, max: 99, label: "🌱 Újonc (Новичок)" },
  STUDENT: { min: 100, max: 299, label: "🎯 Tanuló (Ученик)" },
  ADVANCED: { min: 300, max: 599, label: "🚀 Haladó (Продвинутый)" },
  MASTER: { min: 600, max: Infinity, label: "🏆 Mester (Мастер)" },
};

// Timing configurations
export const INACTIVITY_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes
export const PING_INTERVAL_MS = 60_000; // 1 minute

// OpenAI cost estimation
export const TOKEN_COST = 0.000005; // cost per token
export const CHARS_PER_TOKEN = 4; // approximate characters per token

// Text processing
export const MAX_CHUNK_TOKENS = 5000;
export const MAX_DICTATION_PHRASES = 5;

// Chat history settings
export const MAX_CHAT_HISTORY = 20;      // Maximum number of messages to store per user
export const CHAT_HISTORY_TOKENS = 800;  // Maximum tokens to include in API requests 