import { afterEach, beforeEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { getStats, recordClick } from "../../lib/clicks";
import { createLink, resetStoreForTests } from "../../lib/store";
import type { Click } from "../../lib/types";

const SHORT_CODE = "abc1234";

function click(overrides: Partial<Click> = {}): Omit<Click, "shortCode"> {
  return {
    referrer: null,
    userAgent: "vitest",
    ip: "127.0.0.1",
    timestamp: new Date().toISOString(),
    ...overrides,
  };
}

describe("lib/clicks", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "url-shortener-test-"));
    process.env.DB_FILE_PATH = path.join(tempDir, "db.json");
    resetStoreForTests();
    createLink({
      shortCode: SHORT_CODE,
      originalUrl: "https://example.com",
      createdAt: new Date().toISOString(),
      expiresAt: null,
    });
  });

  afterEach(() => {
    delete process.env.DB_FILE_PATH;
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it("returns zeroed stats with a full 30-day range when there are no clicks", () => {
    const stats = getStats(SHORT_CODE);
    expect(stats.totalClicks).toBe(0);
    expect(stats.clicksByDay).toHaveLength(30);
    expect(stats.clicksByDay.every((d) => d.count === 0)).toBe(true);
    expect(stats.topReferrers).toEqual([]);
  });

  it("counts total clicks and buckets them by UTC day", () => {
    const today = new Date().toISOString().slice(0, 10);
    recordClick(SHORT_CODE, click({ timestamp: `${today}T01:00:00.000Z` }));
    recordClick(SHORT_CODE, click({ timestamp: `${today}T02:00:00.000Z` }));

    const stats = getStats(SHORT_CODE);
    expect(stats.totalClicks).toBe(2);
    const todayBucket = stats.clicksByDay.find((d) => d.date === today);
    expect(todayBucket?.count).toBe(2);
  });

  it("groups missing/empty referrer into 'Direct / Unknown' and ranks top 5 with alphabetical tie-break", () => {
    recordClick(SHORT_CODE, click({ referrer: "https://b.example/" }));
    recordClick(SHORT_CODE, click({ referrer: "https://b.example/" }));
    recordClick(SHORT_CODE, click({ referrer: "https://a.example/" }));
    recordClick(SHORT_CODE, click({ referrer: "https://a.example/" }));
    recordClick(SHORT_CODE, click({ referrer: null }));
    recordClick(SHORT_CODE, click({ referrer: "https://c.example/" }));
    recordClick(SHORT_CODE, click({ referrer: "https://d.example/" }));
    recordClick(SHORT_CODE, click({ referrer: "https://e.example/" }));
    recordClick(SHORT_CODE, click({ referrer: "https://f.example/" }));

    const stats = getStats(SHORT_CODE);
    // count=2 tier (alphabetical): a.example, b.example
    // count=1 tier (alphabetical, "Direct / Unknown" sorts before "https://..."): Direct/Unknown, c.example, d.example — e/f excluded by the top-5 cutoff
    expect(stats.topReferrers).toEqual([
      { referrer: "https://a.example/", count: 2 },
      { referrer: "https://b.example/", count: 2 },
      { referrer: "Direct / Unknown", count: 1 },
      { referrer: "https://c.example/", count: 1 },
      { referrer: "https://d.example/", count: 1 },
    ]);
  });
});
