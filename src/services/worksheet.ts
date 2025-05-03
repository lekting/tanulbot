/**
 * Worksheet generation service
 */
import * as fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';
import { ensureUserDir } from '../config';
import { SupportedLearningLanguage } from './i18n';

// Path to the cursive fonts
const FONTS = {
  cursive: [
    {
      name: 'Caveat',
      path: path.join(__dirname, '../../assets/fonts/Caveat-Regular.ttf'),
      supportsExtendedLatin: true
    },
    {
      name: 'CedarvilleCursive',
      path: path.join(
        __dirname,
        '../../assets/fonts/CedarvilleCursive-Regular.ttf'
      ),
      supportsExtendedLatin: true
    },
    {
      name: 'SchoolCursive',
      path: path.join(__dirname, '../../assets/fonts/SchoolCursive.ttf'),
      supportsExtendedLatin: false
    }
  ],
  print: [
    {
      name: 'Helvetica-Bold',
      path: '', // Default PDFKit font, no path needed
      supportsExtendedLatin: true
    }
  ]
};

// Alphabet data by language
export const ALPHABETS: Record<
  SupportedLearningLanguage,
  { letters: string[]; specialCharacters?: string[]; noUppercase?: boolean }
> = {
  hungarian: {
    letters: [
      'A',
      'Á',
      'B',
      'C',
      'Cs',
      'D',
      'Dz',
      'Dzs',
      'E',
      'É',
      'F',
      'G',
      'Gy',
      'H',
      'I',
      'Í',
      'J',
      'K',
      'L',
      'Ly',
      'M',
      'N',
      'Ny',
      'O',
      'Ó',
      'Ö',
      'Ő',
      'P',
      'Q',
      'R',
      'S',
      'Sz',
      'T',
      'Ty',
      'U',
      'Ú',
      'Ü',
      'Ű',
      'V',
      'W',
      'X',
      'Y',
      'Z',
      'Zs'
    ],
    specialCharacters: ['á', 'é', 'í', 'ó', 'ö', 'ő', 'ú', 'ü', 'ű']
  },
  spanish: {
    letters: [
      'A',
      'B',
      'C',
      'D',
      'E',
      'F',
      'G',
      'H',
      'I',
      'J',
      'K',
      'L',
      'M',
      'N',
      'Ñ',
      'O',
      'P',
      'Q',
      'R',
      'S',
      'T',
      'U',
      'V',
      'W',
      'X',
      'Y',
      'Z'
    ],
    specialCharacters: ['á', 'é', 'í', 'ó', 'ú', 'ü', 'ñ', '¿', '¡']
  },
  french: {
    letters: [
      'A',
      'B',
      'C',
      'D',
      'E',
      'F',
      'G',
      'H',
      'I',
      'J',
      'K',
      'L',
      'M',
      'N',
      'O',
      'P',
      'Q',
      'R',
      'S',
      'T',
      'U',
      'V',
      'W',
      'X',
      'Y',
      'Z'
    ],
    specialCharacters: [
      'à',
      'â',
      'ä',
      'æ',
      'ç',
      'é',
      'è',
      'ê',
      'ë',
      'î',
      'ï',
      'ô',
      'œ',
      'ù',
      'û',
      'ü',
      'ÿ'
    ]
  },
  german: {
    letters: [
      'A',
      'B',
      'C',
      'D',
      'E',
      'F',
      'G',
      'H',
      'I',
      'J',
      'K',
      'L',
      'M',
      'N',
      'O',
      'P',
      'Q',
      'R',
      'S',
      'T',
      'U',
      'V',
      'W',
      'X',
      'Y',
      'Z'
    ],
    specialCharacters: ['ä', 'ö', 'ü', 'ß']
  },
  italian: {
    letters: [
      'A',
      'B',
      'C',
      'D',
      'E',
      'F',
      'G',
      'H',
      'I',
      'J',
      'K',
      'L',
      'M',
      'N',
      'O',
      'P',
      'Q',
      'R',
      'S',
      'T',
      'U',
      'V',
      'W',
      'X',
      'Y',
      'Z'
    ],
    specialCharacters: ['à', 'è', 'é', 'ì', 'í', 'î', 'ò', 'ó', 'ù', 'ú']
  }
};

/**
 * Worksheet types
 */
export type WorksheetType =
  | 'alphabet'
  | 'vowels'
  | 'consonants'
  | 'specialChars';

/**
 * Font size options
 */
export type FontSize = 'small' | 'medium' | 'large';

/**
 * Font style options
 */
export type FontStyle = 'print' | 'cursive';

/**
 * Options for worksheet generation
 */
export interface WorksheetOptions {
  type: WorksheetType;
  language: SupportedLearningLanguage;
  fontSize?: FontSize;
  letterCase?: 'uppercase' | 'lowercase' | 'both';
  includeSample?: boolean;
  lineCount?: number;
  fontStyle?: FontStyle;
  fontName?: string; // Optional specific font name
}

/**
 * Register available fonts with a PDFDocument
 * @param doc - PDFDocument instance
 */
function registerFonts(doc: PDFKit.PDFDocument): void {
  // Register all cursive fonts
  for (const fontStyle of Object.keys(FONTS) as FontStyle[]) {
    for (const font of FONTS[fontStyle]) {
      if (font.path && fs.existsSync(font.path)) {
        doc.registerFont(font.name, font.path);
      }
    }
  }
}

/**
 * Get the best font for the given language and style
 * @param fontStyle - Font style to use
 * @param language - Language to support
 * @param fontName - Optional specific font name
 * @returns Font name to use
 */
function getBestFont(
  fontStyle: FontStyle,
  language: SupportedLearningLanguage,
  fontName?: string
): string {
  // Check if the language has special characters
  const hasSpecialCharacters =
    (ALPHABETS[language].specialCharacters ?? []).length > 0;

  // If a specific font is requested and it exists, use it
  if (fontName) {
    const requestedFont = FONTS[fontStyle].find(
      (font) => font.name === fontName
    );
    if (requestedFont) {
      // Check if the requested font supports the language needs
      if (!hasSpecialCharacters || requestedFont.supportsExtendedLatin) {
        return requestedFont.name;
      }
    }
  }

  // Otherwise, find the best font that supports the language
  const fonts = FONTS[fontStyle];

  // For languages with special characters, prefer fonts with extended Latin support
  if (hasSpecialCharacters) {
    const supportedFont = fonts.find((font) => font.supportsExtendedLatin);
    if (supportedFont) {
      return supportedFont.name;
    }
  }

  // Default to the first available font in the requested style
  return fonts[0].name;
}

/**
 * Generate a handwriting worksheet PDF for alphabet practice
 * @param userId - User ID for file storage
 * @param options - Worksheet generation options
 * @returns Path to the generated PDF file
 */
export async function generateWorksheet(
  userId: number,
  options: WorksheetOptions
): Promise<string> {
  // Set cursive as the default font style if not specified
  const opts = {
    ...options,
    fontStyle: options.fontStyle || 'cursive'
  };

  const userDir = await ensureUserDir(userId, 'worksheets');
  const alphabet = ALPHABETS[opts.language];
  let letters: string[] = [];

  switch (opts.type) {
    case 'alphabet':
      letters = [...alphabet.letters];
      break;
    case 'vowels':
      letters = alphabet.letters.filter((l) =>
        /^[AEIOUÁÉÍÓÖŐÚÜŰaeiouáéíóöőúüű]$/i.test(l[0])
      );
      break;
    case 'consonants':
      letters = alphabet.letters.filter(
        (l) => !/^[AEIOUÁÉÍÓÖŐÚÜŰaeiouáéíóöőúüű]$/i.test(l[0])
      );
      break;
    case 'specialChars':
      letters = alphabet.specialCharacters || [];
      break;
  }

  // Force lowercase for languages that don't use uppercase
  if (alphabet.noUppercase || opts.letterCase === 'lowercase') {
    letters = letters.map((l) => l.toLowerCase());
  }

  const headerFontSize =
    opts.fontSize === 'small' ? 30 : opts.fontSize === 'large' ? 50 : 40;
  const practiceFontSize =
    opts.fontSize === 'small' ? 15 : opts.fontSize === 'large' ? 20 : 18;

  const fileName = `${opts.language}_${opts.type}_worksheet_${Date.now()}.pdf`;
  const filePath = path.join(userDir, fileName);
  const doc = new PDFDocument({ size: 'A4', margin: 50, autoFirstPage: false });

  // Register fonts
  registerFonts(doc);

  const stream = fs.createWriteStream(filePath);
  doc.pipe(stream);

  doc.info.Title = `${
    opts.language.charAt(0).toUpperCase() + opts.language.slice(1)
  } ${opts.type} Worksheet`;
  doc.info.Author = 'TanulBot';

  doc.addPage();

  const worksheetType =
    opts.type === 'alphabet'
      ? 'Alphabet'
      : opts.type === 'vowels'
      ? 'Vowels'
      : opts.type === 'consonants'
      ? 'Consonants'
      : 'Special Characters';

  doc
    .font('Helvetica-Bold')
    .fontSize(24)
    .text(
      `${
        opts.language.charAt(0).toUpperCase() + opts.language.slice(1)
      } ${worksheetType} Worksheet`,
      { align: 'center' }
    );
  doc
    .font('Helvetica')
    .fontSize(14)
    .text('Practice tracing these letters:', { align: 'center' });

  // For display letters, respect noUppercase setting
  const displayLetters = alphabet.noUppercase
    ? letters.join(' ')
    : opts.letterCase === 'both'
    ? letters.map((l) => `${l.toUpperCase()}${l.toLowerCase()}`).join(' ')
    : letters.join(' ');

  // Get the best font for this language
  const fontName = getBestFont(opts.fontStyle, opts.language, opts.fontName);

  // Use the appropriate font for display letters
  doc
    .font(fontName)
    .fontSize(headerFontSize / 2)
    .text(displayLetters, { align: 'center' });

  const startY = Math.max(doc.y + 20, 150);
  const gridWidth = doc.page.width - 100;
  const cellSize = 30;
  const marginBottom = 50;
  const footerHeight = 20;
  const availableHeight =
    doc.page.height - startY - marginBottom - footerHeight;

  const rows = Math.floor(availableHeight / cellSize);
  const cols = Math.floor(gridWidth / cellSize);

  doc.lineWidth(0.5).strokeColor('#cccccc');
  for (let i = 0; i <= rows; i++) {
    doc
      .moveTo(50, startY + i * cellSize)
      .lineTo(50 + gridWidth, startY + i * cellSize)
      .stroke();
  }
  for (let i = 0; i <= cols; i++) {
    doc
      .moveTo(50 + i * cellSize, startY)
      .lineTo(50 + i * cellSize, startY + rows * cellSize)
      .stroke();
  }

  let letterIndex = 0;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      let currentLetter = letters[letterIndex % letters.length];

      // Handle case based on noUppercase setting
      if (!alphabet.noUppercase && opts.letterCase === 'both') {
        currentLetter =
          letterIndex % 2 === 0
            ? currentLetter.toUpperCase()
            : currentLetter.toLowerCase();
      }
      letterIndex++;

      const cellX = 50 + col * cellSize;
      const cellY = startY + row * cellSize;
      const textWidth = doc
        .font(fontName)
        .fontSize(practiceFontSize)
        .widthOfString(currentLetter);
      const textHeight = practiceFontSize * 0.8;
      const textX = cellX + (cellSize - textWidth) / 2;
      const textY = cellY + (cellSize - textHeight) / 2;

      // Use the best font for this language
      doc
        .font(fontName)
        .fontSize(practiceFontSize)
        .fillColor('#888888')
        .fillOpacity(0.3);
      doc.text(currentLetter, textX, textY, { continued: false });
    }
  }

  const footerY = startY + rows * cellSize + 10;
  if (footerY + footerHeight <= doc.page.height - marginBottom) {
    doc.fillOpacity(1).fontSize(10).fillColor('#555555');

    // Adjust footer text based on whether language has uppercase
    const footerText = alphabet.noUppercase
      ? `${opts.language.toUpperCase()} - Letter: ${letters[0].toLowerCase()}`
      : `${opts.language.toUpperCase()} - ${worksheetType} Practice`;

    doc.text(footerText, 0, footerY, { align: 'center' });
  }

  doc.end();

  return new Promise((resolve, reject) => {
    stream.on('finish', () => resolve(filePath));
    stream.on('error', reject);
  });
}

export async function generateAlphabetWorkbook(
  userId: number,
  language: SupportedLearningLanguage,
  fontStyle: FontStyle = 'cursive',
  fontName?: string
): Promise<string> {
  const userDir = await ensureUserDir(userId, 'worksheets');
  const fileName = `${language}_alphabet_workbook_${Date.now()}.pdf`;
  const filePath = path.join(userDir, fileName);
  const doc = new PDFDocument({ size: 'A4', margin: 50, autoFirstPage: false });

  // Register fonts
  registerFonts(doc);

  // Get the best font for this language
  const bestFontName = getBestFont(fontStyle, language, fontName);
  const alphabet = ALPHABETS[language];

  const stream = fs.createWriteStream(filePath);
  doc.pipe(stream);

  doc.info.Title = `${
    language.charAt(0).toUpperCase() + language.slice(1)
  } Alphabet Workbook`;
  doc.info.Author = 'TanulBot';

  doc.addPage();
  doc
    .fontSize(24)
    .font('Helvetica-Bold')
    .text(
      `${
        language.charAt(0).toUpperCase() + language.slice(1)
      } Alphabet Practice Workbook`,
      { align: 'center' }
    );
  doc
    .fontSize(14)
    .font('Helvetica')
    .text(
      'Practice writing each letter by tracing over the examples on each page.',
      { align: 'center' }
    );
  doc.fontSize(12).text('How to use this workbook:', { align: 'left' });

  // Adjust instructions based on whether the language has uppercase letters
  if (alphabet.noUppercase) {
    doc.fontSize(10).text('1. Practice each letter on its dedicated page.', {
      indent: 20
    });
  } else {
    doc
      .fontSize(10)
      .text('1. Practice uppercase and lowercase letters on each page.', {
        indent: 20
      });
  }

  doc.text('2. Trace over the gray letters to learn correct shape.', {
    indent: 20
  });
  doc.text('3. Repeat until you can write the letters confidently.', {
    indent: 20
  });

  for (const letter of alphabet.letters) {
    doc.addPage();

    // For languages without uppercase, just show the lowercase letter
    // Otherwise show both uppercase and lowercase
    const displayText = alphabet.noUppercase
      ? letter.toLowerCase()
      : `${letter.toUpperCase()} ${letter.toLowerCase()}`;

    // Use the best font for this language
    doc.font(bestFontName).fontSize(60).text(displayText, 0, 70, {
      align: 'center'
    });

    const startY = Math.max(doc.y + 20, 150);
    const gridWidth = doc.page.width - 100;
    const cellSize = 40;
    const marginBottom = 50;
    const footerHeight = 20;
    const availableHeight =
      doc.page.height - startY - marginBottom - footerHeight;

    const rows = Math.floor(availableHeight / cellSize);
    const cols = Math.floor(gridWidth / cellSize);

    doc.lineWidth(0.5).strokeColor('#cccccc');
    for (let i = 0; i <= rows; i++) {
      doc
        .moveTo(50, startY + i * cellSize)
        .lineTo(50 + gridWidth, startY + i * cellSize)
        .stroke();
    }
    for (let i = 0; i <= cols; i++) {
      doc
        .moveTo(50 + i * cellSize, startY)
        .lineTo(50 + i * cellSize, startY + rows * cellSize)
        .stroke();
    }

    const letterSize = 20;
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        // For languages with no uppercase, always use lowercase
        // Otherwise alternate between upper and lowercase
        const currentLetter = alphabet.noUppercase
          ? letter.toLowerCase()
          : (row + col) % 2 === 0
          ? letter.toUpperCase()
          : letter.toLowerCase();

        const cellX = 50 + col * cellSize;
        const cellY = startY + row * cellSize;
        const textWidth = doc
          .font(bestFontName)
          .fontSize(letterSize)
          .widthOfString(currentLetter);
        const textHeight = letterSize * 0.8;
        const textX = cellX + (cellSize - textWidth) / 2;
        const textY = cellY + (cellSize - textHeight) / 2;

        // Use the best font for this language
        doc
          .font(bestFontName)
          .fontSize(letterSize)
          .fillColor('#888888')
          .fillOpacity(0.3);
        doc.text(currentLetter, textX, textY, { continued: false });
      }
    }

    const footerY = startY + rows * cellSize + 10;
    if (footerY + footerHeight <= doc.page.height - marginBottom) {
      doc.fillOpacity(1).fontSize(10).fillColor('#555555');

      // Adjust footer text based on whether language has uppercase
      const footerText = alphabet.noUppercase
        ? `${language.toUpperCase()} - Letter: ${letter.toLowerCase()}`
        : `${language.toUpperCase()} - Letter: ${letter.toUpperCase()}/${letter.toLowerCase()}`;

      doc.text(footerText, 0, footerY, { align: 'center' });
    }
  }

  doc.end();

  return new Promise((resolve, reject) => {
    stream.on('finish', () => resolve(filePath));
    stream.on('error', reject);
  });
}
