import { describe, expect, it } from "vitest";
import { alanFarklari, auditLogsToCSV, farkDegeriMetin } from "@/lib/domain/auditFark";
import type { AuditLog } from "@/lib/types";

function log(over: Partial<AuditLog> = {}): AuditLog {
  return {
    id: "a1",
    actorId: "u1",
    actorName: "Ayşe Yılmaz",
    actorRole: "musavir",
    action: "update",
    entityType: "musteri",
    entityId: "m1",
    entityLabel: "Firma A",
    summary: "Müşteri güncellendi",
    createdAt: "2026-06-20T10:00:00Z",
    ...over,
  };
}

describe("alanFarklari", () => {
  it("değişen alanları listeler, değişmeyeni atlar", () => {
    const f = alanFarklari(
      log({ before: { unvan: "Eski AŞ", telefon: "111" }, after: { unvan: "Yeni AŞ", telefon: "111" } })
    );
    expect(f).toHaveLength(1);
    expect(f[0].alan).toBe("unvan");
    expect(f[0].onceki).toBe("Eski AŞ");
    expect(f[0].sonraki).toBe("Yeni AŞ");
  });

  it("gizli alanları (createdAt, updatedAt) atlar", () => {
    const f = alanFarklari(
      log({ before: { updatedAt: "1", x: 1 }, after: { updatedAt: "2", x: 2 } })
    );
    expect(f.map((d) => d.alan)).toEqual(["x"]);
  });

  it("eklenen/silinen alanları yakalar", () => {
    const f = alanFarklari(log({ before: { a: 1 }, after: { a: 1, b: 2 } }));
    expect(f).toHaveLength(1);
    expect(f[0].alan).toBe("b");
    expect(f[0].onceki).toBeUndefined();
  });

  it("before/after yoksa boş", () => {
    expect(alanFarklari(log())).toEqual([]);
  });
});

describe("farkDegeriMetin", () => {
  it("null/undefined → —", () => {
    expect(farkDegeriMetin(null)).toBe("—");
    expect(farkDegeriMetin(undefined)).toBe("—");
  });
  it("nesne → JSON", () => {
    expect(farkDegeriMetin({ a: 1 })).toBe('{"a":1}');
  });
});

describe("auditLogsToCSV", () => {
  it("başlık + satır üretir", () => {
    const csv = auditLogsToCSV([log()]);
    const satirlar = csv.split("\n");
    expect(satirlar[0]).toContain("Tarih");
    expect(satirlar[1]).toContain("Ayşe Yılmaz");
    expect(satirlar).toHaveLength(2);
  });

  it("virgül/tırnak içeren alanı kaçışlar", () => {
    const csv = auditLogsToCSV([log({ summary: 'Ad, "özel" değişti' })]);
    expect(csv).toContain('"Ad, ""özel"" değişti"');
  });

  it("değişen alanları özet sütununa yazar", () => {
    const csv = auditLogsToCSV([log({ before: { unvan: "A" }, after: { unvan: "B" } })]);
    expect(csv).toContain("unvan: A → B");
  });
});
