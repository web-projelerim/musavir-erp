import { describe, expect, it } from "vitest";
import { rateLimit, rateLimitDistributed } from "@/lib/security/rateLimit";

describe("rateLimit (sliding window)", () => {
  it("limit dahilinde istekleri geçirir", () => {
    const key = `test-a:${Math.random()}`;
    expect(rateLimit(key, 3, 60_000).ok).toBe(true);
    expect(rateLimit(key, 3, 60_000).ok).toBe(true);
    const third = rateLimit(key, 3, 60_000);
    expect(third.ok).toBe(true);
    expect(third.remaining).toBe(0);
  });

  it("limit aşılınca reddeder ve retryAfter verir", () => {
    const key = `test-b:${Math.random()}`;
    rateLimit(key, 2, 60_000);
    rateLimit(key, 2, 60_000);
    const blocked = rateLimit(key, 2, 60_000);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSec).toBeGreaterThan(0);
  });

  it("pencere sıfırlanınca yeniden izin verir", () => {
    const key = `test-c:${Math.random()}`;
    rateLimit(key, 1, 1); // 1 ms pencere
    // pencere hemen dolar
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        expect(rateLimit(key, 1, 1).ok).toBe(true);
        resolve();
      }, 5);
    });
  });

  it("farklı anahtarlar bağımsız sayılır", () => {
    const k1 = `test-d1:${Math.random()}`;
    const k2 = `test-d2:${Math.random()}`;
    rateLimit(k1, 1, 60_000);
    expect(rateLimit(k1, 1, 60_000).ok).toBe(false);
    expect(rateLimit(k2, 1, 60_000).ok).toBe(true);
  });
});

describe("rateLimitDistributed (Upstash yoksa in-memory fallback)", () => {
  it("Upstash env tanımsızsa in-memory gibi davranır", async () => {
    const key = `dist:${Math.random()}`;
    expect((await rateLimitDistributed(key, 2, 60_000)).ok).toBe(true);
    expect((await rateLimitDistributed(key, 2, 60_000)).ok).toBe(true);
    expect((await rateLimitDistributed(key, 2, 60_000)).ok).toBe(false);
  });
});
