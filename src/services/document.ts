/**
 * Document processing services
 */
import * as fs from 'fs/promises';
import { exec } from 'child_process';
import path from 'path';
import pdfParse from 'pdf-parse';
import axios from 'axios';
import { WordPair } from '../types';
import { ensureUserDir, TMP_DIR } from '../config';
import { t, SupportedLanguage, DEFAULT_LANGUAGE } from '../services/i18n';

const OCR_TIME_PER_PAGE = 20; // ~20 seconds per page with OCR

/**
 * Parses OCRmyPDF progress output
 * @param output - OCRmyPDF output line
 * @returns Parsed progress information or null if not a progress line
 */
function parseOcrProgress(output: string): {
  percent: number;
  current: number;
  total: number;
  timeRemaining: string;
} | null {
  // Match the OCR progress line format
  const match = output.match(/OCR\s+[╸━]+\s+(\d+)%\s+(\d+)\/(\d+)\s+(.+)/);
  if (!match) return null;

  return {
    percent: parseInt(match[1], 10),
    current: parseInt(match[2], 10),
    total: parseInt(match[3], 10),
    timeRemaining: match[4].trim()
  };
}

/**
 * Downloads a file from a URL
 * @param url - URL to download from
 * @param filePath - Path to save the file
 */
export async function downloadFile(
  url: string,
  filePath: string
): Promise<void> {
  // Using axios for HTTP requests
  const response = await axios.get(url, { responseType: 'arraybuffer' });
  await fs.writeFile(filePath, Buffer.from(response.data));
}

/**
 * Extracts text from a PDF, applies OCR if needed
 * @param filePath - Path to the PDF file
 * @param progressCallback - Optional callback to report progress
 * @param languages - Languages to use for OCR, e.g. ["eng", "rus", "hun"]
 * @param tessdataDir - Path to tessdata directory containing .traineddata files
 * @returns Extracted text and processing info
 */
export async function extractTextFromPdf(
  filePath: string,
  progressCallback?: (info: {
    status: string;
    progress: number;
    estimatedTimeRemaining?: number;
    pageCount?: number;
    currentPage?: number;
  }) => Promise<void>,
  languages: string[] = ['rus', 'hun', 'eng'],
  tessdataDir: string = path.join(process.cwd(), 'tessdata')
): Promise<{ text: string; pageCount: number; ocrUsed: boolean }> {
  // First read the PDF to get page count
  const dataBuffer = await fs.readFile(filePath);
  const parsed = await pdfParse(dataBuffer);
  const pageCount = parsed.numpages || 0;

  // Notify about initial page count
  if (progressCallback) {
    await progressCallback({
      status: 'Начинаем обработку PDF...',
      progress: 0,
      pageCount
    });
  }

  // If enough text was extracted, return it
  if (parsed.text.trim().length > 50) {
    if (progressCallback) {
      await progressCallback({
        status: 'Извлечение текста...',
        progress: 100,
        pageCount
      });
    }
    return { text: parsed.text, pageCount, ocrUsed: false };
  }

  // Otherwise, apply OCR and try again
  const ocrFilePath = filePath.replace('.pdf', '_ocr.pdf');
  const sidecarPath = filePath.replace('.pdf', '_ocr.txt');

  try {
    // Estimate total time based on page count
    const estimatedTotalTime = pageCount * OCR_TIME_PER_PAGE;

    if (progressCallback) {
      await progressCallback({
        status: 'Используем OCR для обработки текста...',
        progress: 5,
        estimatedTimeRemaining: estimatedTotalTime,
        pageCount,
        currentPage: 0
      });
    }

    console.log('Running OCR...');
    const startTime = Date.now();

    // Use a promise to handle the OCR process with progress updates
    await new Promise<void>((resolve, reject) => {
      // Create a child process for OCR with modified command
      const languageString = languages.join('+');
      // Convert Windows path to forward slashes
      const normalizedTessdataDir = tessdataDir.replace(/\\/g, '/');
      console.log('Using tessdata directory:', normalizedTessdataDir);
      console.log('Using languages:', languageString);

      const ocrProcess = exec(
        `py -m ocrmypdf "${filePath}" "${ocrFilePath}" -l ${languageString} --pdf-renderer sandwich --output-type pdf --optimize 0 --rotate-pages --force-ocr --pages 1-50 --sidecar "${sidecarPath}" -v 2`,
        {
          maxBuffer: 1024 * 1024 * 50,
          env: {
            ...process.env,
            TESSDATA_PREFIX: normalizedTessdataDir
          }
        }
      );

      // Track the last progress update to avoid too frequent updates
      let lastProgressUpdate = 0;
      let processedPages = new Set<number>();
      let currentPage = 0;

      // Handle stdout data (progress information)
      ocrProcess.stdout?.on('data', (data) => {
        const output = data.toString();
        console.log('OCR stdout:', output);
      });

      // Handle stderr data (errors and warnings)
      ocrProcess.stderr?.on('data', (data) => {
        const output = data.toString();
        console.log('OCR stderr:', output);

        // Extract page number from the output
        const pageMatch = output.match(/Page\s+(\d+)/);
        if (pageMatch) {
          const pageNum = parseInt(pageMatch[1], 10);
          if (!processedPages.has(pageNum)) {
            processedPages.add(pageNum);
            currentPage = pageNum;

            // Calculate progress
            const progress = Math.round(
              (processedPages.size / pageCount) * 100
            );

            // Only update if at least 1 second has passed since last update
            const now = Date.now();
            if (now - lastProgressUpdate > 1000) {
              lastProgressUpdate = now;

              // Calculate estimated time remaining
              const elapsedTime = (Date.now() - startTime) / 1000;
              const timePerPage = elapsedTime / processedPages.size;
              const remainingPages = pageCount - processedPages.size;
              const estimatedTimeRemaining = timePerPage * remainingPages;

              if (progressCallback) {
                progressCallback({
                  status: `OCR: Страница ${currentPage}/${pageCount}`,
                  progress,
                  estimatedTimeRemaining,
                  pageCount,
                  currentPage
                });
              }
            }
          }
        }
      });

      // Handle process completion
      ocrProcess.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`OCR process exited with code ${code}`));
        }
      });
    });

    console.log('OCR done');

    if (progressCallback) {
      await progressCallback({
        status: 'OCR завершен. Извлекаем текст...',
        progress: 80,
        pageCount,
        currentPage: pageCount
      });
    }

    // Read text from the sidecar file instead of the PDF
    let extractedText = '';
    try {
      extractedText = await fs.readFile(sidecarPath, 'utf-8');
    } catch (error) {
      console.error('Error reading sidecar file:', error);
      // Fallback to original PDF text if sidecar file read fails
      extractedText = parsed.text;
    }

    if (progressCallback) {
      await progressCallback({
        status: 'Текст извлечен успешно!',
        progress: 100,
        pageCount
      });
    }

    return { text: extractedText, pageCount, ocrUsed: true };
  } catch (error) {
    console.error('OCR processing failed:', error);

    if (progressCallback) {
      await progressCallback({
        status: 'Ошибка OCR. Используем исходный текст.',
        progress: 100,
        pageCount
      });
    }

    return { text: parsed.text, pageCount, ocrUsed: false }; // Return original text if OCR fails
  }
}

/**
 * Formats time in minutes and seconds
 * @param seconds - Time in seconds
 * @param language - Language code for translation
 * @returns Formatted time string
 */
export function formatTime(
  seconds: number,
  language: SupportedLanguage = DEFAULT_LANGUAGE
): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);

  if (minutes === 0) {
    return t('general.time.seconds', language, { seconds: remainingSeconds });
  }

  return t('general.time.minutes', language, {
    minutes,
    seconds: remainingSeconds
  });
}

/**
 * Creates an Anki deck from word pairs
 * @param name - Name of the deck
 * @param cards - Array of word pairs to include
 * @param userId - Optional user ID for user-specific file paths
 * @returns Buffer containing the deck
 */
export async function createAnkiDeck(
  name: string,
  cards: WordPair[],
  userId?: number
): Promise<Buffer> {
  console.log(`Creating Anki deck "${name}" with ${cards.length} cards`);

  try {
    // Import required modules
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);
    const path = require('path');

    // We'll use a Python script with genanki instead of the problematic JS library

    // Create a temporary JSON file with the word pairs
    const targetDir = userId ? await ensureUserDir(userId) : TMP_DIR;
    const wordsJsonPath = path.join(targetDir, 'word_pairs.json');
    const outputPath = path.join(targetDir, 'hungarian_words.apkg');

    // Ensure directory exists
    try {
      await fs.access(targetDir);
    } catch (error) {
      await fs.mkdir(targetDir, { recursive: true });
    }

    // Write word pairs to JSON file
    await fs.writeFile(wordsJsonPath, JSON.stringify(cards, null, 2), 'utf-8');

    // Create CSS file with custom styles
    const cssPath = path.join(targetDir, 'anki_styles.css');
    const customCSS = `
    .card {
      font-family: Arial, 'Noto Sans', sans-serif;
      font-size: 22px;
      text-align: center;
      color: #333;
      background-color: #f9f9f9;
      padding: 20px;
      margin: 0;
    }
    .front {
      font-size: 32px;
      font-weight: bold;
      color: #2c3e50;
      margin-bottom: 20px;
      font-family: 'Noto Sans', sans-serif;
    }
    .back {
      font-size: 28px;
      color: #3498db;
      font-family: 'Noto Sans', sans-serif;
    }
    hr {
      border: none;
      height: 1px;
      background-color: #ddd;
      margin: 15px auto;
      width: 80%;
    }
    `;

    await fs.writeFile(cssPath, customCSS, 'utf-8');

    // Get the path to the Python script
    const scriptPath = path.join(process.cwd(), 'create-anki-deck.py');

    // Run the Python script with custom deck name and CSS
    const deckName = `Hungarian Vocabulary - ${new Date().toLocaleDateString()}`;
    const pythonCommand = `python "${scriptPath}" "${wordsJsonPath}" "${outputPath}" --deck-name "${deckName}" --css-file "${cssPath}" --quiet`;
    console.log(`Running Anki deck creation...`);

    const { stdout, stderr } = await execAsync(pythonCommand, {
      env: {
        ...process.env,
        PYTHONIOENCODING: 'utf-8' // Force Python to use UTF-8 for I/O
      }
    });

    // Read the generated Anki package
    const ankiPackage = await fs.readFile(outputPath);
    console.log(`Anki package created, size: ${ankiPackage.length} bytes`);

    // Clean up temporary files
    await fs.unlink(wordsJsonPath);
    await fs.unlink(cssPath);

    return ankiPackage;
  } catch (error) {
    console.error('Error creating Anki package:', error);
    throw error;
  }
}
