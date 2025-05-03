import { Context, InputFile } from 'grammy';
import {
  createMainMenu,
  createDifficultyMenu,
  createDiaryMenu,
  getKeyboardActions,
  createLanguageMenu,
  createDictationMenu,
  createDictationTypeMenu,
  createSubscriptionMenu,
  createLearningLanguageMenu,
  createTopicStudyMenu
} from '../bot/keyboards';
import {
  correctAndReplyWithWords,
  chatCompletion
} from '../services/openai/index';
import { generateDictationPhrasesByDifficulty } from '../services/dictation';
import { getUserLevel, compareHungarianTexts } from '../utils/text';
import { store } from '../store';
import { DictationDifficulty, DictationFormat, UserMode } from '../types';
import {
  processDiaryEntry,
  createAnkiDeck,
  generateLearningSuggestions,
  cleanupAnkiDeckFile
} from '../services/diary';
import {
  t,
  SupportedLanguage,
  SupportedLearningLanguage,
  LEARNING_LANGUAGE_TO_NAME,
  CODE_TO_LANGUAGE
} from '../services/i18n';
import fs from 'fs/promises';
import { CHAT_HISTORY_TOKENS, MAX_CHAT_HISTORY } from '../config';
import {
  createSubscriptionInvoice,
  cancelSubscription,
  getSubscriptionStatus
} from '../services/subscription';
import { handleWorksheetMenu } from './worksheetHandler';
import { getUserLang } from '../utils/handlerUtils';
import {
  DIARY_SUMMARY_LIMIT,
  SUBSCRIPTION_BASIC,
  SUBSCRIPTION_PREMIUM,
  TOPIC_STUDY_CHANGE,
  TOPIC_STUDY_BACK,
  isLanguage
} from '../constants/messageHandler';
import { DatabaseService } from '../services/DatabaseService';
import { sendSplitMessage } from '../utils/message';

// Create a database service instance for logging
const databaseService = new DatabaseService();

/**
 * Handle text messages from users
 * @param ctx - Telegram context
 */
export async function handleTextMessage(ctx: Context): Promise<void> {
  // Extract user ID and message text
  const userId = ctx.from?.id;
  const messageText = ctx.message?.text;

  if (!userId || !messageText) {
    return;
  }

  // Get user's language preference
  const userLang = await getUserLang(userId, ctx.from);
  const learningLang = await store.getUserLearningLanguage(userId, ctx.from);
  const actions = getKeyboardActions(userLang);

  // Handle language selection
  if (isLanguage(messageText)) {
    store.setUserLanguage(userId, 'en');
    await ctx.reply(t('language.changed', 'en'), {
      reply_markup: createMainMenu('en', learningLang)
    });
    return;
  }

  if (isLanguage(messageText)) {
    store.setUserLanguage(userId, 'ru');
    await ctx.reply(t('language.changed', 'ru'), {
      reply_markup: createMainMenu('ru', learningLang)
    });
    return;
  }

  // Handle language menu request
  if (messageText === `🌐 ${userLang.toUpperCase()}`) {
    await ctx.reply(t('language.select', userLang), {
      reply_markup: createLanguageMenu()
    });
    return;
  }

  const tempMode = store.getUserTemporaryData(userId, 'tempMode');

  if (tempMode === 'selecting_language') {
    if (isLanguage(messageText, true)) {
      const selectedLang = messageText as SupportedLearningLanguage;
      store.setUserLearningLanguage(userId, selectedLang);
      store.setUserTemporaryData(userId, 'tempMode', null);
      await ctx.reply(
        t('learning_language.changed', userLang, {
          language: selectedLang
        }),
        {
          reply_markup: createMainMenu(userLang, selectedLang)
        }
      );
      return;
    }
  }

  // Handle learning language menu request
  if (messageText === actions.CHANGE_LEARNING_LANGUAGE) {
    store.setUserTemporaryData(userId, 'tempMode', 'selecting_language');
    await ctx.reply(t('learning_language.select', userLang), {
      reply_markup: createLearningLanguageMenu()
    });
    return;
  }

  // Handle diary mode
  if (messageText === actions.WRITE_DIARY) {
    store.setUserDiaryMode(userId, true);
    await ctx.reply(t('diary.activated', userLang), {
      reply_markup: createDiaryMenu(userLang)
    });
    return;
  }

  if (messageText === actions.STOP_DIARY) {
    store.setUserDiaryMode(userId, false);
    await ctx.reply(t('diary.saved', userLang), {
      reply_markup: createMainMenu(userLang)
    });

    const entries = await store.getUserDiaryEntries(userId);
    if (entries.length > 0) {
      // Process the last entry
      const lastEntry = entries[entries.length - 1];
      const processed = await processDiaryEntry(lastEntry, userLang);

      // Send corrections and suggestions
      await ctx.reply(
        t('diary.processed', userLang, {
          text: processed.correctedText,
          suggestions: processed.improvements.join('\n')
        }),
        { reply_markup: createMainMenu(userLang) }
      );

      // Format mnemonics with additional information
      const mnemonicMessages = processed.mnemonics.map((m) => {
        let message = `📌 <b>${m.word}</b>: ${m.mnemonic}`;

        if (m.exampleSentence) {
          message += `\n   ${t('diary.example', userLang, {
            example: `<i>${m.exampleSentence}</i>`
          })}`;
        }

        if (m.pronunciation) {
          message += `\n   ${t('diary.pronunciation', userLang, {
            pronunciation: m.pronunciation
          })}`;
        }

        return message;
      });

      // Send mnemonics as a separate message with HTML formatting
      if (mnemonicMessages.length > 0) {
        await ctx.reply(
          t('diary.mnemonics', userLang, {
            mnemonics: mnemonicMessages.join('\n\n')
          }),
          { parse_mode: 'HTML', reply_markup: createMainMenu(userLang) }
        );
      }

      // Store processed entry
      store.addProcessedDiaryEntry(userId, processed);
    }

    await ctx.reply(t('general.choose_action', userLang), {
      reply_markup: createMainMenu(userLang)
    });
    return;
  }

  if (messageText === actions.GENERATE_ANKI) {
    const entries = await store.getUserProcessedDiaryEntries(userId);
    if (entries.length === 0) {
      await ctx.reply(t('anki.need_diary', userLang), {
        reply_markup: createMainMenu(userLang)
      });
      return;
    }

    // Show processing message
    await ctx.reply(t('anki.creating', userLang), {
      reply_markup: createMainMenu(userLang)
    });

    try {
      console.log(
        `Starting Anki deck creation for user ${userId} with ${entries.length} entries`
      );

      // Validate userId is a valid integer
      if (isNaN(userId) || !Number.isInteger(userId)) {
        throw new Error(
          `Invalid user ID: ${userId}. User ID must be a valid integer.`
        );
      }

      const ankiDeck = await createAnkiDeck(entries, userId);
      console.log(`Anki deck created successfully: ${ankiDeck.filePath}`);

      const suggestions = await generateLearningSuggestions(entries, userLang);

      // First send the Anki deck file if available
      if (ankiDeck.filePath) {
        console.log(`Sending Anki file to user: ${ankiDeck.filePath}`);
        try {
          // First verify the file exists
          try {
            await fs.access(ankiDeck.filePath);
          } catch (accessError) {
            throw new Error(`File not found at path: ${ankiDeck.filePath}`);
          }

          // Then try to send it
          await ctx.replyWithDocument(
            new InputFile(ankiDeck.filePath, `${ankiDeck.name}.apkg`),
            {
              caption: t('anki.file_caption', userLang, {
                count: ankiDeck.words.length
              })
            }
          );

          // Clean up the file after sending
          await cleanupAnkiDeckFile(ankiDeck.filePath);
        } catch (fileError) {
          console.error('Error sending Anki file:', fileError);
          const errorDetails =
            fileError instanceof Error ? fileError.message : 'Unknown error';
          await ctx.reply(
            t('anki.error', userLang, {
              message: `Error sending the Anki deck file: ${errorDetails}`
            }),
            { reply_markup: createMainMenu(userLang) }
          );
        }
      } else {
        console.warn('No file path in the Anki deck object');
        await ctx.reply(
          t('anki.error', userLang, {
            message:
              'Anki deck was created but the file is not available for download.'
          }),
          { reply_markup: createMainMenu(userLang) }
        );
      }

      // Then send the summary and learning suggestions
      await ctx.reply(
        t('anki.created', userLang, {
          name: ankiDeck.name,
          count: String(ankiDeck.words.length),
          recommendations: suggestions.join('\n')
        }),
        { reply_markup: createMainMenu(userLang) }
      );
    } catch (error) {
      console.error('Error creating Anki deck:', error);
      let errorMessage = 'Sorry, there was an error creating the Anki deck.';

      if (error instanceof Error) {
        errorMessage += ` Reason: ${error.message}`;
        console.error('Detailed error:', error.stack);
      }

      await ctx.reply(t('anki.error', userLang, { message: errorMessage }), {
        reply_markup: createMainMenu(userLang)
      });
    }
    return;
  }

  // Handle topic study menu option
  if (messageText === actions.TOPIC_STUDY) {
    // Set user mode to topic study
    await store.setUserMode(userId, UserMode.TOPIC_STUDY);

    // Ask the user what topic they want to study
    await ctx.reply(t('topic_study.intro', userLang), {
      reply_markup: createMainMenu(userLang, learningLang)
    });
    return;
  }

  // Handle topic study change request
  if (
    messageText === actions.TOPIC_STUDY_CHANGE ||
    messageText === TOPIC_STUDY_CHANGE
  ) {
    // Keep the user in topic study mode but reset their topic
    store.clearUserTemporaryData(userId, 'currentTopic');

    // Ask the user for a new topic
    await ctx.reply(t('topic_study.intro', userLang), {
      reply_markup: createTopicStudyMenu(userLang)
    });
    return;
  }

  // Handle back to main menu from topic study
  if (
    messageText === actions.TOPIC_STUDY_BACK ||
    messageText === TOPIC_STUDY_BACK
  ) {
    // Reset user mode to default
    await store.setUserMode(userId, UserMode.DEFAULT);

    // Clear their topic study temporary data
    store.clearUserTemporaryData(userId, 'currentTopic');

    // Show main menu
    await ctx.reply(t('general.choose_action', userLang), {
      reply_markup: createMainMenu(userLang, learningLang)
    });
    return;
  }

  // Handle /start command
  if (messageText === '/start') {
    store.setUserMode(userId, UserMode.DEFAULT);
    store.setUserDiaryMode(userId, false); // Also disable diary mode on /start

    await ctx.reply(t('general.choose_action', userLang), {
      reply_markup: createMainMenu(userLang, learningLang)
    });
    return;
  }

  if (messageText === actions.BACK_TO_MENU) {
    // Reset user mode to default
    store.setUserMode(userId, UserMode.DEFAULT);
    store.setUserTemporaryData(userId, 'tempMode', null);
    // Also disable diary mode if the user was in diary mode
    store.setUserDiaryMode(userId, false);

    await ctx.reply(t('general.choose_action', userLang), {
      reply_markup: createMainMenu(userLang, learningLang)
    });
    return;
  }

  if (messageText === actions.STOP_DICTATION) {
    store.endDictation(userId);
    await ctx.reply(t('dictation.stopped', userLang), {
      reply_markup: createMainMenu(userLang)
    });
    return;
  }

  if (messageText === actions.MY_ACHIEVEMENTS) {
    const points = await store.getPoints(userId);
    const level = getUserLevel(points);
    await ctx.reply(t('achievements.stats', userLang, { points, level }), {
      reply_markup: createMainMenu(userLang)
    });
    return;
  }

  // Check if user is in topic study mode
  const userMode = await store.getUserMode(userId);
  if (userMode === UserMode.TOPIC_STUDY) {
    // Handle text input for topic study mode
    await handleTopicStudy(ctx, userId, messageText, userLang, learningLang);
    return;
  }

  // Move diary mode text check here, after all menu button handlers
  // Handle diary mode text
  if (await store.isUserInDiaryMode(userId)) {
    const entry = {
      text: messageText,
      date: new Date().toISOString(),
      telegramId: userId
    };
    store.addDiaryEntry(userId, entry);
    await ctx.reply(t('diary.continue', userLang), {
      reply_markup: createDiaryMenu(userLang)
    });
    return;
  }

  // Check for keyboard actions
  if (messageText === actions.PRACTICE_LANGUAGE) {
    store.setUserPracticeMode(userId, true);
    store.clearUserChatHistory(userId); // Start with a clean conversation

    // Add system welcome message to the history as an assistant message
    const welcomeMessage = t('practice.start', userLang, {
      language: t(`language.${learningLang}`, userLang)
    });
    store.addChatMessage(
      userId,
      {
        role: 'assistant',
        content: welcomeMessage,
        timestamp: Date.now()
      },
      MAX_CHAT_HISTORY
    );

    await ctx.reply(welcomeMessage, {
      reply_markup: createMainMenu(userLang, learningLang)
    });
    return;
  }

  // Handle chat history management
  if (messageText === actions.CLEAR_CHAT) {
    store.clearUserChatHistory(userId);
    await ctx.reply(t('chat.cleared', userLang), {
      reply_markup: createMainMenu(userLang, learningLang)
    });
    return;
  }

  if (messageText === actions.VIEW_CHAT) {
    const chatHistory = await store.getUserChatHistory(userId);

    if (chatHistory.length === 0) {
      await ctx.reply(t('chat.empty', userLang), {
        reply_markup: createMainMenu(userLang)
      });
      return;
    }

    // Format chat history for display
    const formattedHistory = chatHistory
      .map((msg, index) => {
        const date = new Date(msg.timestamp);
        const timeStr = `${date.getHours()}:${date
          .getMinutes()
          .toString()
          .padStart(2, '0')}`;
        const role = msg.role === 'user' ? '👤 You' : '🤖 Bot';
        return `${index + 1}. [${timeStr}] ${role}:\n${msg.content.substring(
          0,
          DIARY_SUMMARY_LIMIT
        )}${msg.content.length > DIARY_SUMMARY_LIMIT ? '...' : ''}`;
      })
      .join('\n\n');

    await ctx.reply(`${t('chat.history', userLang)}\n\n${formattedHistory}`, {
      reply_markup: createMainMenu(userLang)
    });
    return;
  }

  if (messageText === actions.START_DICTATION) {
    await ctx.reply(t('dictation.choose_type', userLang), {
      reply_markup: createDictationTypeMenu(userLang)
    });
    return;
  }

  // Handle dictation type selection
  const dictationTypeMap: Record<string, DictationFormat> = {
    [actions.DICTATION_TYPE_WORDS]: 'words',
    [actions.DICTATION_TYPE_PHRASES]: 'phrases',
    [actions.DICTATION_TYPE_STORIES]: 'stories'
  };

  if (Object.keys(dictationTypeMap).includes(messageText)) {
    const dictationType = dictationTypeMap[messageText];
    // Store the selected dictation type in the user session
    store.setUserDictationType(userId, dictationType);

    // Show difficulty selection menu
    await ctx.reply(t('dictation.choose_difficulty', userLang), {
      reply_markup: createDifficultyMenu(userLang)
    });
    return;
  }

  // Handle difficulty selection
  const difficultyMap: Record<string, DictationDifficulty> = {
    [actions.DIFFICULTY_EASY]: 'easy',
    [actions.DIFFICULTY_MEDIUM]: 'medium',
    [actions.DIFFICULTY_HARD]: 'hard'
  };

  if (Object.keys(difficultyMap).includes(messageText)) {
    const difficulty = difficultyMap[messageText];

    // Get the previously selected dictation type
    const dictationState = store.getDictationState(userId);
    const dictationType = dictationState?.format || 'phrases'; // Default to phrases if not set

    // Generate phrases based on difficulty and type
    const phrases = await generateDictationPhrasesByDifficulty(
      difficulty,
      userId,
      dictationType
    );

    store.startDictation(userId, {
      currentIndex: 0,
      phrases,
      points: 0,
      difficulty,
      format: dictationType
    });

    await ctx.reply(t('dictation.start', userLang), {
      reply_markup: createDictationMenu(userLang)
    });
    await ctx.replyWithAudio(new InputFile(phrases[0].audioPath));
    return;
  }

  // View user vocabulary
  if (messageText === actions.VIEW_VOCABULARY) {
    const vocabulary = await store.getUserVocabulary(userId);

    if (vocabulary.length === 0) {
      await ctx.reply(t('vocabulary.empty', userLang), {
        reply_markup: createMainMenu(userLang, learningLang)
      });
      return;
    }

    // Format vocabulary for display
    const formattedWords = vocabulary
      .slice(0, 30) // Limit to 30 words to avoid message size limits
      .map((entry, index) => {
        return `${index + 1}. ${t('vocabulary.word_format', userLang, {
          word: entry.word,
          translation: entry.translation
        })}`;
      })
      .join('\n');

    const totalWords = vocabulary.length;
    const displayedWords = Math.min(totalWords, 30);

    const message =
      `${t('vocabulary.title', userLang, {
        count: totalWords
      })}\n\n${formattedWords}` +
      (totalWords > displayedWords
        ? `\n\n(${t('general.showing_limited', userLang, {
            shown: displayedWords,
            total: totalWords
          })})`
        : '');

    await ctx.reply(message, {
      reply_markup: createMainMenu(userLang, learningLang)
    });
    return;
  }

  // Handle subscription status request
  if (messageText === actions.SUBSCRIPTION_STATUS) {
    await getSubscriptionStatus(ctx);
    await ctx.reply(t('subscription.options', userLang), {
      reply_markup: createSubscriptionMenu(userLang)
    });
    return;
  }

  // Handle Basic subscription purchase
  if (messageText === actions.SUBSCRIBE_BASIC) {
    await createSubscriptionInvoice(ctx, SUBSCRIPTION_BASIC);
    return;
  }

  // Handle Premium subscription purchase
  if (messageText === actions.SUBSCRIBE_PREMIUM) {
    await createSubscriptionInvoice(ctx, SUBSCRIPTION_PREMIUM);
    return;
  }

  // Handle subscription cancellation
  if (messageText === actions.CANCEL_SUBSCRIPTION) {
    await cancelSubscription(ctx);
    return;
  }

  // Handle dictation responses
  if (store.hasDictation(userId)) {
    const state = store.getDictationState(userId);
    if (!state) return;

    const current = state.phrases[state.currentIndex];

    // Check if the answer is correct using improved comparison
    if (compareHungarianTexts(messageText, current.text)) {
      // Award more points for higher difficulties
      const difficultyMultiplier =
        state.difficulty === 'hard' ? 3 : state.difficulty === 'medium' ? 2 : 1;
      const pointsToAdd = 10 * difficultyMultiplier;

      await ctx.reply(t('dictation.correct', userLang), {
        reply_markup: createDictationMenu(userLang)
      });
      state.points += 1;
      store.addPoints(userId, pointsToAdd);
    } else {
      await ctx.reply(
        t('dictation.incorrect', userLang, { text: current.text }),
        { reply_markup: createDictationMenu(userLang) }
      );
    }

    // Move to next phrase
    state.currentIndex += 1;
    store.updateDictationState(userId, { currentIndex: state.currentIndex });

    // Check if dictation is complete
    if (state.currentIndex < state.phrases.length) {
      const next = state.phrases[state.currentIndex];
      await ctx.replyWithAudio(new InputFile(next.audioPath));
    } else {
      const difficultyLabels: Record<DictationDifficulty, string> = {
        hard: t('difficulty.hard', userLang),
        medium: t('difficulty.medium', userLang),
        easy: t('difficulty.easy', userLang)
      };

      const typeLabels: Record<DictationFormat, string> = {
        words: t('dictation.type_label.words', userLang),
        phrases: t('dictation.type_label.phrases', userLang),
        stories: t('dictation.type_label.stories', userLang)
      };

      const difficultyLabel = difficultyLabels[state.difficulty || 'medium'];
      const typeLabel = typeLabels[state.format || 'phrases'];

      await ctx.reply(
        t('dictation.completed', userLang, {
          level: difficultyLabel,
          type: typeLabel,
          points: state.points,
          total: state.phrases.length
        }),
        { reply_markup: createMainMenu(userLang) }
      );
      store.endDictation(userId);
    }
    return;
  }

  // Handle worksheets menu
  if (messageText === actions.WORKSHEETS) {
    await handleWorksheetMenu(ctx);
    return;
  }

  // Handle normal messages
  if (!(await store.isUserInPracticeMode(userId))) {
    await ctx.reply(t('general.choose_action', userLang), {
      reply_markup: createMainMenu(userLang)
    });
    return;
  }

  // Mark the user as active
  store.setUserActive(userId);

  // Save user message to chat history
  store.addChatMessage(
    userId,
    {
      role: 'user',
      content: messageText,
      timestamp: Date.now()
    },
    MAX_CHAT_HISTORY
  );

  // Get recent chat history
  const chatHistory = await store.getUserChatHistory(userId, 10);
  const formattedHistory = chatHistory.slice(0, -1).map((msg) => ({
    role: msg.role,
    content: msg.content
  }));

  // Correct and reply with chat history
  const response = await correctAndReplyWithWords(
    messageText,
    userLang,
    formattedHistory,
    CHAT_HISTORY_TOKENS,
    learningLang,
    userId, // Pass userId for logging
    databaseService // Pass database service for logging
  );

  // Save assistant's reply to chat history
  store.addChatMessage(
    userId,
    {
      role: 'assistant',
      content: response.text,
      timestamp: Date.now()
    },
    MAX_CHAT_HISTORY
  );

  // Save extracted words to user's vocabulary
  if (response.words && response.words.length > 0) {
    response.words.forEach((wordPair) => {
      store.addToVocabulary(userId, {
        word: wordPair.front,
        translation: wordPair.back,
        addedDate: Date.now(),
        errorCount: 0,
        context: messageText // Add original message as context
      });
    });

    // If words were found, add a notification to the reply
    const wordsCount = response.words.length;
    let wordsAddedMsg = '';

    if (wordsCount === 1) {
      wordsAddedMsg = t('vocabulary.word_added', userLang);
    } else if (wordsCount > 1) {
      wordsAddedMsg = t('vocabulary.words_added', userLang, {
        count: wordsCount
      });
    }

    await ctx.reply(
      response.text + (wordsAddedMsg ? '\n\n' + wordsAddedMsg : ''),
      { reply_markup: createMainMenu(userLang) }
    );
  } else {
    await ctx.reply(response.text, { reply_markup: createMainMenu(userLang) });
  }
}

/**
 * Handle topic study interaction
 * @param ctx - Telegram context
 * @param userId - User ID
 * @param messageText - Message text
 * @param userLang - User language
 * @param learningLang - Learning language
 */
async function handleTopicStudy(
  ctx: Context,
  userId: number,
  messageText: string,
  userLang: SupportedLanguage,
  learningLang: SupportedLearningLanguage
): Promise<void> {
  // Check if the user already has a current topic
  const currentTopic = store.getUserTemporaryData(userId, 'currentTopic');
  const userLanguage = CODE_TO_LANGUAGE[userLang];

  if (!currentTopic) {
    // This is the first message - the user is providing the topic they want to study
    // Save the topic
    store.setUserTemporaryData(userId, 'currentTopic', messageText);

    // Inform the user we're preparing the lesson
    await ctx.reply(
      t('topic_study.waiting', userLang, { topic: messageText }),
      { reply_markup: createTopicStudyMenu(userLang) }
    );

    // Generate the lesson using ChatGPT
    try {
      const prompt = `You're the best ${LEARNING_LANGUAGE_TO_NAME[learningLang]} language teacher for ${userLanguage}-speaking people. Your task is to explain topics very clearly and thoroughly. After your explanation, provide 3 exercises to reinforce the well-explained topic. Your explanations should be as clear as possible, with examples and details.
       
Right now, your task is to teach me about the topic "${messageText}"

Use basic HTML formatting: <b>bold</b>, <i>italic</i>, <u>underline</u>, and <pre>code blocks</pre>.
You can create lists with:
<ul>
  <li>Item 1</li>
  <li>Item 2</li>
</ul>

Respond in ${userLanguage} language`;

      // Send typing indicator
      await ctx.api.sendChatAction(userId, 'typing');

      // Get the response from the AI
      const response = await chatCompletion(
        prompt,
        0.7,
        userId,
        databaseService
      );

      // Отправляем ответ, разбивая на части если необходимо
      await sendSplitMessage({
        ctx,
        text: response,
        keyboard: createTopicStudyMenu(userLang),
        parseMode: 'HTML'
      });
    } catch (error) {
      console.error('Error generating topic study lesson:', error);

      // Inform the user about the error
      await ctx.reply(
        `Error: Unable to generate lesson for topic "${messageText}". Please try again or choose another topic.`,
        { reply_markup: createTopicStudyMenu(userLang) }
      );
    }
  } else {
    // User already has a topic - this is a follow-up message/answer to an exercise
    try {
      // Send typing indicator
      await ctx.api.sendChatAction(userId, 'typing');

      // Create a prompt to evaluate the user's answer
      const prompt = `
You are a ${LEARNING_LANGUAGE_TO_NAME[learningLang]} language teacher. The student is learning about "${currentTopic}" and has submitted the following response to an exercise:

"${messageText}"

Evaluate their answer:
1. Provide corrections for any mistakes
2. Explain why those mistakes were made 
3. Give positive feedback on what they did correctly
4. If appropriate, provide a model answer they can study

IMPORTANT REQUIREMENTS:
- Use basic HTML formatting: <b>bold</b>, <i>italic</i>, and <pre>code</pre> for examples
- Respond in ${userLanguage} language only
- Keep your response clear and concise, under 3000 characters if possible
- Format your response in a clear, structured way with sections
`;

      // Get the response from the AI
      const response = await chatCompletion(
        prompt,
        0.7,
        userId,
        databaseService
      );

      // Отправляем ответ, разбивая на части если необходимо
      await sendSplitMessage({
        ctx,
        text: response,
        keyboard: createTopicStudyMenu(userLang),
        parseMode: 'HTML'
      });
    } catch (error) {
      console.error('Error evaluating topic study response:', error);

      // Inform the user about the error
      await ctx.reply(
        `Error: Unable to evaluate your answer. Please try again.`,
        { reply_markup: createTopicStudyMenu(userLang) }
      );
    }
  }
}
