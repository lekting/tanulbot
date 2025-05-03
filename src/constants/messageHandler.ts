// Message handler constants

// Language selection values
export const LANG_ENGLISH = '🇬🇧 English';
export const LANG_RUSSIAN = '🇷🇺 Русский';

// Flags for learning languages
export const FLAG_HUNGARIAN = '🇭🇺';
export const FLAG_SPANISH = '🇪🇸';
export const FLAG_FRENCH = '🇫🇷';
export const FLAG_GERMAN = '🇩🇪';
export const FLAG_ITALIAN = '🇮🇹';
export const FLAG_ENGLISH = '🇬🇧';
export const FLAG_RUSSIAN = '🇷🇺';

export const LEARNING_LANGUAGE_LIST = [
  {
    name: 'Hungarian',
    flag: FLAG_HUNGARIAN
  },
  {
    name: 'Spanish',
    flag: FLAG_SPANISH
  },
  {
    name: 'French',
    flag: FLAG_FRENCH
  },
  {
    name: 'German',
    flag: FLAG_GERMAN
  },
  {
    name: 'Italian',
    flag: FLAG_ITALIAN
  },
  {
    name: 'English',
    flag: FLAG_ENGLISH
  },
  {
    name: 'Russian',
    flag: FLAG_RUSSIAN
  }
];

export const isLanguage = (language: string, checkFlag = false): boolean => {
  if (checkFlag) {
    return LEARNING_LANGUAGE_LIST.some(
      (lang) => language.startsWith(lang.flag) && lang.name === language
    );
  }
  return LEARNING_LANGUAGE_LIST.some((lang) => lang.name === language);
};

// Message processing limits
export const DIARY_SUMMARY_LIMIT = 100; // Characters to show in chat history summary before truncating

// Subscription types
export const SUBSCRIPTION_BASIC = 'BASIC';
export const SUBSCRIPTION_PREMIUM = 'PREMIUM';

// Topic study constants
export const TOPIC_STUDY_CHANGE = 'topic_study.change';
export const TOPIC_STUDY_BACK = 'topic_study.back';
