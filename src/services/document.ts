/**
 * Document processing services
 */
import * as fs from 'fs/promises';
import { exec } from 'child_process';
import path from 'path';
import pdfParse from 'pdf-parse';
import axios from 'axios';
import { Package, Deck, Note, Model, Field, Card } from 'anki-apkg-generator';
import { WordPair } from '../types';

// Estimated processing time per page (in seconds)
const OCR_TIME_PER_PAGE = 20; // ~20 seconds per page with OCR
// This constant is unused and can be removed
// const EXTRACTION_TIME_PER_PAGE = 0.5; // ~0.5 second per page for regular extraction

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
export async function downloadFile(url: string, filePath: string): Promise<void> {
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
  languages: string[] = ["rus", "hun", "eng"],
  tessdataDir: string = path.join(process.cwd(), "tessdata")
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
      const languageString = languages.join("+");
      // Convert Windows path to forward slashes
      const normalizedTessdataDir = tessdataDir.replace(/\\/g, '/');
      console.log('Using tessdata directory:', normalizedTessdataDir);
      console.log('Using languages:', languageString);
      
      const ocrProcess = exec(
        `py -m ocrmypdf "${filePath}" "${ocrFilePath}" --force-ocr -l ${languageString} --pdf-renderer sandwich --output-type pdf --pages 1-20 --optimize 1 --deskew --clean --rotate-pages --skip-big 100 --fast-web-view 0 --tesseract-config tessdata-dir="${normalizedTessdataDir}" -v 1`,
        { 
          maxBuffer: 1024 * 1024 * 10, // Increase buffer size to 10MB
          env: { 
            ...process.env, 
            TESSDATA_PREFIX: normalizedTessdataDir,
            TESSERACT_CONFIG: `tessdata-dir=${normalizedTessdataDir}`
          }
        }
      );
      
      // Track the last progress update to avoid too frequent updates
      let lastProgressUpdate = 0;
      let processedPages = new Set<number>();
      let currentPage = 0;
      let processingPages = false;
      
      // Handle stdout data (progress information)
      ocrProcess.stdout?.on('data', (data) => {
        const output = data.toString();
        console.log('OCR stdout:', output);
      });
      
      // Handle stderr data (errors and warnings)
      ocrProcess.stderr?.on('data', (data) => {
        const output = data.toString();
        console.log('OCR stderr:', output);
        
        // Check for "Processing pages" message
        const processingMatch = output.match(/Processing pages (\d+) through (\d+)/);
        if (processingMatch) {
          const startPage = parseInt(processingMatch[1], 10);
          const endPage = parseInt(processingMatch[2], 10);
          processingPages = true;
          
          if (progressCallback) {
            const status = startPage === endPage 
              ? `Начинаем обработку страницы ${startPage}`
              : `Начинаем обработку страниц ${startPage}-${endPage}`;
              
            progressCallback({
              status,
              progress: 0,
              pageCount,
              currentPage: startPage
            });
          }
        }
        
        // Extract page number from the output
        const pageMatch = output.match(/Page\s+(\d+)/);
        if (pageMatch) {
          const pageNum = parseInt(pageMatch[1], 10);
          if (!processedPages.has(pageNum)) {
            processedPages.add(pageNum);
            currentPage = pageNum;
            
            // Calculate progress
            const progress = Math.round((processedPages.size / pageCount) * 100);
            
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
    const processingTime = (Date.now() - startTime) / 1000; // in seconds
    // This variable is calculated but never used
    // const timePerPage = processingTime / pageCount;

    if (progressCallback) {
      await progressCallback({
        status: 'OCR завершен. Извлекаем текст...',
        progress: 80,
        pageCount,
        currentPage: pageCount
      });
    }

    const ocrBuffer = await fs.readFile(ocrFilePath);
    const ocrParsed = await pdfParse(ocrBuffer);
    
    if (progressCallback) {
      await progressCallback({
        status: 'Текст извлечен успешно!',
        progress: 100,
        pageCount
      });
    }
    
    return { text: ocrParsed.text, pageCount, ocrUsed: true };
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
 * @returns Formatted time string
 */
export function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  
  if (minutes === 0) {
    return `${remainingSeconds} сек`;
  }
  
  return `${minutes} мин ${remainingSeconds} сек`;
}

/**
 * Creates an Anki deck from word pairs
 * @param name - Name of the deck
 * @param cards - Array of word pairs to include
 * @returns Buffer containing the deck
 */
export async function createAnkiDeck(name: string, cards: WordPair[]): Promise<Buffer> {
  // Define card fields
  const fields = [
    { name: 'Front' },
    { name: 'Back' }
  ];

  // Create card template
  const card = new Card();
  card.setCss('.card { text-align: center; font-family: Arial; }')
    .setTemplates([
      {
        name: 'Card 1',
        qfmt: '{{Front}}',
        afmt: '{{FrontSide}}<hr id="answer">{{Back}}',
      },
    ]);

  // Create model with the card template
  const model = new Model(card);
  model
    .setName(name)
    .setSticky(true)
    .setFields(fields.map((f, index) => new Field(f.name).setOrd(index)));

  // Create deck
  const deck = new Deck(name);

  // Add cards to deck
  for (const pair of cards) {
    const note = new Note(model);
    note.setFieldsValue([pair.front, pair.back]);
    deck.addNote(note);
  }

  // Create package
  const pkg = new Package(deck);
  const zipData = await pkg.writeToFile();
  
  // Handle different possible return types from writeToFile()
  if (zipData instanceof Buffer) {
    return zipData;
  } else if (typeof zipData === 'string') {
    return Buffer.from(zipData, 'binary');
  } else if (zipData instanceof ArrayBuffer || zipData instanceof Uint8Array) {
    return Buffer.from(zipData);
  } else {
    throw new Error('Unexpected zip data type');
  }
} 