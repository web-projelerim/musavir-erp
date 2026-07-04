import type { SyncJob, SyncJobTur } from "@/lib/types";

export const VARSAYILAN_MAX_DENEME = 3;

/** İdempotency anahtarı üretir — aynı iş+kapsam için deterministik. */
export function idempotencyKey(tur: SyncJobTur, ofisId: string, kapsam?: string): string {
  return kapsam ? `${tur}:${ofisId}:${kapsam}` : `${tur}:${ofisId}`;
}

/** Yeni kuyruk kaydı için başlangıç değerleri. */
export function yeniSyncJob(
  tur: SyncJobTur,
  ofisId: string,
  olusturan: string,
  opts?: { kapsam?: string; payload?: Record<string, unknown>; maxDeneme?: number }
): Omit<SyncJob, "id" | "createdAt"> {
  return {
    ofisId,
    tur,
    durum: "kuyrukta",
    idempotencyKey: idempotencyKey(tur, ofisId, opts?.kapsam),
    payload: opts?.payload,
    deneme: 0,
    maxDeneme: opts?.maxDeneme ?? VARSAYILAN_MAX_DENEME,
    olusturan,
  };
}

/**
 * Üstel backoff ile bir sonraki deneme zamanını hesaplar.
 * deneme 1 → 1dk, 2 → 2dk, 3 → 4dk ... (2^(deneme-1) dakika)
 */
export function sonrakiDenemeZamani(deneme: number, ref: Date = new Date()): string {
  const dakika = Math.pow(2, Math.max(0, deneme - 1));
  return new Date(ref.getTime() + dakika * 60_000).toISOString();
}

/** İş başarısız olduğunda: yeniden denenebilir mi, yoksa kalıcı hata mı? */
export function basarisizGuncelle(
  job: Pick<SyncJob, "deneme" | "maxDeneme">,
  hata: string,
  ref: Date = new Date()
): Pick<SyncJob, "durum" | "deneme" | "sonHata" | "sonrakiDeneme" | "bitisTarihi"> {
  const yeniDeneme = job.deneme + 1;
  if (yeniDeneme >= job.maxDeneme) {
    return {
      durum: "basarisiz",
      deneme: yeniDeneme,
      sonHata: hata,
      bitisTarihi: ref.toISOString(),
    };
  }
  return {
    durum: "kuyrukta",
    deneme: yeniDeneme,
    sonHata: hata,
    sonrakiDeneme: sonrakiDenemeZamani(yeniDeneme, ref),
  };
}

/** İş çalışmaya hazır mı? (kuyrukta ve backoff süresi dolmuş) */
export function calismayaHazir(job: Pick<SyncJob, "durum" | "sonrakiDeneme">, ref: Date = new Date()): boolean {
  if (job.durum !== "kuyrukta") return false;
  if (!job.sonrakiDeneme) return true;
  return new Date(job.sonrakiDeneme).getTime() <= ref.getTime();
}
