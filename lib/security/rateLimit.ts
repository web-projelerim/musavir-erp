import "server-only";

/**
 * Basit in-memory sliding-window rate limiter (B5).
 *
 * Bağımlılıksız, tek-instance içindir. Serverless'te her instance kendi
 * penceresini tutar; kesin global limit gerekiyorsa Upstash/Vercel KV tabanlı
 * dağıtık bir çözüme geçilmelidir. Yine de tek instance başına brute-force ve
 * maliyet-abuse'ü anlamlı ölçüde sınırlar.
 */
type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

// Bellek sızıntısını önlemek için süresi geçmiş kovaları ara ara temizle.
let lastSweep = 0;
function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const key of Array.from(buckets.keys())) {
    const b = buckets.get(key);
    if (b && b.resetAt <= now) buckets.delete(key);
  }
}

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  resetAt: number;
  retryAfterSec: number;
}

/**
 * @param key      Kimlik (örn. `${route}:${uid}` veya `${route}:${ip}`)
 * @param limit    Pencere başına izin verilen istek sayısı
 * @param windowMs Pencere süresi (ms)
 */
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    const resetAt = now + windowMs;
    buckets.set(key, { count: 1, resetAt });
    return { ok: true, remaining: limit - 1, resetAt, retryAfterSec: 0 };
  }

  if (existing.count >= limit) {
    return {
      ok: false,
      remaining: 0,
      resetAt: existing.resetAt,
      retryAfterSec: Math.ceil((existing.resetAt - now) / 1000),
    };
  }

  existing.count += 1;
  return {
    ok: true,
    remaining: limit - existing.count,
    resetAt: existing.resetAt,
    retryAfterSec: 0,
  };
}

/** İstekten kaba bir istemci kimliği çıkarır (proxy header'ları → ilk IP). */
export function clientKey(req: Request, fallback = "anon"): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? fallback;
}
