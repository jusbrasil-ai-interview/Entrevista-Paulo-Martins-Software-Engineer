import { afterEach, beforeEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createLink, resetStoreForTests } from "../../lib/store";
import { recordClick } from "../../lib/clicks";

describe("GET /api/urls", () => {
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

  it("lists links newest-first with click counts", async () => {
    createLink({
      shortCode: "older12",
      originalUrl: "https://example.com/old",
      createdAt: "2026-01-01T00:00:00.000Z",
      expiresAt: null,
    });
    createLink({
      shortCode: "newer12",
      originalUrl: "https://example.com/new",
      createdAt: "2026-06-01T00:00:00.000Z",
      expiresAt: null,
    });
    recordClick("older12", {
      referrer: null,
      userAgent: "vitest",
      ip: "127.0.0.1",
      timestamp: new Date().toISOString(),
    });

    const { GET } = await import("../../app/api/urls/route");
    const res = await GET(new Request("http://localhost:3000/api/urls"));
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json).toHaveLength(2);
    expect(json[0].shortCode).toBe("newer12");
    expect(json[1].shortCode).toBe("older12");
    expect(json[1].clickCount).toBe(1);
    expect(json[0].clickCount).toBe(0);
    expect(json[0].shortUrl).toBe("http://localhost:3000/newer12");
  });

  it("returns an empty array when no links exist", async () => {
    const { GET } = await import("../../app/api/urls/route");
    const res = await GET(new Request("http://localhost:3000/api/urls"));
    const json = await res.json();
    expect(json).toEqual([]);
  });
});
