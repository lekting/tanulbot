/**
 * Central export for all workers
 */
import { TMP_DIR } from '../config';
import fs from 'fs/promises';
import path from 'path';
import { cleanupOldHashRecords } from '../utils/fileHash';

// Re-export the active user worker
export { startActiveUserWorker } from './activeUserWorker';

const MAX_FILE_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours
const MAX_HASH_RECORD_AGE_DAYS = 30; // 30 days

/**
 * Start a worker to clean up old temporary files
 * @returns Interval ID
 */
export function startFileCleanupWorker(): NodeJS.Timeout {
  console.log('Starting file cleanup worker...');

  return setInterval(async () => {
    try {
      await cleanupOldFiles();
    } catch (error) {
      console.error('Error in file cleanup worker:', error);
    }
  }, 4 * 60 * 60 * 1000); // Run every 4 hours
}

/**
 * Start a worker to clean up old hash records
 * @returns Interval ID
 */
export function startHashRecordCleanupWorker(): NodeJS.Timeout {
  console.log('Starting hash record cleanup worker...');

  return setInterval(async () => {
    try {
      await cleanupAllUsersHashRecords();
    } catch (error) {
      console.error('Error in hash record cleanup worker:', error);
    }
  }, 24 * 60 * 60 * 1000); // Run every 24 hours
}

/**
 * Clean up old hash records for all users
 */
async function cleanupAllUsersHashRecords(): Promise<void> {
  try {
    console.log('Starting cleanup of old hash records...');

    // Check if TMP_DIR exists
    try {
      await fs.access(TMP_DIR);
    } catch (error) {
      console.log('Temporary directory does not exist, nothing to clean up');
      return;
    }

    // Get all user directories
    const entries = await fs.readdir(TMP_DIR, { withFileTypes: true });
    let totalCleanedRecords = 0;

    // Process each user directory
    for (const entry of entries) {
      if (entry.isDirectory() && entry.name.startsWith('user_')) {
        // Extract user ID from directory name
        const userId = parseInt(entry.name.replace('user_', ''), 10);

        if (!isNaN(userId)) {
          try {
            // Clean up old hash records for this user
            const deletedCount = await cleanupOldHashRecords(
              userId,
              MAX_HASH_RECORD_AGE_DAYS
            );

            if (deletedCount > 0) {
              console.log(
                `Deleted ${deletedCount} old hash records for user ${userId}`
              );
              totalCleanedRecords += deletedCount;
            }
          } catch (userError) {
            console.error(
              `Error cleaning hash records for user ${userId}:`,
              userError
            );
          }
        }
      }
    }

    console.log(
      `Hash record cleanup completed. Total records deleted: ${totalCleanedRecords}`
    );
  } catch (error) {
    console.error('Error cleaning up old hash records:', error);
  }
}

/**
 * Clean up old temporary files
 */
async function cleanupOldFiles(): Promise<void> {
  try {
    console.log('Starting cleanup of old temporary files...');

    // Check if TMP_DIR exists
    try {
      await fs.access(TMP_DIR);
    } catch (error) {
      console.log('Temporary directory does not exist, nothing to clean up');
      return;
    }

    // Get current time for comparison
    const now = Date.now();

    // Get all user directories
    const entries = await fs.readdir(TMP_DIR, { withFileTypes: true });

    // Process each entry
    for (const entry of entries) {
      if (entry.isDirectory() && entry.name.startsWith('user_')) {
        // This is a user directory
        const userDir = path.join(TMP_DIR, entry.name);

        try {
          // Get files in user directory
          const files = await fs.readdir(userDir, { withFileTypes: true });

          // Process each file
          for (const file of files) {
            // Exclude directories like 'audio' and 'hash_records'
            if (!file.isDirectory()) {
              const filePath = path.join(userDir, file.name);

              try {
                // Get file stats
                const stats = await fs.stat(filePath);

                // Check if file is older than MAX_FILE_AGE_MS
                if (now - stats.mtimeMs > MAX_FILE_AGE_MS) {
                  // Delete the file
                  await fs.unlink(filePath);
                  console.log(`Deleted old file: ${filePath}`);
                }
              } catch (fileError) {
                console.error(`Error processing file ${filePath}:`, fileError);
              }
            } else if (file.name === 'audio') {
              // Also cleanup audio files
              const audioDir = path.join(userDir, 'audio');

              try {
                const audioFiles = await fs.readdir(audioDir);

                for (const audioFile of audioFiles) {
                  const audioFilePath = path.join(audioDir, audioFile);

                  try {
                    const stats = await fs.stat(audioFilePath);

                    // Check if file is older than MAX_FILE_AGE_MS
                    if (now - stats.mtimeMs > MAX_FILE_AGE_MS) {
                      // Delete the file
                      await fs.unlink(audioFilePath);
                      console.log(`Deleted old audio file: ${audioFilePath}`);
                    }
                  } catch (audioFileError) {
                    console.error(
                      `Error processing audio file ${audioFilePath}:`,
                      audioFileError
                    );
                  }
                }
              } catch (audioDirError) {
                console.error(
                  `Error processing audio directory ${audioDir}:`,
                  audioDirError
                );
              }
            }
          }
        } catch (dirError) {
          console.error(
            `Error processing user directory ${userDir}:`,
            dirError
          );
        }
      }
    }

    console.log('Cleanup of old temporary files completed');
  } catch (error) {
    console.error('Error cleaning up old temporary files:', error);
  }
}
