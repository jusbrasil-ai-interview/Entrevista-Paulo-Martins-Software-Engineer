import { afterEach, beforeEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { resetStoreForTests } from "../../lib/store";

function post(body: unknown): Request {
  return new Request("http://localhost:3000/api/shorten", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/shorten", () => {
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

  it("creates a short link for a valid http(s) URL", async () => {
    const { POST } = await import("../../app/api/shorten/route");
    const res = await POST(post({ url: "https://example.com/some/long/path" }));
    expect(res.status).toBe(201);

    const json = await res.json();
    expect(json.shortCode).toMatch(/^[A-Za-z0-9]{7}$/);
    expect(json.shortUrl).toBe(`http://localhost:3000/${json.shortCode}`);
    expect(json.originalUrl).toBe("https://example.com/some/long/path");
    expect(json.expiresAt).toBeNull();
    expect(typeof json.createdAt).toBe("string");
  });

  it("persists and echoes back an optional expiresAt", async () => {
    const { POST } = await import("../../app/api/shorten/route");
    const res = await POST(
      post({ url: "https://example.com", expiresAt: "2026-12-31T23:59:59.000Z" }),
    );
    const json = await res.json();
    expect(json.expiresAt).toBe("2026-12-31T23:59:59.000Z");
  });

  it("rejects a non-http(s) URL with 400", async () => {
    const { POST } = await import("../../app/api/shorten/route");
    const res = await POST(post({ url: "ftp://example.com/file" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/invalid url/i);
  });

  it("rejects a missing url with 400", async () => {
    const { POST } = await import("../../app/api/shorten/route");
    const res = await POST(post({}));
    expect(res.status).toBe(400);
  });
});
