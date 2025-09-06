import { createClient } from "@supabase/supabase-js";
import algoliasearch from "algoliasearch";
import type { SyncEnvironment } from "./types";

/**
 * Utility function for retry with exponential backoff
 */
export const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 6,
  baseDelay: number = 1000,
  identifier?: string,
): Promise<T> => {
  let lastError: Error = new Error("Unknown error occurred");

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt === maxRetries) {
        const errorMsg = identifier
          ? `Final attempt failed for ${identifier}: ${lastError.message}`
          : `Final attempt failed: ${lastError.message}`;
        console.error(errorMsg);
        throw lastError;
      }

      const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000; // Add jitter
      const retryMsg = identifier
        ? `Attempt ${attempt + 1} failed for ${identifier}, retrying in ${Math.round(delay)}ms: ${lastError.message}`
        : `Attempt ${attempt + 1} failed, retrying in ${Math.round(delay)}ms: ${lastError.message}`;
      console.warn(retryMsg);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
};

/**
 * Create Supabase client with environment variables
 */
export const createSupabaseClient = (env: SyncEnvironment) => {
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
};

/**
 * Create Algolia client with environment variables
 */
export const createAlgoliaClient = (env: SyncEnvironment) => {
  return algoliasearch(env.ALGOLIA_APP_ID, env.ALGOLIA_API_KEY);
};

/**
 * Convert full-width characters to half-width characters
 */
export const fullWidthToHalfWidth = (str: string): string => {
  return str
    .replace(/[\uff01-\uff5e]/g, (char) => {
      return String.fromCharCode(char.charCodeAt(0) - 0xfee0);
    })
    .replace(/\u3000/g, " "); // Full-width space to half-width space
};

/**
 * Validate required environment variables
 */
export const validateEnvironment = (): SyncEnvironment => {
  const requiredVars = [
    "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "ALGOLIA_APP_ID",
    "ALGOLIA_API_KEY",
  ] as const;

  const env: Partial<SyncEnvironment> = {};
  const missing: string[] = [];

  for (const varName of requiredVars) {
    const value = process.env[varName];
    if (!value) {
      missing.push(varName);
    } else {
      env[varName] = value;
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`,
    );
  }

  return env as SyncEnvironment;
};

/**
 * Sleep for specified milliseconds
 */
export const sleep = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

/**
 * Chunk array into smaller arrays of specified size
 */
export const chunkArray = <T>(array: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
};

/**
 * Format bytes to human readable string
 */
export const formatBytes = (bytes: number, decimals: number = 2): string => {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
};
