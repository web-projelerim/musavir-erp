import { describe, expect, it } from "vitest";
import { maskVknTckn, canViewVknTckn, displayVknTckn } from "@/lib/utils/maskData";
import type { User } from "@/lib/types";

function makeUser(over: Partial<User>): User {
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

describe("maskVknTckn", () => {
  it("TCKN (11 hane) son 4 hane açık, kalanı maskeli", () => {
    expect(maskVknTckn("12345678901")).toBe("•••••••8901");
  });

  it("VKN (10 hane) son 4 hane açık", () => {
    expect(maskVknTckn("1234567890")).toBe("••••••7890");
  });

  it("boş değer boş döner", () => {
    expect(maskVknTckn("")).toBe("");
    expect(maskVknTckn(null)).toBe("");
    expect(maskVknTckn(undefined)).toBe("");
  });

  it("4 haneden kısa değer olduğu gibi döner", () => {
    expect(maskVknTckn("12")).toBe("12");
  });
});

describe("canViewVknTckn", () => {
  it("musavir her zaman görebilir", () => {
    expect(canViewVknTckn(makeUser({ rol: "musavir" }))).toBe(true);
  });

  it("mukellef kendi verisini görebilir", () => {
    expect(canViewVknTckn(makeUser({ rol: "mukellef", musteriId: "m1" }))).toBe(true);
  });

  it("null kullanıcı göremez", () => {
    expect(canViewVknTckn(null)).toBe(false);
  });
});

describe("displayVknTckn", () => {
  it("yetkili kullanıcıya açık gösterir", () => {
    expect(displayVknTckn("12345678901", makeUser({ rol: "musavir" }))).toBe("12345678901");
  });

  it("kimliği olmayan (null) kullanıcıya maskeli gösterir", () => {
    expect(displayVknTckn("12345678901", null)).toBe("•••••••8901");
  });

  it("boş değer boş döner (kullanıcıdan bağımsız)", () => {
    expect(displayVknTckn("", makeUser({ rol: "musavir" }))).toBe("");
  });
});
