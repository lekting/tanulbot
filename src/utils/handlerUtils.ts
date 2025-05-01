import { DEFAULT_LANGUAGE, SupportedLanguage } from '../services/i18n';
import { store } from '../store';

/**
 * Get user language safely handling undefined user IDs
 */
export function getUserLang(userId: number | undefined): SupportedLanguage {
  if (userId === undefined) {
    return DEFAULT_LANGUAGE; // Default to English if no user ID
  }
  return store.getUserLanguage(userId);
}

/**
 * Format file size in human-readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Create a text-based progress bar
 */
export function progressBar(percent: number, length = 10): string {
  const completed = Math.floor(percent / (100 / length));
  const remaining = length - completed;

  return (
    '▓'.repeat(completed) + '░'.repeat(remaining) + ` ${Math.round(percent)}%`
  );
}
