import { afterEach, beforeEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  addClick,
  createLink,
  getClicks,
  getLink,
  hasShortCode,
  listLinks,
  resetStoreForTests,
} from "../../lib/store";

describe("lib/store", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "url-shortener-test-"));
    process.env.DB_FILE_PATH = path.join(tempDir, "db.json");
    resetStoreForTests();
  });

  afterEach(() => {
    delete process.env.DB_FILE_PATH;
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it("starts empty when no file exists yet", () => {
    expect(listLinks()).toEqual([]);
    expect(hasShortCode("abc1234")).toBe(false);
  });

  it("persists a created link to disk and reloads it after an in-process reset", () => {
    createLink({
      shortCode: "abc1234",
      originalUrl: "https://example.com",
      createdAt: "2026-01-01T00:00:00.000Z",
      expiresAt: null,
    });

    expect(fs.existsSync(process.env.DB_FILE_PATH!)).toBe(true);

    resetStoreForTests();
    const reloaded = getLink("abc1234");
    expect(reloaded?.originalUrl).toBe("https://example.com");
    expect(hasShortCode("abc1234")).toBe(true);
  });

  it("round-trips recorded clicks across a reset", () => {
    createLink({
      shortCode: "abc1234",
      originalUrl: "https://example.com",
      createdAt: "2026-01-01T00:00:00.000Z",
      expiresAt: null,
    });
    addClick("abc1234", {
      shortCode: "abc1234",
      referrer: null,
      userAgent: "vitest",
      ip: "127.0.0.1",
      timestamp: "2026-01-01T00:01:00.000Z",
    });

    resetStoreForTests();
    expect(getClicks("abc1234")).toHaveLength(1);
    expect(getClicks("abc1234")[0].ip).toBe("127.0.0.1");
  });

  it("does not leak state between different DB_FILE_PATH values", () => {
    createLink({
      shortCode: "abc1234",
      originalUrl: "https://example.com",
      createdAt: "2026-01-01T00:00:00.000Z",
      expiresAt: null,
    });

    const otherDir = fs.mkdtempSync(path.join(os.tmpdir(), "url-shortener-test-"));
    process.env.DB_FILE_PATH = path.join(otherDir, "db.json");
    resetStoreForTests();

    expect(listLinks()).toEqual([]);
    fs.rmSync(otherDir, { recursive: true, force: true });
  });
});
