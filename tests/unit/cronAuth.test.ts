import { afterEach, describe, expect, it } from "vitest";
import { verifyCronSecret } from "@/lib/security/cronAuth";

function makeReq(authHeader?: string): Request {
  return new Request("http://localhost/api/cron/test", {
    headers: authHeader ? { authorization: authHeader } : {},
  });
}

const ORIGINAL = process.env.CRON_SECRET;

afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.CRON_SECRET;
  else process.env.CRON_SECRET = ORIGINAL;
});

describe("verifyCronSecret (fail-closed)", () => {
  it("CRON_SECRET tanimli degilse istegi 503 ile reddeder", () => {
    delete process.env.CRON_SECRET;
    const result = verifyCronSecret(makeReq("Bearer herhangi"));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(503);
  });

  it("header yoksa 401 doner", () => {
    process.env.CRON_SECRET = "test-secret-cok-gizli-1234567890ab";
    const result = verifyCronSecret(makeReq());
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(401);
  });

  it("yanlis secret 401 doner", () => {
    process.env.CRON_SECRET = "test-secret-cok-gizli-1234567890ab";
    const result = verifyCronSecret(makeReq("Bearer yanlis"));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(401);
  });

  it("dogru secret kabul edilir", () => {
    process.env.CRON_SECRET = "test-secret-cok-gizli-1234567890ab";
    const result = verifyCronSecret(makeReq("Bearer test-secret-cok-gizli-1234567890ab"));
    expect(result.ok).toBe(true);
  });

  it("farkli uzunluktaki header timingSafeEqual oncesi guvenle reddedilir", () => {
    process.env.CRON_SECRET = "kisa";
    const result = verifyCronSecret(makeReq("Bearer cok-daha-uzun-bir-deger"));
    expect(result.ok).toBe(false);
  });
});
