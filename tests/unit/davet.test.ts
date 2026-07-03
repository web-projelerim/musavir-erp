import { describe, expect, it } from "vitest";
import {
  createInviteToken,
  defaultYetkilerForRole,
  hashInviteToken,
  inviteExpiry,
  PERSONEL_DEFAULT_YETKILER,
} from "@/lib/domain/davet";

describe("davet domain", () => {
  it("token 32 karakter hex-benzeri ve benzersizdir", () => {
    const a = createInviteToken();
    const b = createInviteToken();
    expect(a).toHaveLength(32);
    expect(a).not.toBe(b);
    expect(a).toMatch(/^[0-9a-f]{32}$/);
  });

  it("hashInviteToken deterministik SHA-256 uretir", async () => {
    const h1 = await hashInviteToken("sabit-token");
    const h2 = await hashInviteToken("sabit-token");
    const h3 = await hashInviteToken("farkli-token");
    expect(h1).toBe(h2);
    expect(h1).not.toBe(h3);
    expect(h1).toMatch(/^[0-9a-f]{64}$/);
  });

  it("inviteExpiry varsayilan 7 gun ileridedir", () => {
    const expiry = new Date(inviteExpiry());
    const now = new Date();
    const diffDays = (expiry.getTime() - now.getTime()) / 86_400_000;
    expect(diffDays).toBeGreaterThan(6.9);
    expect(diffDays).toBeLessThan(7.1);
  });

  it("personel varsayilan yetkileri doner, musavir bos liste alir", () => {
    expect(defaultYetkilerForRole("personel")).toEqual(PERSONEL_DEFAULT_YETKILER);
    expect(defaultYetkilerForRole("musavir")).toEqual([]);
  });
});
