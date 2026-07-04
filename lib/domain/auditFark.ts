import type { AuditLog } from "@/lib/types";

export interface AlanFarki {
  alan: string;
  onceki: unknown;
  sonraki: unknown;
}

/** Gösterimden gizlenecek/gürültü alanlar. */
const GIZLI_ALANLAR = new Set(["updatedAt", "guncellenmeTarihi", "createdAt", "id"]);

/**
 * before/after karşılaştırıp değişen alanları döndürür.
 * Yalnızca gerçekten değişen ve gizli olmayan alanlar listelenir.
 */
export function alanFarklari(log: Pick<AuditLog, "before" | "after">): AlanFarki[] {
  const before = log.before ?? {};
  const after = log.after ?? {};
  const tumAlanlar = new Set([...Object.keys(before), ...Object.keys(after)]);
  const farklar: AlanFarki[] = [];

  for (const alan of Array.from(tumAlanlar)) {
    if (GIZLI_ALANLAR.has(alan)) continue;
    const o = (before as Record<string, unknown>)[alan];
    const s = (after as Record<string, unknown>)[alan];
    if (JSON.stringify(o) !== JSON.stringify(s)) {
      farklar.push({ alan, onceki: o, sonraki: s });
    }
  }
  return farklar;
}

/** Fark değerini okunabilir string'e çevirir. */
export function farkDegeriMetin(deger: unknown): string {
  if (deger === undefined || deger === null) return "—";
  if (typeof deger === "object") return JSON.stringify(deger);
  return String(deger);
}

/** CSV alanı için güvenli kaçış (tırnak + virgül + yeni satır). */
function csvKacis(deger: unknown): string {
  const s = deger === undefined || deger === null ? "" : String(deger);
  if (/[",\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/**
 * Audit loglarını CSV'ye çevirir (Excel uyumlu — BOM'lu UTF-8 çağıran katmanda eklenebilir).
 */
export function auditLogsToCSV(loglar: AuditLog[]): string {
  const basliklar = [
    "Tarih",
    "Kullanıcı",
    "Rol",
    "İşlem",
    "Varlık Türü",
    "Varlık",
    "Özet",
    "Değişen Alanlar",
  ];
  const satirlar = loglar.map((log) => {
    const farklar = alanFarklari(log)
      .map((f) => `${f.alan}: ${farkDegeriMetin(f.onceki)} → ${farkDegeriMetin(f.sonraki)}`)
      .join("; ");
    return [
      log.createdAt ?? "",
      log.actorName ?? "",
      log.actorRole ?? "",
      log.action ?? "",
      log.entityType ?? "",
      log.entityLabel ?? "",
      log.summary ?? "",
      farklar,
    ]
      .map(csvKacis)
      .join(",");
  });
  return [basliklar.join(","), ...satirlar].join("\n");
}
