/**
 * Telegram bot keyboards
 */
import { Keyboard } from 'grammy';
import { SupportedLanguage, t } from '../services/i18n';

/**
 * Available keyboard action identifiers
 */
export const KEYBOARD_IDS = {
  PRACTICE_HUNGARIAN: 'menu.practice',
  START_DICTATION: 'menu.dictation.start',
  STOP_DICTATION: 'menu.dictation.stop',
  MY_ACHIEVEMENTS: 'menu.achievements',
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
  DICTATION_TYPE_WORDS: 'dictation.type.words',
  DICTATION_TYPE_PHRASES: 'dictation.type.phrases',
  DICTATION_TYPE_STORIES: 'dictation.type.stories',
  CHOOSE_DIFFICULTY: 'dictation.choose_difficulty'
};

/**
 * Get localized keyboard actions
 * @param language - User language
 * @returns Dictionary of localized keyboard actions
 */
export function getKeyboardActions(
  language: SupportedLanguage
): Record<string, string> {
  return Object.entries(KEYBOARD_IDS).reduce(
    (actions, [key, translationKey]) => {
      actions[key] = t(translationKey, language);
      return actions;
    },
    {} as Record<string, string>
  );
}

/**
 * Create main menu keyboard
 * @param language - User language
 */
export function createMainMenu(language: SupportedLanguage): Keyboard {
  const actions = getKeyboardActions(language);

  return new Keyboard()
    .text(actions.PRACTICE_HUNGARIAN)
    .row()
    .text(actions.START_DICTATION)
    .row()
    .text(actions.WRITE_DIARY)
    .text(actions.GENERATE_ANKI)
    .row()
    .text(actions.MY_ACHIEVEMENTS)
    .text(actions.VIEW_VOCABULARY)
    .row()
    .text(actions.VIEW_CHAT)
    .text(actions.CLEAR_CHAT)
    .row()
    .text(`🌐 ${language.toUpperCase()}`)
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
 * Create diary mode keyboard
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
