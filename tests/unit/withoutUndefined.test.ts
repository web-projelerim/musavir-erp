import { describe, expect, it } from "vitest";
import { withoutUndefined } from "@/lib/firebase/firestore";

describe("withoutUndefined", () => {
  it("üst seviye undefined alanları atar", () => {
    expect(withoutUndefined({ a: 1, b: undefined, c: "x" })).toEqual({ a: 1, c: "x" });
  });

  it("iç içe nesnelerdeki undefined'ı temizler", () => {
    expect(withoutUndefined({ x: { a: 1, b: undefined } })).toEqual({ x: { a: 1 } });
  });

  it("dizi ELEMANI olan nesnelerin undefined alanlarını temizler (setDoc regresyonu)", () => {
    const input = {
      satirlar: [
        { id: "r1", tutar: 100, tahakkukId: undefined },
        { id: "r2", tutar: 200, tahakkukId: "tk-1" },
      ],
    };
    const out = withoutUndefined(input);
    expect(out).toEqual({
      satirlar: [
        { id: "r1", tutar: 100 },
        { id: "r2", tutar: 200, tahakkukId: "tk-1" },
      ],
    });
    // Hiçbir dizi elemanında undefined kalmamalı (Firestore reddeder)
    for (const s of (out.satirlar as Record<string, unknown>[])) {
      expect(Object.values(s).includes(undefined)).toBe(false);
    }
  });

  it("dizideki undefined elemanları atar", () => {
    expect(withoutUndefined({ a: [1, undefined, 2] })).toEqual({ a: [1, 2] });
  });

  it("null ve primitive değerleri ve primitive dizilerini korur", () => {
    expect(withoutUndefined({ a: null, b: 0, c: "", d: false, e: [1, 2, 3] })).toEqual({
      a: null,
      b: 0,
      c: "",
      d: false,
      e: [1, 2, 3],
    });
  });

  it("iç içe dizi/nesne kombinasyonunu derinlemesine temizler", () => {
    const input = { grup: [{ ad: "A", meta: { x: undefined, y: 1 } }] };
    expect(withoutUndefined(input)).toEqual({ grup: [{ ad: "A", meta: { y: 1 } }] });
  });
});
