/**
 * Telegram bot keyboards
 */
import { Keyboard } from 'grammy';
import {
  SupportedLanguage,
  t,
  DEFAULT_LEARNING_LANGUAGE,
  SupportedLearningLanguage
} from '../services/i18n';

/**
 * Available keyboard action identifiers
 */
export const KEYBOARD_IDS = {
  PRACTICE_LANGUAGE: 'menu.practice',
  CHANGE_LEARNING_LANGUAGE: 'menu.change_learning_language',
  START_DICTATION: 'menu.dictation.start',
  STOP_DICTATION: 'menu.dictation.stop',
  MY_ACHIEVEMENTS: 'menu.achievements',
  HELP: 'menu.help',
  FORMAT_WORDS: 'format.words',
  FORMAT_STORY: 'format.story',
  DIFFICULTY_EASY: 'difficulty.easy',
  DIFFICULTY_MEDIUM: 'difficulty.medium',
  DIFFICULTY_HARD: 'difficulty.hard',
  BACK_TO_MENU: 'menu.back',
  WRITE_DIARY: 'menu.diary.write',
  STOP_DIARY: 'menu.diary.stop',
  GENERATE_ANKI: 'menu.anki',
  LANGUAGE_EN: 'language.en',
  LANGUAGE_RU: 'language.ru',
  CLEAR_CHAT: 'chat.clear',
  VIEW_CHAT: 'chat.view',
  VIEW_VOCABULARY: 'menu.vocabulary',
  WORKSHEETS: 'menu.worksheets',
  DICTATION_TYPE_WORDS: 'dictation.type.words',
  DICTATION_TYPE_PHRASES: 'dictation.type.phrases',
  DICTATION_TYPE_STORIES: 'dictation.type.stories',
  CHOOSE_DIFFICULTY: 'dictation.choose_difficulty',
  TOPIC_STUDY: 'menu.topic_study',
  TOPIC_STUDY_CHANGE: 'topic_study.change',
  TOPIC_STUDY_BACK: 'topic_study.back',

  // Diary menu
  DIARY_MENU: 'menu.diary',
  DIARY_VIEW: 'menu.diary.view',
  DIARY_CLEAR: 'menu.diary.clear',
  DIARY_START: 'menu.diary.start',

  // Subscription actions
  SUBSCRIPTION_STATUS: 'subscription.status',
  SUBSCRIPTION_PLANS: 'subscription.plans',
  SUBSCRIBE_BASIC: 'subscription.basic',
  SUBSCRIBE_PREMIUM: 'subscription.premium',
  CANCEL_SUBSCRIPTION: 'subscription.cancel'
};

/**
 * Get localized keyboard actions
 * @param language - User language
 * @param learningLanguage - User's selected learning language
 * @returns Dictionary of localized keyboard actions
 */
export function getKeyboardActions(
  language: SupportedLanguage,
  learningLanguage: SupportedLearningLanguage = DEFAULT_LEARNING_LANGUAGE
): Record<string, string> {
  return Object.entries(KEYBOARD_IDS).reduce(
    (actions, [key, translationKey]) => {
      // Special case for PRACTICE_LANGUAGE to include the language name
      if (key === 'PRACTICE_LANGUAGE') {
        const langName = t(`language.${learningLanguage}`, language);
        actions[key] = t(translationKey, language, { language: langName });
      } else {
        actions[key] = t(translationKey, language);
      }
      return actions;
    },
    {} as Record<string, string>
  );
}

/**
 * Create main menu keyboard
 * @param language - User language
 * @param learningLanguage - User's selected learning language
 */
export function createMainMenu(
  language: SupportedLanguage,
  learningLanguage: SupportedLearningLanguage = DEFAULT_LEARNING_LANGUAGE
): Keyboard {
  const actions = getKeyboardActions(language, learningLanguage);

  return (
    new Keyboard()
      // Primary learning features
      .text(actions.PRACTICE_LANGUAGE)
      .text(actions.TOPIC_STUDY)
      .row()
      .text(actions.START_DICTATION)
      .text(actions.DIARY_MENU)
      .row()

      // Secondary features
      .text(actions.WORKSHEETS)
      .text(actions.VIEW_VOCABULARY)
      .row()
      .text(actions.MY_ACHIEVEMENTS)
      .text(actions.HELP)
      .row()

      // Chat management
      .text(actions.VIEW_CHAT)
      .text(actions.CLEAR_CHAT)
      .row()

      // Settings
      .text(actions.SUBSCRIPTION_STATUS)
      .row()
      .text(actions.CHANGE_LEARNING_LANGUAGE)
      .text(`🌐 ${language.toUpperCase()}`)
      .resized()
  );
}

/**
 * Create learning language selection keyboard
 */
export function createLearningLanguageMenu(): Keyboard {
  return new Keyboard()
    .text('🇭🇺 Hungarian')
    .text('🇪🇸 Spanish')
    .row()
    .text('🇫🇷 French')
    .text('🇩🇪 German')
    .row()
    .text('🇮🇹 Italian')
    .row()
    .text(t('menu.back'))
    .resized();
}

/**
 * Create subscription menu keyboard
 * @param language - User language
 */
export function createSubscriptionMenu(language: SupportedLanguage): Keyboard {
  const actions = getKeyboardActions(language);

  return new Keyboard()
    .text(actions.SUBSCRIBE_BASIC)
    .text(actions.SUBSCRIBE_PREMIUM)
    .row()
    .text(actions.CANCEL_SUBSCRIPTION)
    .row()
    .text(actions.BACK_TO_MENU)
    .resized();
}

/**
 * Create dictation mode keyboard
 * @param language - User language
 */
export function createDictationMenu(language: SupportedLanguage): Keyboard {
  const actions = getKeyboardActions(language);

  return new Keyboard()
    .text(actions.STOP_DICTATION)
    .row()
    .text(actions.BACK_TO_MENU)
    .resized();
}

/**
 * Create diary menu keyboard
 * @param language - User language
 */
export function createDiaryMenu(language: SupportedLanguage): Keyboard {
  const actions = getKeyboardActions(language);

  return new Keyboard()
    .text(actions.STOP_DIARY)
    .row()
    .text(actions.BACK_TO_MENU)
    .resized();
}

/**
 * Create diary menu keyboard with all options
 * @param language - User language
 */
export function createDiaryMainMenu(language: SupportedLanguage): Keyboard {
  const actions = getKeyboardActions(language);

  return new Keyboard()
    .text(actions.DIARY_VIEW)
    .row()
    .text(actions.DIARY_START)
    .row()
    .text(actions.GENERATE_ANKI)
    .row()
    .text(actions.DIARY_CLEAR)
    .row()
    .text(actions.BACK_TO_MENU)
    .resized();
}

/**
 * Create format selection keyboard
 * @param language - User language
 */
export function createFormatMenu(language: SupportedLanguage): Keyboard {
  const actions = getKeyboardActions(language);

  return new Keyboard()
    .text(actions.FORMAT_WORDS)
    .text(actions.FORMAT_STORY)
    .row()
    .text(actions.BACK_TO_MENU)
    .resized();
}

/**
 * Create difficulty selection keyboard
 * @param language - User language
 */
export function createDifficultyMenu(language: SupportedLanguage): Keyboard {
  const actions = getKeyboardActions(language);

  return new Keyboard()
    .text(actions.DIFFICULTY_EASY)
    .text(actions.DIFFICULTY_MEDIUM)
    .text(actions.DIFFICULTY_HARD)
    .row()
    .text(actions.BACK_TO_MENU)
    .resized();
}

/**
 * Create language selection keyboard
 */
export function createLanguageMenu(): Keyboard {
  return new Keyboard()
    .text('🇬🇧 English')
    .text('🇷🇺 Русский')
    .row()
    .text(t('menu.back'))
    .resized();
}

/**
 * Create dictation type selection keyboard
 * @param language - User language
 */
export function createDictationTypeMenu(language: SupportedLanguage): Keyboard {
  const actions = getKeyboardActions(language);

  return new Keyboard()
    .text(actions.DICTATION_TYPE_WORDS)
    .text(actions.DICTATION_TYPE_PHRASES)
    .text(actions.DICTATION_TYPE_STORIES)
    .row()
    .text(actions.BACK_TO_MENU)
    .resized();
}

/**
 * Create topic study menu keyboard
 * @param language - User language
 */
export function createTopicStudyMenu(language: SupportedLanguage): Keyboard {
  const actions = getKeyboardActions(language);

  return new Keyboard()
    .text(actions.TOPIC_STUDY_CHANGE)
    .row()
    .text(actions.TOPIC_STUDY_BACK)
    .resized();
}
