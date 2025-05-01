/**
 * Internationalization (i18n) service
 */

// Supported languages
export type SupportedLanguage = 'en' | 'ru';

export const CODE_TO_LANGUAGE: Record<SupportedLanguage, string> = {
  en: 'English',
  ru: 'Russian'
};

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
    'vocabulary.empty':
      'Your vocabulary is empty. Words will be added as you practice Hungarian in conversations.',
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
    'general.time.seconds': '{seconds} sec',
    'general.time.minutes': '{minutes} min {seconds} sec',
    'general.time.estimated': '⏱ Estimated time: {time}',
    'general.page.current': '📄 Page {current}/{total}',
    'general.page.total': '📄 Total pages: {count}',

    // Diary messages
    'diary.activated':
      'Diary mode activated! 📝\nWrite your text in Hungarian. If you don\'t know a word, write it in English in parentheses.\nExample: "Ma reggel (woke up) és (had breakfast)."\nWhen finished, press "🛑 Finish writing"',
    'diary.saved': 'Diary saved! Processing text...',
    'diary.processed':
      '📝 Your text has been processed:\n\nCorrected text:\n{text}\n\nImprovement suggestions:\n{suggestions}',
    'diary.continue':
      '✅ Text saved! Continue writing or press "🛑 Finish writing"',
    'diary.mnemonics': 'Mnemonic tips for new words:\n\n{mnemonics}',
    'diary.pronunciation': '🔊 Pronunciation: {pronunciation}',
    'diary.example': '💬 Example: {example}',

    // Dictation messages
    'dictation.start': '🎧 Listen and write! Starting dictation!',
    'dictation.correct': '✅ Excellent, correct!',
    'dictation.incorrect': '❌ Incorrect. The correct answer was:\n{text}',
    'dictation.completed':
      '🎯 Dictation completed!\nLevel: {level}\nType: {type}\nYour result: {points}/{total}',
    'dictation.stopped': '⛔ Dictation stopped.',
    'dictation.type.words': '📝 Words',
    'dictation.type.phrases': '📝 Phrases',
    'dictation.type.stories': '📝 Stories',
    'dictation.choose_difficulty': 'Choose difficulty level:',
    'dictation.choose_type': 'Choose dictation type:',
    'dictation.type_label.words': 'Words',
    'dictation.type_label.phrases': 'Phrases',
    'dictation.type_label.stories': 'Stories',

    // Achievements
    'achievements.stats': '🏆 Your points: {points}\n🌟 Level: {level}',

    // Anki messages
    'anki.creating': 'Creating Anki deck... Please wait.',
    'anki.need_diary': 'You need to write in your diary first!',
    'anki.created':
      '🎴 Anki deck created:\nName: {name}\nNumber of words: {count}\n\nLearning recommendations:\n{recommendations}',
    'anki.file_caption': '🎴 Your Anki deck with {count} words is ready!',
    'anki.error': '❌ {message} Please try again.',

    // Practice
    'practice.start':
      "🇭🇺 Hello! I'm ready to chat with you in Hungarian. Just start writing in Hungarian, and I'll respond naturally. If you make mistakes, I'll gently help you learn. Jó beszélgetést! (Good conversation!)",
    'practice.fallback':
      "I understand! Let's continue our conversation in Hungarian. Please try again?",

    // Language
    'language.select': 'Please select your preferred language:',
    'language.changed': 'Language changed to English.',

    // Document processing
    'document.file_not_found': '⚠️ File not found.',
    'document.user_not_identified': '⚠️ Could not identify user.',
    'document.file_too_large':
      '📚 File is too large for processing via Telegram Bot API (20MB limit).\n\nTo process large files you can:\n1. Split the PDF into smaller files\n2. Reduce file size by compressing it\n3. Use local OCRmyPDF installation and scripts from the repository\n\n📏 Your file size: {size}',
    'document.how_to_handle_large_files': 'How to work with large files',
    'document.downloading': '📥 Downloading file...',
    'document.analyzing': '🔍 Analyzing PDF and extracting text...',
    'document.extraction_failed': '⚠️ Failed to extract text even after OCR.',
    'document.extraction_success': '✅ Text successfully extracted!\n{method}',
    'document.extraction_ocr': '🔎 OCR was used to extract text',
    'document.extraction_direct': '📝 Text extracted directly',
    'document.text_analysis':
      '📊 Text analysis:\n\n📚 Total pages: {pages}\n🔤 Extracted {tokens} tokens\n💰 Estimated processing cost: ${cost}\n\nDo you want to continue processing?',
    'document.continue': '✅ Continue',
    'document.cancel': '❌ Cancel',
    'document.task_expired': 'Task not found or expired.',
    'document.processing_start': 'Starting text processing...',
    'document.splitting_text': '⏳ Splitting text into parts for processing...',
    'document.processing_chunk':
      '⏳ Processing part {current}/{total}...\nPart size: {count} tokens',
    'document.creating_deck': '⏳ Extracted {count} words. Creating deck...',
    'document.processing_complete':
      '✅ Processing completed in {time} sec!\n📄 Pages processed: {pages}\n🔤 Words extracted: {words}\n📦 Deck ready for download.',
    'document.deck_ready':
      '🎯 Your Anki deck is ready! Contains {count} cards.',
    'document.operation_cancelled': 'Operation cancelled.',
    'document.operation_cancelled_message': '❌ Operation cancelled.',
    'document.error_processing':
      '❌ An error occurred while processing the file. Please try again.',
    'document.large_file_error':
      '📚 File is too large for processing via Telegram Bot API (20MB limit).\n\nPlease split the file into parts smaller than 20MB or use a local installation.',
    'document.callback_error': 'An error occurred while processing the request.'
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
    'vocabulary.empty':
      'Ваш словарь пуст. Слова будут добавляться в процессе практики венгерского языка в разговорах.',
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
    'general.time.seconds': '{seconds} сек',
    'general.time.minutes': '{minutes} мин {seconds} сек',
    'general.time.estimated': '⏱ Примерное время: {time}',
    'general.page.current': '📄 Страница {current}/{total}',
    'general.page.total': '📄 Всего страниц: {count}',

    // Diary messages
    'diary.activated':
      'Режим дневника активирован! 📝\nПишите текст на венгерском. Если вы не знаете слово, напишите его на русском в скобках.\nПример: "Ma reggel (проснулся) és (позавтракал)."\nКогда закончите, нажмите "🛑 Закончить запись"',
    'diary.saved': 'Дневник сохранен! Обрабатываем текст...',
    'diary.processed':
      '📝 Ваш текст обработан:\n\nИсправленный текст:\n{text}\n\nПредложения по улучшению:\n{suggestions}',
    'diary.continue':
      '✅ Текст сохранен! Продолжайте писать или нажмите "🛑 Закончить запись"',
    'diary.mnemonics': 'Мнемонические подсказки для новых слов:\n\n{mnemonics}',
    'diary.pronunciation': '🔊 Произношение: {pronunciation}',
    'diary.example': '💬 Пример: {example}',

    // Dictation messages
    'dictation.start': '🎧 Слушайте и пишите! Начинаем диктант!',
    'dictation.correct': '✅ Отлично, правильно!',
    'dictation.incorrect': '❌ Неверно. Правильный ответ:\n{text}',
    'dictation.completed':
      '🎯 Диктант завершен!\nУровень: {level}\nТип: {type}\nВаш результат: {points}/{total}',
    'dictation.stopped': '⛔ Диктант остановлен.',
    'dictation.type.words': '📝 Слова',
    'dictation.type.phrases': '📝 Фразы',
    'dictation.type.stories': '📝 Рассказы',
    'dictation.choose_difficulty': 'Выберите уровень сложности:',
    'dictation.choose_type': 'Выберите тип диктанта:',
    'dictation.type_label.words': 'Слова',
    'dictation.type_label.phrases': 'Фразы',
    'dictation.type_label.stories': 'Рассказы',

    // Achievements
    'achievements.stats': '🏆 Ваши баллы: {points}\n🌟 Уровень: {level}',

    // Anki messages
    'anki.creating': 'Создаем колоду Anki... Пожалуйста, подождите.',
    'anki.need_diary': 'Сначала вам нужно написать в дневнике!',
    'anki.created':
      '🎴 Колода Anki создана:\nНазвание: {name}\nКоличество слов: {count}\n\nРекомендации по обучению:\n{recommendations}',
    'anki.file_caption': '🎴 Ваша колода Anki с {count} словами готова!',
    'anki.error': '❌ {message} Пожалуйста, попробуйте еще раз.',

    // Practice
    'practice.start':
      '🇭🇺 Привет! Я готов общаться с вами на венгерском. Просто начните писать на венгерском, и я буду естественно отвечать. Если вы допустите ошибки, я мягко помогу вам научиться. Jó beszélgetést! (Хорошего разговора!)',
    'practice.fallback':
      'Я понимаю! Давайте продолжим наш разговор на венгерском. Попробуете еще раз?',

    // Language
    'language.select': 'Пожалуйста, выберите предпочитаемый язык:',
    'language.changed': 'Язык изменен на русский.',

    // Document processing
    'document.file_not_found': '⚠️ Файл не найден.',
    'document.user_not_identified':
      '⚠️ Не удалось идентифицировать пользователя.',
    'document.file_too_large':
      '📚 Файл слишком большой для обработки через Telegram Bot API (лимит 20MB).\n\nДля обработки больших файлов вы можете:\n1. Разделить PDF на несколько меньших файлов\n2. Уменьшить размер файла, сжав его\n3. Использовать локальную установку OCRmyPDF и скрипты из репозитория\n\n📏 Размер вашего файла: {size}',
    'document.how_to_handle_large_files': 'Как работать с большими файлами',
    'document.downloading': '📥 Загружаем файл...',
    'document.analyzing': '🔍 Анализируем PDF и извлекаем текст...',
    'document.extraction_failed': '⚠️ Не удалось извлечь текст даже после OCR.',
    'document.extraction_success': '✅ Текст успешно извлечён!\n{method}',
    'document.extraction_ocr': '🔎 Использован OCR для извлечения текста',
    'document.extraction_direct': '📝 Текст извлечен напрямую',
    'document.text_analysis':
      '📊 Анализ текста:\n\n📚 Всего страниц: {pages}\n🔤 Извлечено {tokens} токенов\n💰 Оценочная стоимость обработки: ${cost}\n\nХотите продолжить обработку?',
    'document.continue': '✅ Продолжить',
    'document.cancel': '❌ Отменить',
    'document.task_expired': 'Задача не найдена или устарела.',
    'document.processing_start': 'Начинаем обработку текста...',
    'document.splitting_text': '⏳ Разделяем текст на части для обработки...',
    'document.processing_chunk':
      '⏳ Обрабатываем часть {current}/{total}...\nРазмер части: {count} токенов',
    'document.creating_deck': '⏳ Извлечено {count} слов. Создаем колоду...',
    'document.processing_complete':
      '✅ Обработка завершена за {time} сек!\n📄 Обработано страниц: {pages}\n🔤 Извлечено слов: {words}\n📦 Колода готова к скачиванию.',
    'document.deck_ready':
      '🎯 Ваша колода Anki готова! Содержит {count} карточек.',
    'document.operation_cancelled': 'Операция отменена.',
    'document.operation_cancelled_message': '❌ Операция отменена.',
    'document.error_processing':
      '❌ Произошла ошибка при обработке файла. Пожалуйста, попробуйте снова.',
    'document.large_file_error':
      '📚 Файл слишком большой для обработки через Telegram Bot API (лимит 20MB).\n\nПожалуйста, разделите файл на части меньше 20MB или используйте локальную установку.',
    'document.callback_error': 'Произошла ошибка при обработке запроса.'
  }
};

/**
 * Get translation for a key in the specified language
 * @param key - Translation key
 * @param language - Language code
 * @param params - Optional parameters to replace in the translation
 * @returns Translated string
 */
export function t(
  key: string,
  language: SupportedLanguage = DEFAULT_LANGUAGE,
  params?: Record<string, string | number>
): string {
  // Get translation or fallback to key if not found
  const translation =
    translations[language]?.[key] ||
    translations[DEFAULT_LANGUAGE]?.[key] ||
    key;

  // Replace parameters if provided
  if (params) {
    return Object.entries(params).reduce((str, [param, value]) => {
      return str.replace(new RegExp(`{${param}}`, 'g'), String(value));
    }, translation);
  }

  return translation;
}
