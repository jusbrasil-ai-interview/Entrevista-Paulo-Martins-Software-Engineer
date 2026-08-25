import { afterEach, beforeEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createLink, resetStoreForTests } from "../../lib/store";
import { recordClick } from "../../lib/clicks";

function paramsFor(code: string) {
  return { params: Promise.resolve({ code }) };
}

describe("GET /api/stats/:code", () => {
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

  it("returns totals, a 30-entry day breakdown, and top referrers for a link with clicks", async () => {
    createLink({
      shortCode: "abc1234",
      originalUrl: "https://example.com",
      createdAt: new Date().toISOString(),
      expiresAt: null,
    });
    recordClick("abc1234", {
      referrer: "https://twitter.com/",
      userAgent: "vitest",
      ip: "127.0.0.1",
      timestamp: new Date().toISOString(),
    });
    recordClick("abc1234", {
      referrer: null,
      userAgent: "vitest",
      ip: "127.0.0.1",
      timestamp: new Date().toISOString(),
    });

    const { GET } = await import("../../app/api/stats/[code]/route");
    const res = await GET(new Request("http://localhost:3000/api/stats/abc1234"), paramsFor("abc1234"));
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.shortCode).toBe("abc1234");
    expect(json.totalClicks).toBe(2);
    expect(json.clicksByDay).toHaveLength(30);
    expect(json.topReferrers).toEqual(
      expect.arrayContaining([
        { referrer: "https://twitter.com/", count: 1 },
        { referrer: "Direct / Unknown", count: 1 },
      ]),
    );
  });

  it("returns zeroed stats without erroring for a link with no clicks", async () => {
    createLink({
      shortCode: "zero1234",
      originalUrl: "https://example.com",
      createdAt: new Date().toISOString(),
      expiresAt: null,
    });

    const { GET } = await import("../../app/api/stats/[code]/route");
    const res = await GET(new Request("http://localhost:3000/api/stats/zero1234"), paramsFor("zero1234"));
    const json = await res.json();
    expect(json.totalClicks).toBe(0);
    expect(json.topReferrers).toEqual([]);
  });

  it("returns 404 for an unknown code", async () => {
    const { GET } = await import("../../app/api/stats/[code]/route");
    const res = await GET(new Request("http://localhost:3000/api/stats/nope"), paramsFor("nope"));
    expect(res.status).toBe(404);
    expect((await res.json()).code).toBe("NOT_FOUND");
  });
});
