import { describe, expect, it } from "vitest";
import { toDateInputValue } from "@/lib/utils/format";

describe("toDateInputValue", () => {
  it("zaten yyyy-MM-dd olanı korur", () => {
    expect(toDateInputValue("2026-02-25")).toBe("2026-02-25");
  });

  it("tam Date string'ini yyyy-MM-dd'ye çevirir (React date input uyarısı fix)", () => {
    // "Wed Feb 25 2026 23:59:04 GMT+0300" gibi Date.toString() çıktısı
    expect(toDateInputValue("Wed Feb 25 2026 23:59:04 GMT+0300")).toBe("2026-02-25");
  });

  it("ISO datetime'ı yyyy-MM-dd'ye indirger", () => {
    expect(toDateInputValue("2026-02-25T21:00:00.000Z")).toBe("2026-02-25");
  });

  it("boş / undefined / null için boş string döner", () => {
    expect(toDateInputValue("")).toBe("");
    expect(toDateInputValue(undefined)).toBe("");
    expect(toDateInputValue(null)).toBe("");
  });

  it("geçersiz tarih için boş string döner", () => {
    expect(toDateInputValue("geçersiz")).toBe("");
  });
});
