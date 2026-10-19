import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { FastifyInstance } from "fastify";

// Set before the app (and config / dotenv) load. An existing key — even an
// empty one — is not overridden by a local .env file.
process.env.XML_FEED_URL ??= "https://example.com/feed.xml";
process.env.CORS_ORIGIN = "";

let app: FastifyInstance;

beforeAll(async () => {
  const { buildApp } = await import("../app.js");
  app = buildApp();
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

function directives(csp: string): Map<string, string> {
  return new Map(
    csp.split(";").map((d) => d.trim()).filter(Boolean).map((d) => {
      const [name, ...values] = d.split(/\s+/);
      return [name, values.join(" ")] as [string, string];
    }),
  );
}

describe("security headers", () => {
  it.each(["/index.html", "/api/health"])("are sent on %s", async (url) => {
    const res = await app.inject({ method: "GET", url });
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect(res.headers["x-frame-options"]).toBe("SAMEORIGIN");
    expect(res.headers["strict-transport-security"]).toBeDefined();
    expect(res.headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(res.headers["content-security-policy"]).toBeDefined();
  });

  it("CSP forbids inline scripts, embedding and plugins", async () => {
    const res = await app.inject({ method: "GET", url: "/index.html" });
    const csp = directives(String(res.headers["content-security-policy"]));

    expect(csp.get("script-src")).not.toContain("'unsafe-inline'");
    expect(csp.get("script-src")).not.toContain("'unsafe-eval'");
    expect(csp.get("script-src-attr")).toBe("'none'");
    expect(csp.get("frame-ancestors")).toBe("'none'");
    expect(csp.get("object-src")).toBe("'none'");
  });

  it("CSP pins the CDN to the exact packages, not the whole domain", async () => {
    const res = await app.inject({ method: "GET", url: "/index.html" });
    const scriptSrc = directives(String(res.headers["content-security-policy"])).get("script-src") ?? "";

    expect(scriptSrc).toContain("https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/");
    expect(scriptSrc.split(" ")).not.toContain("https://cdn.jsdelivr.net");
  });

  it("index.html has no inline <script> left (CSP would block it)", async () => {
    const res = await app.inject({ method: "GET", url: "/index.html" });
    const inline = res.body.match(/<script(?![^>]*\bsrc=)(?![^>]*application\/ld\+json)[^>]*>/g);
    expect(inline).toBeNull();
  });
});

describe("CORS", () => {
  it("is off by default — other websites get no access to the API", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/health",
      headers: { origin: "https://evil.example" },
    });
    expect(res.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it.each(["text/plain", "application/x-www-form-urlencoded", "multipart/form-data; boundary=x"])(
    "rejects %s bodies — the types other sites can POST without a preflight",
    async (contentType) => {
      // Even a complete, valid contact payload is refused before any handler runs
      const res = await app.inject({
        method: "POST",
        url: "/api/contact",
        headers: { origin: "https://evil.example", "content-type": contentType },
        payload: JSON.stringify({
          firstName: "Pera", lastName: "Perić", phone: "0641112233",
          email: "pera@example.com", subject: "Test", message: "Spam",
        }),
      });
      expect(res.statusCode).toBe(415);
      expect(res.json().error.code).toBe("UNSUPPORTED_MEDIA_TYPE");
    },
  );

  it("answers an oversized body with 413, not a server error", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/contact",
      headers: { "content-type": "application/json" },
      payload: JSON.stringify({ message: "x".repeat(1_100_000) }), // > 1 MB default limit
    });
    expect(res.statusCode).toBe(413);
    expect(res.json().error.code).toBe("PAYLOAD_TOO_LARGE");
  });
});
