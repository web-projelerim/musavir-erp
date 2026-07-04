import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

// authHeaders'ı mock'la — gerçek Firebase token'ına gerek yok.
vi.mock("@/lib/firebase/client", () => ({
  authHeaders: async () => ({ "Content-Type": "application/json", Authorization: "Bearer test" }),
}));

import { syncClaimsFor } from "@/lib/firebase/syncClaims";

const originalFetch = global.fetch;

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  global.fetch = originalFetch;
});

describe("syncClaimsFor", () => {
  it("başarılı yanıtta ok:true döner ve doğru body gönderir", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 })
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await syncClaimsFor("hedef-uid");
    expect(result.ok).toBe(true);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/auth/sync-claims");
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({ targetUid: "hedef-uid" });
  });

  it("sunucu hatası mesajını taşır", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: "Hedef kullanıcı sizin ofisinizde değil" }), { status: 403 })
    ) as unknown as typeof fetch;

    const result = await syncClaimsFor("baska-ofis-uid");
    expect(result.ok).toBe(false);
    expect(result.error).toContain("ofisinizde değil");
  });

  it("ağ hatasında güvenli şekilde ok:false döner", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("network down")) as unknown as typeof fetch;
    const result = await syncClaimsFor("uid");
    expect(result.ok).toBe(false);
    expect(result.error).toBe("network down");
  });

  it("gövdesiz hata yanıtında status kodlu mesaj üretir", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response("not json", { status: 500 })
    ) as unknown as typeof fetch;
    const result = await syncClaimsFor("uid");
    expect(result.ok).toBe(false);
    expect(result.error).toContain("500");
  });
});
