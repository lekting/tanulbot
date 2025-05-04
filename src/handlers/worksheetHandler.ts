/**
 * Worksheet handler for alphabet practice worksheets
 */
import { Context, InlineKeyboard, InputFile } from 'grammy';
import { store } from '../store';
import {
  generateWorksheet,
  generateAlphabetWorkbook,
  WorksheetOptions,
  WorksheetType,
  FontSize,
  FontStyle
} from '../services/worksheet';
import { t, LEARNING_LANGUAGE_TO_NAME } from '../services/i18n';
import {
  CALLBACK_WORKSHEET_TYPE,
  CALLBACK_WORKSHEET_LETTER_CASE,
  CALLBACK_WORKSHEET_SIZE,
  CALLBACK_WORKSHEET_FONT_STYLE,
  CALLBACK_WORKSHEET_GENERATE,
  DEFAULT_LINE_COUNT
} from '../constants/worksheetHandler';
import { getUserLang } from '../utils/handlerUtils';

import * as Sentry from '@sentry/node';

// Import ALPHABETS to check if language supports uppercase
import { ALPHABETS } from '../services/worksheet';

/**
 * Handle worksheet menu action
 * @param ctx - Telegram context
 */
export async function handleWorksheetMenu(ctx: Context): Promise<void> {
  const userId = ctx.from?.id;
  if (!userId) return;

  const userLang = await getUserLang(userId);
  const learningLanguage = await store.getUserLearningLanguage(userId);

  // Create keyboard with worksheet type options
  const keyboard = new InlineKeyboard()
    .text(
      t('worksheet.type.alphabet', userLang),
      `${CALLBACK_WORKSHEET_TYPE}alphabet`
    )
    .row()
    .text(
      t('worksheet.type.vowels', userLang),
      `${CALLBACK_WORKSHEET_TYPE}vowels`
    )
    .row()
    .text(
      t('worksheet.type.consonants', userLang),
      `${CALLBACK_WORKSHEET_TYPE}consonants`
    )
    .row()
    .text(
      t('worksheet.type.special', userLang),
      `${CALLBACK_WORKSHEET_TYPE}specialChars`
    )
    .row()
    .text(
      t('worksheet.type.full_workbook', userLang),
      `${CALLBACK_WORKSHEET_GENERATE}workbook`
    );

  await ctx.reply(
    t('worksheet.select_type', userLang, {
      language: LEARNING_LANGUAGE_TO_NAME[learningLanguage]
    }),
    { reply_markup: keyboard }
  );
}

/**
 * Handle worksheet callback queries
 * @param ctx - Telegram context
 */
export async function handleWorksheetCallback(ctx: Context): Promise<void> {
  // Ensure we have a callback query
  if (!ctx.callbackQuery?.data) return;

  const userId = ctx.from?.id;
  if (!userId) return;

  const userLang = await getUserLang(userId);
  const learningLanguage = await store.getUserLearningLanguage(userId);
  const data = ctx.callbackQuery.data;

  // Check if the language has uppercase letters
  const hasNoUppercase = ALPHABETS[learningLanguage]?.noUppercase === true;

  // Handle worksheet type selection
  if (data.startsWith(CALLBACK_WORKSHEET_TYPE)) {
    const type = data.replace(CALLBACK_WORKSHEET_TYPE, '') as WorksheetType;

    // Save the selected type in temporary storage
    store.setUserTemporaryData(userId, 'worksheetType', type);

    // If language doesn't have uppercase letters, skip case selection and set to lowercase
    if (hasNoUppercase) {
      store.setUserTemporaryData(userId, 'worksheetLetterCase', 'lowercase');

      // Show font size options instead
      const keyboard = new InlineKeyboard()
        .text(
          t('worksheet.size.small', userLang),
          `${CALLBACK_WORKSHEET_SIZE}small`
        )
        .row()
        .text(
          t('worksheet.size.medium', userLang),
          `${CALLBACK_WORKSHEET_SIZE}medium`
        )
        .row()
        .text(
          t('worksheet.size.large', userLang),
          `${CALLBACK_WORKSHEET_SIZE}large`
        );

      await ctx.editMessageText(t('worksheet.select_size', userLang), {
        reply_markup: keyboard
      });
      return;
    }

    // Show letter case options (only for languages with uppercase)
    const keyboard = new InlineKeyboard()
      .text(
        t('worksheet.case.uppercase', userLang),
        `${CALLBACK_WORKSHEET_LETTER_CASE}uppercase`
      )
      .row()
      .text(
        t('worksheet.case.lowercase', userLang),
        `${CALLBACK_WORKSHEET_LETTER_CASE}lowercase`
      )
      .row()
      .text(
        t('worksheet.case.both', userLang),
        `${CALLBACK_WORKSHEET_LETTER_CASE}both`
      );

    await ctx.editMessageText(t('worksheet.select_case', userLang), {
      reply_markup: keyboard
    });
    return;
  }

  // Handle letter case selection
  if (data.startsWith(CALLBACK_WORKSHEET_LETTER_CASE)) {
    const letterCase = data.replace(CALLBACK_WORKSHEET_LETTER_CASE, '') as
      | 'uppercase'
      | 'lowercase'
      | 'both';

    // Save the selected letter case in temporary storage
    store.setUserTemporaryData(userId, 'worksheetLetterCase', letterCase);

    // Show font size options
    const keyboard = new InlineKeyboard()
      .text(
        t('worksheet.size.small', userLang),
        `${CALLBACK_WORKSHEET_SIZE}small`
      )
      .row()
      .text(
        t('worksheet.size.medium', userLang),
        `${CALLBACK_WORKSHEET_SIZE}medium`
      )
      .row()
      .text(
        t('worksheet.size.large', userLang),
        `${CALLBACK_WORKSHEET_SIZE}large`
      );

    await ctx.editMessageText(t('worksheet.select_size', userLang), {
      reply_markup: keyboard
    });
    return;
  }

  // Handle font size selection
  if (data.startsWith(CALLBACK_WORKSHEET_SIZE)) {
    const fontSize = data.replace(CALLBACK_WORKSHEET_SIZE, '') as FontSize;

    // Save the selected font size in temporary storage
    store.setUserTemporaryData(userId, 'worksheetFontSize', fontSize);

    // Show font style options
    const keyboard = new InlineKeyboard()
      .text(
        t('worksheet.style.cursive', userLang),
        `${CALLBACK_WORKSHEET_FONT_STYLE}cursive`
      )
      .row()
      .text(
        t('worksheet.style.print', userLang),
        `${CALLBACK_WORKSHEET_FONT_STYLE}print`
      );

    await ctx.editMessageText(t('worksheet.select_font_style', userLang), {
      reply_markup: keyboard
    });
    return;
  }

  // Handle font style selection
  if (data.startsWith(CALLBACK_WORKSHEET_FONT_STYLE)) {
    const fontStyle = data.replace(
      CALLBACK_WORKSHEET_FONT_STYLE,
      ''
    ) as FontStyle;

    // Save the selected font style in temporary storage
    store.setUserTemporaryData(userId, 'worksheetFontStyle', fontStyle);

    // Get previously selected options
    const type = store.getUserTemporaryData(
      userId,
      'worksheetType'
    ) as WorksheetType;
    const letterCase = store.getUserTemporaryData(
      userId,
      'worksheetLetterCase'
    ) as 'uppercase' | 'lowercase' | 'both';
    const fontSize = store.getUserTemporaryData(
      userId,
      'worksheetFontSize'
    ) as FontSize;

    // Show loading message
    await ctx.editMessageText(t('worksheet.generating', userLang));

    try {
      // Generate the worksheet with selected options
      const options: WorksheetOptions = {
        type,
        language: learningLanguage,
        fontSize,
        letterCase,
        fontStyle,
        lineCount: DEFAULT_LINE_COUNT
      };

      const filePath = await generateWorksheet(userId, options);

      // Send the generated worksheet
      await ctx.replyWithDocument(
        new InputFile(filePath, `${learningLanguage}_${type}_worksheet.pdf`),
        {
          caption: t('worksheet.ready', userLang, {
            type: t(`worksheet.type.${type}`, userLang),
            language: LEARNING_LANGUAGE_TO_NAME[learningLanguage]
          })
        }
      );

      // Clear temporary data
      store.clearUserTemporaryData(userId, 'worksheetType');
      store.clearUserTemporaryData(userId, 'worksheetLetterCase');
      store.clearUserTemporaryData(userId, 'worksheetFontSize');
      store.clearUserTemporaryData(userId, 'worksheetFontStyle');
    } catch (error) {
      console.error('Error generating worksheet:', error);
      Sentry.captureException(error);
      await ctx.reply(t('worksheet.error', userLang));
    }
    return;
  }

  // Handle full workbook generation
  if (data === `${CALLBACK_WORKSHEET_GENERATE}workbook`) {
    // Show font style options for the workbook
    const keyboard = new InlineKeyboard()
      .text(
        t('worksheet.style.cursive', userLang),
        `${CALLBACK_WORKSHEET_GENERATE}workbook:cursive`
      )
      .row()
      .text(
        t('worksheet.style.print', userLang),
        `${CALLBACK_WORKSHEET_GENERATE}workbook:print`
      );

    await ctx.editMessageText(t('worksheet.select_font_style', userLang), {
      reply_markup: keyboard
    });
    return;
  }

  // Handle workbook generation with selected font style
  if (data.startsWith(`${CALLBACK_WORKSHEET_GENERATE}workbook:`)) {
    const fontStyle = data.replace(
      `${CALLBACK_WORKSHEET_GENERATE}workbook:`,
      ''
    ) as FontStyle;

    // Show loading message
    await ctx.editMessageText(t('worksheet.generating_workbook', userLang));

    try {
      // Generate the full alphabet workbook with selected font style
      const filePath = await generateAlphabetWorkbook(
        userId,
        learningLanguage,
        fontStyle
      );

      // Send the generated workbook
      await ctx.replyWithDocument(
        new InputFile(filePath, `${learningLanguage}_alphabet_workbook.pdf`),
        {
          caption: t('worksheet.workbook_ready', userLang, {
            language: LEARNING_LANGUAGE_TO_NAME[learningLanguage]
          })
        }
      );
    } catch (error) {
      console.error('Error generating workbook:', error);
      Sentry.captureException(error);
      await ctx.reply(t('worksheet.error', userLang));
    }
    return;
  }
}
