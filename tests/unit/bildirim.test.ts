import { describe, expect, it } from "vitest";
import { BILDIRIM_TIP_LABELS, TUM_BILDIRIM_TIPLERI, isBildirimEnabled } from "@/lib/domain/bildirim";
import type { User } from "@/lib/types";

function makeUser(over: Partial<User> = {}): User {
  return {
    id: "u1",
    ofisId: "o1",
    ad: "Test",
    soyad: "Kullanici",
    email: "t@x.com",
    rol: "musavir",
    aktif: true,
    createdAt: new Date().toISOString(),
    ...over,
  };
}

describe("isBildirimEnabled", () => {
  it("tercih hiç kaydedilmemişse varsayılan AÇIK", () => {
    expect(isBildirimEnabled(makeUser(), "tebligat")).toBe(true);
  });

  it("null kullanıcı için açık (guard'lar zaten oturum ister)", () => {
    expect(isBildirimEnabled(null, "gorev")).toBe(true);
  });

  it("açıkça kapatılan tip kapalı", () => {
    const u = makeUser({ bildirimTercihleri: { tebligat: false } });
    expect(isBildirimEnabled(u, "tebligat")).toBe(false);
  });

  it("bir tip kapatılınca diğerleri açık kalır", () => {
    const u = makeUser({ bildirimTercihleri: { tebligat: false } });
    expect(isBildirimEnabled(u, "gorev")).toBe(true);
    expect(isBildirimEnabled(u, "rapor")).toBe(true);
  });

  it("açıkça true kaydedilen tip açık", () => {
    const u = makeUser({ bildirimTercihleri: { sistem: true } });
    expect(isBildirimEnabled(u, "sistem")).toBe(true);
  });
});

describe("BILDIRIM_TIP_LABELS", () => {
  it("her tipin etiketi var", () => {
    for (const tip of TUM_BILDIRIM_TIPLERI) {
      expect(BILDIRIM_TIP_LABELS[tip]).toBeTruthy();
    }
    expect(TUM_BILDIRIM_TIPLERI.length).toBe(6);
  });
});
