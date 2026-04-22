import type { Gorev, GorevNot } from "@/lib/types";

function createId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}`;
}

export function normalizeGorevNotlar(notlar: Gorev["notlar"]): GorevNot[] {
  if (!notlar) return [];

  if (Array.isArray(notlar)) {
    return notlar.filter((not) => not.metin?.trim());
  }

  if (notlar.trim()) {
    return [
      {
        id: createId("legacy-note"),
        metin: notlar,
        tarih: new Date().toISOString(),
        yazar: "Sistem",
      },
    ];
  }

  return [];
}

export function createGorevNot(metin: string, yazar = "Ali Musavir"): GorevNot {
  return {
    id: createId("note"),
    metin: metin.trim(),
    tarih: new Date().toISOString(),
    yazar,
  };
}
