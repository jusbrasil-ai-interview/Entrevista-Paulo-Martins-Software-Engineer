import { afterEach, beforeEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createLink, getClicks, resetStoreForTests } from "../../lib/store";

function getRequest(headers: Record<string, string> = {}): Request {
  return new Request("http://localhost:3000/abc1234", { headers });
}

function paramsFor(code: string) {
  return { params: Promise.resolve({ code }) };
}

describe("GET /:code", () => {
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

  it("redirects (301) to the original URL and records a click with referrer/userAgent/ip/timestamp", async () => {
    createLink({
      shortCode: "abc1234",
      originalUrl: "https://example.com/target",
      createdAt: new Date().toISOString(),
      expiresAt: null,
    });

    const { GET } = await import("../../app/[code]/route");
    const res = await GET(
      getRequest({
        Referer: "https://twitter.com/",
        "User-Agent": "vitest-agent",
        "x-forwarded-for": "203.0.113.5, 10.0.0.1",
      }),
      paramsFor("abc1234"),
    );

    expect(res.status).toBe(301);
    expect(res.headers.get("Location")).toBe("https://example.com/target");

    const clicks = getClicks("abc1234");
    expect(clicks).toHaveLength(1);
    expect(clicks[0].referrer).toBe("https://twitter.com/");
    expect(clicks[0].userAgent).toBe("vitest-agent");
    expect(clicks[0].ip).toBe("203.0.113.5");
    expect(typeof clicks[0].timestamp).toBe("string");
  });

  it("returns 404 and records no click for an unknown code", async () => {
    const { GET } = await import("../../app/[code]/route");
    const res = await GET(getRequest(), paramsFor("doesNotExist"));
    expect(res.status).toBe(404);
    expect(getClicks("doesNotExist")).toHaveLength(0);
  });

  it("returns 410 and records no click for an expired link", async () => {
    createLink({
      shortCode: "expired1",
      originalUrl: "https://example.com/target",
      createdAt: new Date().toISOString(),
      expiresAt: "2000-01-01T00:00:00.000Z",
    });

    const { GET } = await import("../../app/[code]/route");
    const res = await GET(getRequest(), paramsFor("expired1"));
    expect(res.status).toBe(410);
    expect(getClicks("expired1")).toHaveLength(0);
  });

  it("treats a click at the exact expiry instant as expired", async () => {
    createLink({
      shortCode: "edge1234",
      originalUrl: "https://example.com/target",
      createdAt: new Date().toISOString(),
      expiresAt: "2020-01-01T00:00:00.000Z",
    });

    const { GET } = await import("../../app/[code]/route");
    const res = await GET(getRequest(), paramsFor("edge1234"));
    expect(res.status).toBe(410);
  });

  it("always redirects a link with no expiresAt regardless of current time", async () => {
    createLink({
      shortCode: "never123",
      originalUrl: "https://example.com/target",
      createdAt: new Date().toISOString(),
      expiresAt: null,
    });

    const { GET } = await import("../../app/[code]/route");
    const res = await GET(getRequest(), paramsFor("never123"));
    expect(res.status).toBe(301);
  });
});
