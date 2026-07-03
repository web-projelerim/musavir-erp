import "server-only";
import { timingSafeEqual } from "node:crypto";

/**
 * Cron endpoint doğrulaması — FAIL-CLOSED.
 *
 * Eski desen `if (cronSecret && header !== ...)` idi: CRON_SECRET tanımlı
 * değilse kontrol tamamen atlanıyor ve endpoint herkese açık kalıyordu.
 * Bu yardımcı, secret tanımlı değilse de isteği REDDeder.
 *
 * Karşılaştırma timing-safe yapılır.
 */
export type CronAuthResult =
  | { ok: true }
  | { ok: false; status: number; error: string };

export function verifyCronSecret(req: Request): CronAuthResult {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return {
      ok: false,
      status: 503,
      error:
        "CRON_SECRET env değişkeni tanımlı değil. Güvenlik nedeniyle cron endpoint'i kapalı. " +
        ".env.local (veya Vercel env) içine en az 32 karakterlik rastgele bir CRON_SECRET ekleyin.",
    };
  }

  const authHeader = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${cronSecret}`;

  const a = Buffer.from(authHeader);
  const b = Buffer.from(expected);
  const match = a.length === b.length && timingSafeEqual(a, b);

  if (!match) {
    return { ok: false, status: 401, error: "Yetkisiz erişim" };
  }
  return { ok: true };
}
