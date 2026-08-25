import { afterEach, beforeEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { generateUniqueShortCode, validateUrl } from "../../lib/shortener";
import { createLink, resetStoreForTests } from "../../lib/store";

describe("validateUrl", () => {
  it.each(["http://example.com", "https://example.com/path?query=1"])(
    "accepts %s",
    (url) => {
      expect(validateUrl(url)).toBe(true);
    },
  );

  it.each([
    "ftp://example.com/file",
    "javascript:alert(1)",
    "not a url",
    "",
    "example.com",
  ])("rejects %s", (url) => {
    expect(validateUrl(url)).toBe(false);
  });
});

describe("generateUniqueShortCode", () => {
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

  it("generates a ~7-character alphanumeric code", () => {
    const code = generateUniqueShortCode();
    expect(code).toMatch(/^[A-Za-z0-9]{7}$/);
  });

  it("regenerates when a candidate collides with an existing link", () => {
    createLink({
      shortCode: "collide1",
      originalUrl: "https://example.com",
      createdAt: new Date().toISOString(),
      expiresAt: null,
    });

    let calls = 0;
    const code = generateUniqueShortCode(() => {
      calls += 1;
      return calls === 1 ? "collide1" : "fresh123";
    });

    expect(calls).toBe(2);
    expect(code).toBe("fresh123");
  });
});
