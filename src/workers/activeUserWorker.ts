/**
 * Worker to manage periodic communication with active users
 */
import { Bot } from 'grammy';
import {
  FRIENDLY_PHRASES,
  INACTIVITY_THRESHOLD_MS,
  PING_INTERVAL_MS
} from '../config';
import { createMainMenu } from '../bot/keyboards';
import { store } from '../store';

/**
 * Start the active user communication worker
 * @param bot - The Telegram bot instance
 */
export function startActiveUserWorker(bot: Bot): NodeJS.Timeout {
  return setInterval(async () => {
    const now = Date.now();
    const activeUsers = store.getActiveUsers();

    for (const [userId, lastActive] of activeUsers.entries()) {
      // Check if the user has been inactive for the threshold period
      if (now - lastActive > INACTIVITY_THRESHOLD_MS) {
        // Select a random friendly phrase
        const phrase =
          FRIENDLY_PHRASES[Math.floor(Math.random() * FRIENDLY_PHRASES.length)];

        try {
          // Get user language
          const userLang = store.getUserLanguage(userId);
          const learningLang = store.getUserLearningLanguage(userId);

          // Send a message to keep the conversation active
          await bot.api.sendMessage(userId, phrase, {
            reply_markup: createMainMenu(userLang, learningLang)
          });

          // Update the user's last active timestamp
          store.setUserActive(userId);
        } catch (err) {
          console.error('Ошибка при пинге пользователя:', err);
          // Remove user if we can't communicate with them
          store.removeActiveUser(userId);
        }
      }
    }
  }, PING_INTERVAL_MS);
}
