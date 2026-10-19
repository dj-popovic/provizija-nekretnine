import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { FastifyInstance } from "fastify";

// Small limits so the tests stay fast. Set before the app (and config) load.
process.env.XML_FEED_URL ??= "https://example.com/feed.xml";
process.env.RATE_LIMIT_MAX = "3";
process.env.RATE_LIMIT_FORMS_MAX = "2";
process.env.TRUST_PROXY = "true";

let app: FastifyInstance;

beforeAll(async () => {
  const { buildApp } = await import("../app.js");
  app = buildApp();
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

function get(url: string, ip: string) {
  return app.inject({ method: "GET", url, headers: { "x-forwarded-for": ip } });
}

describe("rate limiting", () => {
  it("never limits static site files", async () => {
    for (let i = 0; i < 10; i++) {
      const res = await get("/css/style.css", "10.0.0.1");
      expect(res.statusCode).toBe(200);
    }
  });

  it("limits API requests per visitor", async () => {
    for (let i = 0; i < 3; i++) {
      expect((await get("/api/health", "10.0.0.2")).statusCode).toBe(200);
    }
    const blocked = await get("/api/health", "10.0.0.2");
    expect(blocked.statusCode).toBe(429);
    expect(blocked.json().error.code).toBe("RATE_LIMIT_EXCEEDED");
  });

  it("gives each visitor behind the proxy their own limit", async () => {
    for (let i = 0; i < 3; i++) await get("/api/health", "10.0.0.3");
    expect((await get("/api/health", "10.0.0.3")).statusCode).toBe(429);

    // A different visitor (different X-Forwarded-For) is unaffected
    expect((await get("/api/health", "10.0.0.4")).statusCode).toBe(200);
  });

  it("keeps the stricter per-route limit on forms", async () => {
    const post = () =>
      app.inject({
        method: "POST",
        url: "/api/contact",
        headers: { "x-forwarded-for": "10.0.0.5" },
        payload: {},
      });
    expect((await post()).statusCode).toBe(400); // invalid body, but counted
    expect((await post()).statusCode).toBe(400);
    expect((await post()).statusCode).toBe(429);
  });
});
