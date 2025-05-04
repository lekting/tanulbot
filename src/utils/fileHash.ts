/**
 * File hashing utilities
 */
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import {
  HASH_RECORDS_DIR,
  HASH_RECORD_FILENAME,
  EXTRACTED_TEXT_FILENAME,
  HASH_LENGTH
} from '../constants/documentHandler';
import { TMP_DIR } from '../config';
import * as Sentry from '@sentry/node';

/**
 * Generate a hash for a file
 * @param filePath - Path to the file
 * @returns Hash string of the file
 */
export async function generateFileHash(filePath: string): Promise<string> {
  try {
    const fileBuffer = await fs.readFile(filePath);
    const hashSum = crypto.createHash('sha256');
    hashSum.update(fileBuffer);
    return hashSum.digest('hex');
  } catch (error) {
    Sentry.captureException(error);
    console.error(`Error generating hash for ${filePath}:`, error);
    throw error;
  }
}

/**
 * Get filename with hash
 * @param originalFilePath - Original file path
 * @param hash - File hash
 * @returns Filename with hash
 */
export function getHashedFilename(
  originalFilePath: string,
  hash: string
): string {
  const ext = path.extname(originalFilePath);
  const basename = path.basename(originalFilePath, ext);
  const shortenedHash = hash.substring(0, HASH_LENGTH);
  return `${basename}_${shortenedHash}${ext}`;
}

/**
 * Save file hash record
 * @param userId - User ID
 * @param fileHash - File hash
 * @param wordPairCount - Word pair count (for display purposes)
 * @param pageCount - Page count
 * @param ocrUsed - Whether OCR was used
 * @returns Path to the hash record file
 */
export async function saveHashRecord(
  userId: number,
  fileHash: string,
  wordPairCount: number,
  pageCount: number,
  ocrUsed: boolean
): Promise<string> {
  const userDir = path.join(TMP_DIR, `user_${userId}`);
  const hashDir = path.join(userDir, HASH_RECORDS_DIR);

  // Ensure hash directory exists
  await fs.mkdir(hashDir, { recursive: true });

  const hashRecordPath = path.join(
    hashDir,
    HASH_RECORD_FILENAME.replace('{hash}', fileHash)
  );
  const record = {
    hash: fileHash,
    userId,
    processedAt: Date.now(),
    wordPairCount,
    pageCount,
    ocrUsed
  };

  await fs.writeFile(hashRecordPath, JSON.stringify(record, null, 2));
  return hashRecordPath;
}

/**
 * Get hash record if exists
 * @param userId - User ID
 * @param fileHash - File hash
 * @returns Hash record if found, null otherwise
 */
export async function getHashRecord(
  userId: number,
  fileHash: string
): Promise<{
  hash: string;
  userId: number;
  processedAt: number;
  wordPairCount: number;
  pageCount: number;
  ocrUsed: boolean;
} | null> {
  try {
    const userDir = path.join(TMP_DIR, `user_${userId}`);
    const hashDir = path.join(userDir, HASH_RECORDS_DIR);
    const hashRecordPath = path.join(
      hashDir,
      HASH_RECORD_FILENAME.replace('{hash}', fileHash)
    );

    const recordStr = await fs.readFile(hashRecordPath, 'utf-8');
    return JSON.parse(recordStr);
  } catch (error) {
    // If file doesn't exist or can't be read, return null
    return null;
  }
}

/**
 * Save extracted text for a file hash
 * @param userId - User ID
 * @param fileHash - File hash
 * @param extractedText - The extracted text from the document
 */
export async function saveExtractedTextForHash(
  userId: number,
  fileHash: string,
  extractedText: string
): Promise<string> {
  const userDir = path.join(TMP_DIR, `user_${userId}`);
  const hashDir = path.join(userDir, HASH_RECORDS_DIR);

  // Ensure hash directory exists
  await fs.mkdir(hashDir, { recursive: true });

  const textFilePath = path.join(
    hashDir,
    EXTRACTED_TEXT_FILENAME.replace('{hash}', fileHash)
  );
  await fs.writeFile(textFilePath, extractedText, 'utf-8');
  return textFilePath;
}

/**
 * Get extracted text for a file hash
 * @param userId - User ID
 * @param fileHash - File hash
 * @returns Extracted text if found, null otherwise
 */
export async function getExtractedTextForHash(
  userId: number,
  fileHash: string
): Promise<string | null> {
  try {
    const userDir = path.join(TMP_DIR, `user_${userId}`);
    const hashDir = path.join(userDir, HASH_RECORDS_DIR);
    const textFilePath = path.join(
      hashDir,
      EXTRACTED_TEXT_FILENAME.replace('{hash}', fileHash)
    );

    return await fs.readFile(textFilePath, 'utf-8');
  } catch (error) {
    // If file doesn't exist or can't be read, return null
    return null;
  }
}

/**
 * Clean up old hash records older than specified days
 * @param userId - User ID
 * @param olderThanDays - Delete records older than this many days
 * @returns Number of deleted records
 */
export async function cleanupOldHashRecords(
  userId: number,
  olderThanDays: number = 30
): Promise<number> {
  try {
    const userDir = path.join(TMP_DIR, `user_${userId}`);
    const hashDir = path.join(userDir, HASH_RECORDS_DIR);

    // Make sure directory exists
    try {
      await fs.access(hashDir);
    } catch {
      // Directory doesn't exist, nothing to clean
      return 0;
    }

    // Get all JSON files in the hash directory
    const files = await fs.readdir(hashDir);
    const jsonFiles = files.filter((file) => file.endsWith('.json'));

    // Calculate cutoff date
    const now = Date.now();
    const cutoffTime = now - olderThanDays * 24 * 60 * 60 * 1000;

    let deletedCount = 0;

    // Process each hash record
    for (const file of jsonFiles) {
      // Only process record files
      if (file.includes('_words')) {
        continue;
      }

      const filePath = path.join(hashDir, file);

      try {
        // Read the record
        const recordStr = await fs.readFile(filePath, 'utf-8');
        const record = JSON.parse(recordStr);

        // Check if the record is old enough to delete
        if (record.processedAt && record.processedAt < cutoffTime) {
          // Delete the record file
          await fs.unlink(filePath);

          // Delete the associated text file
          const textFilePath = path.join(
            hashDir,
            EXTRACTED_TEXT_FILENAME.replace('{hash}', record.hash)
          );

          try {
            await fs.unlink(textFilePath);
          } catch (e) {
            // Ignore errors if text file doesn't exist
          }

          deletedCount++;
        }
      } catch (e) {
        // Skip files that can't be processed
        console.error(`Error processing hash record file ${filePath}:`, e);
      }
    }

    return deletedCount;
  } catch (error) {
    Sentry.captureException(error);
    console.error(`Error cleaning up hash records for user ${userId}:`, error);
    return 0;
  }
}
