import fs from "node:fs";
import path from "node:path";
import type { Click, ShortLink } from "./types";

interface StoreState {
  links: Map<string, ShortLink>;
  clicks: Map<string, Click[]>;
}

interface PersistedShape {
  links: Record<string, ShortLink>;
  clicks: Record<string, Click[]>;
}

declare global {
  // eslint-disable-next-line no-var
  var __urlShortenerStore: StoreState | undefined;
}

function getDbFilePath(): string {
  return process.env.DB_FILE_PATH ?? path.join(process.cwd(), "data", "db.json");
}

function loadFromDisk(): StoreState {
  const filePath = getDbFilePath();
  if (!fs.existsSync(filePath)) {
    return { links: new Map(), clicks: new Map() };
  }
  const raw = fs.readFileSync(filePath, "utf-8");
  const parsed: PersistedShape = JSON.parse(raw);
  return {
    links: new Map(Object.entries(parsed.links ?? {})),
    clicks: new Map(Object.entries(parsed.clicks ?? {})),
  };
}

function persist(state: StoreState): void {
  const filePath = getDbFilePath();
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const shape: PersistedShape = {
    links: Object.fromEntries(state.links),
    clicks: Object.fromEntries(state.clicks),
  };
  fs.writeFileSync(filePath, JSON.stringify(shape, null, 2), "utf-8");
}

function getState(): StoreState {
  if (!globalThis.__urlShortenerStore) {
    globalThis.__urlShortenerStore = loadFromDisk();
  }
  return globalThis.__urlShortenerStore;
}

/** Test-only: drop the in-memory singleton so the next call re-reads DB_FILE_PATH from disk. */
export function resetStoreForTests(): void {
  globalThis.__urlShortenerStore = undefined;
}

export function hasShortCode(shortCode: string): boolean {
  return getState().links.has(shortCode);
}

export function createLink(link: ShortLink): void {
  const state = getState();
  state.links.set(link.shortCode, link);
  state.clicks.set(link.shortCode, []);
  persist(state);
}

export function getLink(shortCode: string): ShortLink | undefined {
  return getState().links.get(shortCode);
}

export function listLinks(): ShortLink[] {
  return Array.from(getState().links.values());
}

export function addClick(shortCode: string, click: Click): void {
  const state = getState();
  const existing = state.clicks.get(shortCode) ?? [];
  existing.push(click);
  state.clicks.set(shortCode, existing);
  persist(state);
}

export function getClicks(shortCode: string): Click[] {
  return getState().clicks.get(shortCode) ?? [];
}
