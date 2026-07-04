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

/**
 * Dağıtık rate limit (Upstash Redis REST üzerinden).
 *
 * UPSTASH_REDIS_REST_URL ve UPSTASH_REDIS_REST_TOKEN tanımlıysa sabit-pencere
 * sayaç Redis'te tutulur (tüm serverless instance'ları paylaşır). Tanımlı
 * değilse veya Redis'e ulaşılamazsa in-memory `rateLimit`'e düşer — böylece
 * yapılandırma eksikse bile koruma tamamen kaybolmaz (yalnızca instance-yerel olur).
 *
 * Sabit pencere INCR + EXPIRE deseni: ilk istekte sayaç 1 olur ve pencere
 * süresi kadar TTL atanır; sonraki istekler sayacı artırır.
 */
export async function rateLimitDistributed(
  key: string,
  limit: number,
  windowMs: number
): Promise<RateLimitResult> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    return rateLimit(key, limit, windowMs);
  }

  const windowSec = Math.ceil(windowMs / 1000);
  const redisKey = `rl:${key}`;

  try {
    // Pipeline: INCR + (ilk istekse) EXPIRE. Upstash REST pipeline API.
    const res = await fetch(`${url}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([
        ["INCR", redisKey],
        ["EXPIRE", redisKey, windowSec, "NX"],
        ["TTL", redisKey],
      ]),
      signal: AbortSignal.timeout(1500),
    });

    if (!res.ok) throw new Error(`Upstash ${res.status}`);
    const data = (await res.json()) as Array<{ result: number }>;
    const count = data[0]?.result ?? 1;
    const ttl = data[2]?.result ?? windowSec;
    const resetAt = Date.now() + Math.max(0, ttl) * 1000;

    if (count > limit) {
      return { ok: false, remaining: 0, resetAt, retryAfterSec: Math.max(1, ttl) };
    }
    return { ok: true, remaining: Math.max(0, limit - count), resetAt, retryAfterSec: 0 };
  } catch (err) {
    // Redis'e ulaşılamazsa in-memory'ye düş (fail-open değil: yerel koruma sürer)
    console.warn("[rateLimit] Upstash erişilemedi, in-memory'ye düşülüyor:", err instanceof Error ? err.message : err);
    return rateLimit(key, limit, windowMs);
  }
}
