// Document Handler Constants

// Telegram file size limits (in bytes)
export const MAX_BOT_FILE_SIZE = 20 * 1024 * 1024; // 20MB - Telegram bot API limit

// Callback actions
export const CALLBACK_ACCEPT = 'process_pdf_accept';
export const CALLBACK_CANCEL = 'process_pdf_cancel';

// Progress bar configuration
export const PROGRESS_BAR_LENGTH = 10;
export const PROGRESS_UPDATE_THRESHOLD = 5; // Percentage threshold for progress updates
export const DEBOUNCE_INTERVAL_MS = 1000; // Debounce time in milliseconds

// File processing
export const DEFAULT_OCR_LANGUAGES = ['rus', 'hun', 'eng'];
