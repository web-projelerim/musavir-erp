import type { RiskGecmisKaydi, RiskSeviyesi } from "@/lib/types";
import type { HesaplanmisRisk } from "@/lib/domain/risk";

/**
 * Hesaplanmış risk listesinden geçmişe yazılacak snapshot kayıtları üretir.
 * Çağıran katman bunları `riskGecmisi` koleksiyonuna yazar (örn. günlük cron).
 */
export function riskSnapshotOlustur(
  riskler: HesaplanmisRisk[],
  ofisId: string,
  tarih: string = new Date().toISOString()
): Omit<RiskGecmisKaydi, "id">[] {
  return riskler.map((r) => ({
    ofisId,
    musteriId: r.musteri.id,
    musteriAdi: r.musteri.firmaAdi,
    skor: r.skor,
    seviye: r.seviye,
    sinyaller: r.sinyaller?.slice(0, 5).map((s) => s.label),
    tarih,
  }));
}

export type RiskTrend = "artiyor" | "azaliyor" | "sabit" | "yeni";

/**
 * Bir müşterinin risk geçmişinden trend çıkarır (en yeni iki kaydı karşılaştırır).
 */
export function riskTrendi(gecmis: RiskGecmisKaydi[]): RiskTrend {
  if (gecmis.length === 0) return "yeni";
  const sirali = [...gecmis].sort((a, b) => b.tarih.localeCompare(a.tarih));
  if (sirali.length === 1) return "yeni";
  const fark = sirali[0].skor - sirali[1].skor;
  if (fark > 5) return "artiyor";
  if (fark < -5) return "azaliyor";
  return "sabit";
}

export interface RiskTrendOzeti {
  musteriId: string;
  guncelSkor: number;
  guncelSeviye: RiskSeviyesi;
  oncekiSkor?: number;
  degisim: number;
  trend: RiskTrend;
}

/** Müşteri bazında geçmişten güncel trend özeti (grafikler/dashboard için). */
export function riskTrendOzetleri(gecmis: RiskGecmisKaydi[]): RiskTrendOzeti[] {
  const grup = new Map<string, RiskGecmisKaydi[]>();
  for (const k of gecmis) {
    const liste = grup.get(k.musteriId) ?? [];
    liste.push(k);
    grup.set(k.musteriId, liste);
  }
  const sonuc: RiskTrendOzeti[] = [];
  for (const musteriId of Array.from(grup.keys())) {
    const kayitlar = grup.get(musteriId)!;
    const sirali = kayitlar.sort((a, b) => b.tarih.localeCompare(a.tarih));
    const guncel = sirali[0];
    const onceki = sirali[1];
    sonuc.push({
      musteriId,
      guncelSkor: guncel.skor,
      guncelSeviye: guncel.seviye,
      oncekiSkor: onceki?.skor,
      degisim: onceki ? guncel.skor - onceki.skor : 0,
      trend: riskTrendi(kayitlar),
    });
  }
  return sonuc.sort((a, b) => b.guncelSkor - a.guncelSkor);
}
