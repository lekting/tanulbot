import { Context } from 'grammy';
import { Keyboard } from 'grammy';

/**
 * Максимальная длина сообщения в Telegram
 */
export const MAX_TELEGRAM_MESSAGE_LENGTH = 4000; // чуть меньше 4096 для безопасности

/**
 * Опции для отправки разделенного сообщения
 */
export interface SendSplitMessageOptions {
  /**
   * Telegram контекст
   */
  ctx: Context;

  /**
   * Текст сообщения для отправки
   */
  text: string;

  /**
   * Клавиатура, которая будет прикреплена к последнему сообщению
   */
  keyboard?: Keyboard;

  /**
   * Режим парсинга сообщения (HTML, Markdown)
   */
  parseMode?: 'HTML' | 'MarkdownV2';

  /**
   * Максимальная длина каждого сообщения
   */
  maxLength?: number;

  /**
   * Автоматически экранировать специальные символы для MarkdownV2
   * По умолчанию: true
   */
  escapeMarkdown?: boolean;
}

/**
 * Символы, которые нужно экранировать в MarkdownV2
 */
const MARKDOWN_ESCAPE_CHARS = [
  '_',
  '*',
  '[',
  ']',
  '(',
  ')',
  '~',
  '`',
  '>',
  '#',
  '+',
  '-',
  '=',
  '|',
  '{',
  '}',
  '.',
  '!'
];

/**
 * Экранирует специальные символы для использования в MarkdownV2
 *
 * @param text Текст для экранирования
 * @returns Экранированный текст
 */
export function escapeMarkdownText(text: string): string {
  let result = text;

  // Сначала экранируем сам символ экранирования
  result = result.replace(/\\/g, '\\\\');

  // Затем экранируем все остальные специальные символы
  for (const char of MARKDOWN_ESCAPE_CHARS) {
    result = result.replace(new RegExp('\\' + char, 'g'), '\\' + char);
  }

  return result;
}

/**
 * Разделяет длинные сообщения на несколько частей и отправляет их
 * Клавиатура будет прикреплена только к последнему сообщению
 *
 * @param options Опции для отправки разделенного сообщения
 * @returns Promise, который резолвится когда все сообщения отправлены
 */
export async function sendSplitMessage(
  options: SendSplitMessageOptions
): Promise<void> {
  const {
    ctx,
    text,
    keyboard,
    parseMode = 'HTML',
    maxLength = MAX_TELEGRAM_MESSAGE_LENGTH,
    escapeMarkdown = true
  } = options;

  // Обрабатываем текст для MarkdownV2 если нужно
  let processedText = text;
  if (parseMode === 'MarkdownV2' && escapeMarkdown) {
    processedText = escapeMarkdownText(text);
  }

  // Если сообщение помещается целиком, отправляем как есть
  if (processedText.length <= maxLength) {
    await ctx.reply(processedText, {
      reply_markup: keyboard,
      parse_mode: parseMode
    });
    return;
  }

  // Разделяем на части
  const chunks = splitTextIntoChunks(processedText, maxLength);

  // Отправляем каждую часть
  for (let i = 0; i < chunks.length; i++) {
    const isLastChunk = i === chunks.length - 1;

    await ctx.reply(chunks[i], {
      reply_markup: isLastChunk ? keyboard : undefined,
      parse_mode: parseMode
    });
  }
}

/**
 * Разделяет текст на части с учетом естественных разделителей
 *
 * @param text Текст для разделения
 * @param maxLength Максимальная длина каждой части
 * @returns Массив частей текста
 */
export function splitTextIntoChunks(
  text: string,
  maxLength: number = MAX_TELEGRAM_MESSAGE_LENGTH
): string[] {
  // Если текст достаточно короткий, возвращаем как есть
  if (text.length <= maxLength) {
    return [text];
  }

  const chunks: string[] = [];
  let remainingText = text;

  // Пока остался текст для обработки
  while (remainingText.length > 0) {
    // Если оставшийся текст помещается целиком
    if (remainingText.length <= maxLength) {
      chunks.push(remainingText);
      break;
    }

    // Ищем хорошее место для разделения
    let chunkSize = maxLength;

    // Сначала ищем двойной перенос строки (параграф)
    const paragraphBreak = remainingText
      .substring(0, chunkSize)
      .lastIndexOf('\n\n');
    if (paragraphBreak > maxLength / 2) {
      chunkSize = paragraphBreak + 2; // Включаем переносы
    } else {
      // Если не нашли, ищем одиночный перенос строки
      const lineBreak = remainingText.substring(0, chunkSize).lastIndexOf('\n');
      if (lineBreak > maxLength / 2) {
        chunkSize = lineBreak + 1; // Включаем перенос
      } else {
        // Если не нашли перенос, ищем конец предложения
        const sentenceBreak = remainingText
          .substring(0, chunkSize)
          .lastIndexOf('. ');
        if (sentenceBreak > maxLength / 2) {
          chunkSize = sentenceBreak + 2; // Включаем точку и пробел
        } else {
          // Если все варианты не подходят, просто разделяем по пробелу
          const spaceBreak = remainingText
            .substring(0, chunkSize)
            .lastIndexOf(' ');
          if (spaceBreak > maxLength / 2) {
            chunkSize = spaceBreak + 1; // Включаем пробел
          }
          // В крайнем случае, просто отрезаем maxLength символов
        }
      }
    }

    // Добавляем часть в результат
    chunks.push(remainingText.substring(0, chunkSize));

    // Обновляем оставшийся текст
    remainingText = remainingText.substring(chunkSize);
  }

  return chunks;
}
