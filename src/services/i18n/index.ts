/**
 * Internationalization (i18n) service
 */

// Supported languages
export type SupportedLanguage = 'en' | 'ru';

// Default language
export const DEFAULT_LANGUAGE: SupportedLanguage = 'ru';

// Translation strings for each language
const translations: Record<SupportedLanguage, Record<string, string>> = {
  en: {
    // Menu items
    'menu.practice': '🗣 Practice Hungarian',
    'menu.dictation.start': '✍️ Start dictation',
    'menu.dictation.stop': '🛑 Stop dictation',
    'menu.achievements': '🎯 My achievements',
    'menu.back': '⬅️ Back to menu',
    'menu.diary.write': '📝 Write diary',
    'menu.diary.stop': '🛑 Finish writing',
    'menu.anki': '🎴 Create Anki cards',
    'menu.language': '🌐 Change language',
    'menu.vocabulary': '📚 My vocabulary',

    // Chat management
    'chat.clear': '🗑️ Clear chat history',
    'chat.view': '📜 View chat history',
    'chat.cleared': 'Chat history cleared! Starting a new conversation.',
    'chat.history': 'Your recent chat history:',
    'chat.empty': 'Your chat history is empty.',

    // Vocabulary
    'vocabulary.title': '📚 My vocabulary ({count} words)',
    'vocabulary.empty': 'Your vocabulary is empty. Words will be added as you practice Hungarian in conversations.',
    'vocabulary.word_format': '{word} - {translation}',
    'vocabulary.word_added': '💡 New word added to your vocabulary!',
    'vocabulary.words_added': '💡 {count} new words added to your vocabulary!',

    // Difficulty levels
    'difficulty.easy': '🟢 Easy',
    'difficulty.medium': '🟡 Medium',
    'difficulty.hard': '🔴 Hard',

    // General messages
    'general.choose_action': 'Choose an action from the menu below ⬇️',
    'general.choose_difficulty': 'Choose difficulty level:',
    'general.showing_limited': 'Showing {shown} of {total} items',

    // Diary messages
    'diary.activated': 'Diary mode activated! 📝\nWrite your text in Hungarian. If you don\'t know a word, write it in English in parentheses.\nExample: "Ma reggel (woke up) és (had breakfast)."\nWhen finished, press "🛑 Finish writing"',
    'diary.saved': 'Diary saved! Processing text...',
    'diary.processed': '📝 Your text has been processed:\n\nCorrected text:\n{text}\n\nImprovement suggestions:\n{suggestions}',
    'diary.continue': '✅ Text saved! Continue writing or press "🛑 Finish writing"',
    'diary.mnemonics': 'Mnemonic tips for new words:\n\n{mnemonics}',

    // Dictation messages
    'dictation.start': '🎧 Listen and write! Starting dictation!',
    'dictation.correct': '✅ Excellent, correct!',
    'dictation.incorrect': '❌ Incorrect. The correct answer was:\n{text}',
    'dictation.completed': '🎯 Dictation completed!\nLevel: {level}\nYour result: {points}/{total}',
    'dictation.stopped': '⛔ Dictation stopped.',

    // Achievements
    'achievements.stats': '🏆 Your points: {points}\n🌟 Level: {level}',

    // Anki messages
    'anki.creating': 'Creating Anki deck... Please wait.',
    'anki.need_diary': 'You need to write in your diary first!',
    'anki.created': '🎴 Anki deck created:\nName: {name}\nNumber of words: {count}\n\nLearning recommendations:\n{recommendations}',
    'anki.file_caption': '🎴 Your Anki deck with {count} words is ready!',
    'anki.error': '❌ {message} Please try again.',

    // Practice
    'practice.start': '🇭🇺 Hello! I\'m ready to chat with you in Hungarian. Just start writing in Hungarian, and I\'ll respond naturally. If you make mistakes, I\'ll gently help you learn. Jó beszélgetést! (Good conversation!)',
    
    // Language
    'language.select': 'Please select your preferred language:',
    'language.changed': 'Language changed to English.'
  },
  ru: {
    // Menu items
    'menu.practice': '🗣 Практиковать венгерский',
    'menu.dictation.start': '✍️ Начать диктант',
    'menu.dictation.stop': '🛑 Остановить диктант',
    'menu.achievements': '🎯 Мои достижения',
    'menu.back': '⬅️ Назад в меню',
    'menu.diary.write': '📝 Написать дневник',
    'menu.diary.stop': '🛑 Закончить запись',
    'menu.anki': '🎴 Создать карточки Anki',
    'menu.language': '🌐 Изменить язык',
    'menu.vocabulary': '📚 Мой словарь',

    // Chat management
    'chat.clear': '🗑️ Очистить историю чата',
    'chat.view': '📜 Просмотреть историю чата',
    'chat.cleared': 'История чата очищена! Начинаем новую беседу.',
    'chat.history': 'Ваша недавняя история чата:',
    'chat.empty': 'Ваша история чата пуста.',

    // Vocabulary
    'vocabulary.title': '📚 Мой словарь ({count} слов)',
    'vocabulary.empty': 'Ваш словарь пуст. Слова будут добавляться в процессе практики венгерского языка в разговорах.',
    'vocabulary.word_format': '{word} - {translation}',
    'vocabulary.word_added': '💡 Новое слово добавлено в ваш словарь!',
    'vocabulary.words_added': '💡 {count} новых слов добавлено в ваш словарь!',

    // Difficulty levels
    'difficulty.easy': '🟢 Легкий',
    'difficulty.medium': '🟡 Средний',
    'difficulty.hard': '🔴 Сложный',

    // General messages
    'general.choose_action': 'Выберите действие из меню ниже ⬇️',
    'general.choose_difficulty': 'Выберите уровень сложности:',
    'general.showing_limited': 'Показано {shown} из {total} элементов',

    // Diary messages
    'diary.activated': 'Режим дневника активирован! 📝\nПишите текст на венгерском. Если вы не знаете слово, напишите его на русском в скобках.\nПример: "Ma reggel (проснулся) és (позавтракал)."\nКогда закончите, нажмите "🛑 Закончить запись"',
    'diary.saved': 'Дневник сохранен! Обрабатываем текст...',
    'diary.processed': '📝 Ваш текст обработан:\n\nИсправленный текст:\n{text}\n\nПредложения по улучшению:\n{suggestions}',
    'diary.continue': '✅ Текст сохранен! Продолжайте писать или нажмите "🛑 Закончить запись"',
    'diary.mnemonics': 'Мнемонические подсказки для новых слов:\n\n{mnemonics}',

    // Dictation messages
    'dictation.start': '🎧 Слушайте и пишите! Начинаем диктант!',
    'dictation.correct': '✅ Отлично, правильно!',
    'dictation.incorrect': '❌ Неверно. Правильный ответ:\n{text}',
    'dictation.completed': '🎯 Диктант завершен!\nУровень: {level}\nВаш результат: {points}/{total}',
    'dictation.stopped': '⛔ Диктант остановлен.',

    // Achievements
    'achievements.stats': '🏆 Ваши баллы: {points}\n🌟 Уровень: {level}',

    // Anki messages
    'anki.creating': 'Создаем колоду Anki... Пожалуйста, подождите.',
    'anki.need_diary': 'Сначала вам нужно написать в дневнике!',
    'anki.created': '🎴 Колода Anki создана:\nНазвание: {name}\nКоличество слов: {count}\n\nРекомендации по обучению:\n{recommendations}',
    'anki.file_caption': '🎴 Ваша колода Anki с {count} словами готова!',
    'anki.error': '❌ {message} Пожалуйста, попробуйте еще раз.',

    // Practice
    'practice.start': '🇭🇺 Привет! Я готов общаться с вами на венгерском. Просто начните писать на венгерском, и я буду естественно отвечать. Если вы допустите ошибки, я мягко помогу вам научиться. Jó beszélgetést! (Хорошего разговора!)',
    
    // Language
    'language.select': 'Пожалуйста, выберите предпочитаемый язык:',
    'language.changed': 'Язык изменен на русский.'
  }
};

/**
 * Get translation for a key in the specified language
 * @param key - Translation key
 * @param language - Language code
 * @param params - Optional parameters to replace in the translation
 * @returns Translated string
 */
export function t(key: string, language: SupportedLanguage = DEFAULT_LANGUAGE, params?: Record<string, string | number>): string {
  // Get translation or fallback to key if not found
  const translation = translations[language]?.[key] || translations[DEFAULT_LANGUAGE]?.[key] || key;
  
  // Replace parameters if provided
  if (params) {
    return Object.entries(params).reduce((str, [param, value]) => {
      return str.replace(new RegExp(`{${param}}`, 'g'), String(value));
    }, translation);
  }
  
  return translation;
} 