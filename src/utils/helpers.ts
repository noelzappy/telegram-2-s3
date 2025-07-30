import * as fs from "fs";
import * as path from "path";
import { logger } from "./logger";

/**
 * Ensures a directory exists, creating it if necessary
 */
export function ensureDirectoryExists(dirPath: string): void {
  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      logger.debug(`Created directory: ${dirPath}`);
    }
  } catch (error) {
    logger.error(`Failed to create directory ${dirPath}:`, error);
    throw error;
  }
}

/**
 * Generates a safe filename from a string
 */
export function sanitizeFileName(fileName: string): string {
  return fileName
    .replace(/[^a-zA-Z0-9.-]/g, "_")
    .replace(/__+/g, "_")
    .replace(/^_|_$/g, "");
}

/**
 * Formats file size in human readable format
 */
export function formatFileSize(bytes: number): string {
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  if (bytes === 0) return "0 Bytes";

  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + " " + sizes[i];
}

/**
 * Gets the previous Wednesday at 10:00 AM from the current date
 */
export function getPreviousWednesday(): Date {
  const now = new Date();
  const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, ..., 3 = Wednesday

  // Calculate days to subtract to get to previous Wednesday
  let daysToSubtract = currentDay >= 3 ? currentDay - 3 : currentDay + 4;

  // If today is Wednesday and current time is before 10:00 AM, get last Wednesday
  if (currentDay === 3 && now.getHours() < 10) {
    daysToSubtract = 7;
  }

  const previousWednesday = new Date(now);
  previousWednesday.setDate(now.getDate() - daysToSubtract);
  previousWednesday.setHours(10, 0, 0, 0); // Set to 10:00 AM

  return previousWednesday;
}

/**
 * Generates S3 key for a video file
 */
export function generateS3Key(
  channelName: string,
  fileName: string,
  timestamp: Date
): string {
  const year = timestamp.getFullYear();
  const month = String(timestamp.getMonth() + 1).padStart(2, "0");
  const day = String(timestamp.getDate()).padStart(2, "0");

  const sanitizedFileName = sanitizeFileName(fileName);
  return `telegram-videos/${channelName}/${timestamp.getTime()}_${sanitizedFileName}`;
}

/**
 * Delays execution for specified milliseconds
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retries an async operation with exponential backoff
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      if (attempt === maxRetries) {
        throw lastError;
      }

      const delayMs = baseDelay * Math.pow(2, attempt - 1);
      logger.warn(
        `Operation failed (attempt ${attempt}/${maxRetries}), retrying in ${delayMs}ms:`,
        error
      );
      await delay(delayMs);
    }
  }

  throw lastError!;
}
