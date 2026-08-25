import { customAlphabet } from "nanoid";
import { hasShortCode } from "./store";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
const CODE_LENGTH = 7;
const MAX_ATTEMPTS = 10;

const nanoid = customAlphabet(ALPHABET, CODE_LENGTH);

export function validateUrl(url: string): boolean {
  if (!url) return false;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  return parsed.protocol === "http:" || parsed.protocol === "https:";
}

/**
 * Generates a short code guaranteed unique against the store at call time.
 * `candidate` is injectable for tests; defaults to nanoid.
 */
export function generateUniqueShortCode(candidate: () => string = nanoid): string {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const code = candidate();
    if (!hasShortCode(code)) {
      return code;
    }
  }
  throw new Error(`Failed to generate a unique short code after ${MAX_ATTEMPTS} attempts`);
}
