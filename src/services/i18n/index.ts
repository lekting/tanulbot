/**
 * Internationalization (i18n) service
 */
import { SubscriptionPlan } from '../../types';

// Supported languages
export type SupportedLanguage = 'en' | 'ru';

// Supported learning languages
export type SupportedLearningLanguage =
  | 'hungarian'
  | 'spanish'
  | 'french'
  | 'german'
  | 'italian';

export const CODE_TO_LANGUAGE: Record<SupportedLanguage, string> = {
  en: 'English',
  ru: 'Russian'
};

export const LEARNING_LANGUAGE_TO_NAME: Record<
  SupportedLearningLanguage,
  string
> = {
  hungarian: 'Hungarian',
  spanish: 'Spanish',
  french: 'French',
  german: 'German',
  italian: 'Italian'
};

// Default languages
export const DEFAULT_LANGUAGE: SupportedLanguage = 'ru';
export const DEFAULT_LEARNING_LANGUAGE: SupportedLearningLanguage = 'hungarian';

// Language-specific characters for detection
export const LANGUAGE_SPECIFIC_CHARS: Record<
  SupportedLearningLanguage,
  RegExp
> = {
  hungarian: /[áéíóöőúüű]/i,
  spanish: /[áéíóúüñ¿¡]/i,
  french: /[àâäæçéèêëîïôœùûüÿ]/i,
  german: /[äöüß]/i,
  italian: /[àèéìíîòóùú]/i
};

/**
 * Subscription features for each plan with translations
 */
export const getSubscriptionFeatures = (
  language: SupportedLanguage
): Record<SubscriptionPlan, string[]> => {
  const features = {
    en: {
      free: [
        'Basic dictation exercises',
        'Simple diary corrections',
        'Limited vocabulary tracking',
        'Standard chat history (10 messages)'
      ],
      basic: [
        'Advanced dictation exercises',
        'Detailed diary corrections',
        'Enhanced vocabulary tracking',
        'Extended chat history (20 messages)',
        'Basic Anki deck exports'
      ],
      premium: [
        'Expert dictation exercises with native audio',
        'Comprehensive diary analysis with mnemonics',
        'Full vocabulary management',
        'Unlimited chat history',
        'Custom Anki deck exports',
        'Priority processing'
      ]
    },
    ru: {
      free: [
        'Базовые упражнения диктанта',
        'Простые исправления дневника',
        'Ограниченное отслеживание словаря',
        'Стандартная история чата (10 сообщений)'
      ],
      basic: [
        'Расширенные упражнения диктанта',
        'Детальные исправления дневника',
        'Улучшенное отслеживание словаря',
        'Расширенная история чата (20 сообщений)',
        'Базовый экспорт колод Anki'
      ],
      premium: [
        'Экспертные упражнения диктанта с аудио носителей языка',
        'Комплексный анализ дневника с мнемоническими подсказками',
        'Полное управление словарем',
        'Неограниченная история чата',
        'Настраиваемый экспорт колод Anki',
        'Приоритетная обработка'
      ]
    }
  };

  return {
    free: features[language]?.free || features.en.free,
    basic: features[language]?.basic || features.en.basic,
    premium: features[language]?.premium || features.en.premium
  };
};

// Translation strings for each language
const translations: Record<SupportedLanguage, Record<string, string>> = {
  en: {
    // Menu items
    'menu.practice': '🗣 Practice {language}',
    'menu.change_learning_language': '🔄 Change learning language',
    'menu.dictation.start': '✍️ Start dictation',
    'menu.dictation.stop': '🛑 Stop dictation',
    'menu.achievements': '🎯 My achievements',
    'menu.back': '⬅️ Back to menu',
    'menu.diary.write': '📝 Write diary',
    'menu.diary.stop': '🛑 Finish writing',
    'menu.anki': '🎴 Create Anki cards',
    'menu.language': '🌐 Change language',
    'menu.vocabulary': '📚 My vocabulary',
    'menu.worksheets': '📝 Alphabet Worksheets',

    // Chat management
    'chat.clear': '🗑️ Clear chat history',
    'chat.view': '📜 View chat history',
    'chat.cleared': 'Chat history cleared! Starting a new conversation.',
    'chat.history': 'Your recent chat history:',
    'chat.empty': 'Your chat history is empty.',

    // Vocabulary
    'vocabulary.title': '📚 My vocabulary ({count} words)',
    'vocabulary.empty':
      'Your vocabulary is empty. Words will be added as you practice {language} in conversations.',
    'vocabulary.word_format': '{word} - {translation}',
    'vocabulary.word_added': '💡 New word added to your vocabulary!',
    'vocabulary.words_added': '💡 {count} new words added to your vocabulary!',

    // Learning language
    'learning_language.select': 'Please select a language to learn:',
    'learning_language.changed': 'Learning language changed to {language}.',

    // Language names
    'language.hungarian': 'Hungarian',
    'language.spanish': 'Spanish',
    'language.french': 'French',
    'language.german': 'German',
    'language.italian': 'Italian',

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
    'general.yes': 'Yes',
    'general.no': 'No',

    // Subscription related messages
    'subscription.status_display':
      '💎 Subscription Status\n\nPlan: {plan}\nActive: {active}',
    'subscription.expires': 'Expires: {date}',
    'subscription.features': 'Features included in your plan',
    'subscription.options':
      'Choose a subscription option to upgrade your learning experience:',
    'subscription.basic': '💫 Basic Plan',
    'subscription.premium': '✨ Premium Plan',
    'subscription.cancel': '❌ Cancel Subscription',
    'subscription.success':
      '✅ Your subscription to the {plan} is now active!\nExpires on: {expiry}',
    'subscription.error':
      '❌ An error occurred while processing your payment. Please try again.',
    'subscription.no_active':
      "You don't have an active subscription to cancel.",
    'subscription.cancelled':
      '✅ Your subscription has been cancelled and refunded.',
    'subscription.cancel_error':
      '❌ An error occurred while cancelling your subscription. Please try again.',
    'subscription.status': '💎 Subscription Status',

    // Diary messages
    'diary.activated':
      'Diary mode activated! 📝\nWrite your text in {language}. If you don\'t know a word, write it in English in parentheses.\nExample: "Ma reggel (woke up) és (had breakfast)."\nWhen finished, press "🛑 Finish writing"',
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
      "Hello! I'm ready to chat with you in {language}. Just start writing in {language}, and I'll respond naturally. If you make mistakes, I'll gently help you learn.",
    'practice.fallback':
      "I understand! Let's continue our conversation in {language}. Please try again?",

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
    'document.callback_error':
      'An error occurred while processing the request.',

    // Worksheet related messages
    'worksheet.select_type': 'Select worksheet type for {language}:',
    'worksheet.select_case': 'Select letter case:',
    'worksheet.select_size': 'Select font size:',
    'worksheet.select_font_style': 'Select font style:',
    'worksheet.generating': 'Generating worksheet... Please wait.',
    'worksheet.generating_workbook':
      'Generating complete alphabet workbook... Please wait.',
    'worksheet.ready': 'Your {language} {type} worksheet is ready!',
    'worksheet.workbook_ready': 'Your {language} alphabet workbook is ready!',
    'worksheet.error': '❌ Error generating worksheet. Please try again.',
    'worksheet.type.alphabet': '🔤 Full Alphabet',
    'worksheet.type.vowels': '🔠 Vowels Only',
    'worksheet.type.consonants': '📊 Consonants Only',
    'worksheet.type.special': '📋 Special Characters',
    'worksheet.type.full_workbook': '📚 Complete Workbook (all letters)',
    'worksheet.case.uppercase': 'UPPERCASE',
    'worksheet.case.lowercase': 'lowercase',
    'worksheet.case.both': 'Both Aa',
    'worksheet.size.small': 'Small',
    'worksheet.size.medium': 'Medium',
    'worksheet.size.large': 'Large',
    'worksheet.style.cursive': '✍️ Cursive (Handwriting)',
    'worksheet.style.print': '🔠 Print (Regular)'
  },
  ru: {
    // Menu items
    'menu.practice': '🗣 Практиковать {language}',
    'menu.change_learning_language': '🔄 Изменить изучаемый язык',
    'menu.dictation.start': '✍️ Начать диктант',
    'menu.dictation.stop': '🛑 Остановить диктант',
    'menu.achievements': '🎯 Мои достижения',
    'menu.back': '⬅️ Вернуться в меню',
    'menu.diary.write': '📝 Вести дневник',
    'menu.diary.stop': '🛑 Закончить запись',
    'menu.anki': '🎴 Создать карточки Anki',
    'menu.language': '🌐 Изменить язык',
    'menu.vocabulary': '📚 Мой словарь',
    'menu.worksheets': '📝 Прописи алфавита',

    // Chat management
    'chat.clear': '🗑️ Очистить историю',
    'chat.view': '📜 Посмотреть историю',
    'chat.cleared': 'История чата очищена! Начинаем новый разговор.',
    'chat.history': 'Ваша недавняя история чата:',
    'chat.empty': 'Ваша история чата пуста.',

    // Vocabulary
    'vocabulary.title': '📚 Мой словарь ({count} слов)',
    'vocabulary.empty':
      'Ваш словарь пуст. Слова будут добавляться по мере практики {language} в разговорах.',
    'vocabulary.word_format': '{word} - {translation}',
    'vocabulary.word_added': '💡 Новое слово добавлено в ваш словарь!',
    'vocabulary.words_added': '💡 {count} новых слов добавлено в ваш словарь!',

    // Learning language
    'learning_language.select': 'Пожалуйста, выберите язык для изучения:',
    'learning_language.changed': 'Язык для изучения изменен на {language}.',

    // Language names
    'language.hungarian': 'венгерский',
    'language.spanish': 'испанский',
    'language.french': 'французский',
    'language.german': 'немецкий',
    'language.italian': 'итальянский',

    // Difficulty levels
    'difficulty.easy': '🟢 Легкий',
    'difficulty.medium': '🟡 Средний',
    'difficulty.hard': '🔴 Сложный',

    // General messages
    'general.choose_action': 'Выберите действие в меню ниже ⬇️',
    'general.choose_difficulty': 'Выберите уровень сложности:',
    'general.showing_limited': 'Показано {shown} из {total} элементов',
    'general.time.seconds': '{seconds} сек',
    'general.time.minutes': '{minutes} мин {seconds} сек',
    'general.time.estimated': '⏱ Примерное время: {time}',
    'general.page.current': '📄 Страница {current}/{total}',
    'general.page.total': '📄 Всего страниц: {count}',
    'general.yes': 'Да',
    'general.no': 'Нет',

    // Subscription related messages
    'subscription.status_display':
      '💎 Статус подписки\n\nПлан: {plan}\nАктивна: {active}',
    'subscription.expires': 'Истекает: {date}',
    'subscription.features': 'Возможности вашего плана',
    'subscription.options':
      'Выберите вариант подписки для улучшения вашего обучения:',
    'subscription.basic': '💫 Базовый план',
    'subscription.premium': '✨ Премиум план',
    'subscription.cancel': '❌ Отменить подписку',
    'subscription.success':
      '✅ Ваша подписка на {plan} активирована!\nИстекает: {expiry}',
    'subscription.error':
      '❌ Произошла ошибка при обработке вашего платежа. Пожалуйста, попробуйте еще раз.',
    'subscription.no_active': 'У вас нет активной подписки для отмены.',
    'subscription.cancelled':
      '✅ Ваша подписка была отменена, средства возвращены.',
    'subscription.cancel_error':
      '❌ Произошла ошибка при отмене подписки. Пожалуйста, попробуйте еще раз.',
    'subscription.status': '💎 Статус подписки',

    // Diary messages
    'diary.activated':
      'Режим дневника активирован! 📝\nПишите текст на {language} языке. Если вы не знаете слово, напишите его на русском в скобках.\nПример: "Ma reggel (проснулся) és (позавтракал)."\nКогда закончите, нажмите "🛑 Закончить запись"',
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
      'Привет! Я готов общаться с вами на {language} языке. Просто начните писать на {language}, и я буду отвечать естественно. Если вы сделаете ошибки, я мягко помогу вам учиться.',
    'practice.fallback':
      'Я понимаю! Давайте продолжим наш разговор на {language} языке. Попробуете еще раз?',

    // Language
    'language.select': 'Пожалуйста, выберите ваш предпочитаемый язык:',
    'language.changed': 'Язык изменен на русский.',

    // Document processing
    'document.file_not_found': '⚠️ Файл не найден.',
    'document.user_not_identified':
      '⚠️ Не удалось идентифицировать пользователя.',
    'document.file_too_large':
      '📚 Файл слишком большой для обработки через Telegram Bot API (ограничение 20MB).\n\nЧтобы обработать большие файлы, вы можете:\n1. Разделить PDF на меньшие файлы\n2. Уменьшить размер файла, сжав его\n3. Использовать локальную установку OCRmyPDF и скрипты из репозитория\n\n📏 Размер вашего файла: {size}',
    'document.how_to_handle_large_files': 'Как работать с большими файлами',
    'document.downloading': '📥 Скачивание файла...',
    'document.analyzing': '🔍 Анализ PDF и извлечение текста...',
    'document.extraction_failed': '⚠️ Не удалось извлечь текст даже после OCR.',
    'document.extraction_success': '✅ Текст успешно извлечен!\n{method}',
    'document.extraction_ocr': '🔎 Текст извлечен с помощью OCR',
    'document.extraction_direct': '📝 Текст извлечен напрямую',
    'document.text_analysis':
      '📊 Анализ текста:\n\n📚 Всего страниц: {pages}\n🔤 Извлечено {tokens} токенов\n💰 Оценка стоимости обработки: ${cost}\n\nХотите ли вы продолжить обработку?',
    'document.continue': '✅ Продолжить',
    'document.cancel': '❌ Отменить',
    'document.task_expired': 'Задача не найдена или истекла.',
    'document.processing_start': 'Начало обработки текста...',
    'document.splitting_text': '⏳ Разделение текста на части для обработки...',
    'document.processing_chunk':
      '⏳ Обработка части {current}/{total}...\nРазмер части: {count} токенов',
    'document.creating_deck': '⏳ Извлечено {count} слов. Создаем колоду...',
    'document.processing_complete':
      '✅ Обработка завершена за {time} сек!\n📄 Обработано страниц: {pages}\n🔤 Извлечено слов: {words}\n📦 Колода готова для загрузки.',
    'document.deck_ready':
      '🎯 Ваша колода Anki готова! Содержит {count} карточек.',
    'document.operation_cancelled': 'Операция отменена.',
    'document.operation_cancelled_message': '❌ Операция отменена.',
    'document.error_processing':
      '❌ Произошла ошибка при обработке файла. Пожалуйста, попробуйте еще раз.',
    'document.large_file_error':
      '📚 Файл слишком большой для обработки через Telegram Bot API (ограничение 20MB).\n\nПожалуйста, разделите файл на части меньше 20MB или используйте локальную установку.',
    'document.callback_error': 'Произошла ошибка при обработке запроса.',

    // Worksheet related messages
    'worksheet.select_type': 'Выберите тип прописей для {language}:',
    'worksheet.select_case': 'Выберите регистр букв:',
    'worksheet.select_size': 'Выберите размер шрифта:',
    'worksheet.select_font_style': 'Выберите стиль шрифта:',
    'worksheet.generating': 'Создаю прописи... Пожалуйста, подождите.',
    'worksheet.generating_workbook':
      'Создаю полную тетрадь алфавита... Пожалуйста, подождите.',
    'worksheet.ready': 'Ваши прописи {type} для {language} готовы!',
    'worksheet.workbook_ready': 'Ваша тетрадь алфавита для {language} готова!',
    'worksheet.error':
      '❌ Ошибка при создании прописей. Пожалуйста, попробуйте снова.',
    'worksheet.type.alphabet': '🔤 Весь алфавит',
    'worksheet.type.vowels': '🔠 Только гласные',
    'worksheet.type.consonants': '📊 Только согласные',
    'worksheet.type.special': '📋 Специальные символы',
    'worksheet.type.full_workbook': '📚 Полная тетрадь (все буквы)',
    'worksheet.case.uppercase': 'ЗАГЛАВНЫЕ',
    'worksheet.case.lowercase': 'строчные',
    'worksheet.case.both': 'Оба варианта Аа',
    'worksheet.size.small': 'Маленький',
    'worksheet.size.medium': 'Средний',
    'worksheet.size.large': 'Большой',
    'worksheet.style.cursive': '✍️ Прописью (От руки)',
    'worksheet.style.print': '🔠 Печатный (Обычный)'
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

/**
 * Get subscription plan details with translations
 * @param language - Language code
 * @returns Subscription plan details
 */
export function getSubscriptionPlans(
  language: SupportedLanguage
): Record<
  string,
  { title: string; description: string; price: number; duration: number }
> {
  // Plan pricing and duration (same for all languages)
  const oneMonthDuration = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds

  const plans = {
    en: {
      BASIC: {
        title: 'Basic Plan',
        description: 'Enhance your language learning with advanced features',
        price: 50,
        duration: oneMonthDuration
      },
      PREMIUM: {
        title: 'Premium Plan',
        description: 'Full access to all premium features and priority support',
        price: 300, // 300 Stars (~$3.90)
        duration: oneMonthDuration
      }
    },
    ru: {
      BASIC: {
        title: 'Базовый план',
        description:
          'Расширьте возможности изучения языка с продвинутыми функциями',
        price: 50,
        duration: oneMonthDuration
      },
      PREMIUM: {
        title: 'Премиум план',
        description:
          'Полный доступ ко всем премиум-функциям и приоритетная поддержка',
        price: 300, // 300 Stars (~$3.90)
        duration: oneMonthDuration
      }
    }
  };

  return plans[language] || plans.en;
}
