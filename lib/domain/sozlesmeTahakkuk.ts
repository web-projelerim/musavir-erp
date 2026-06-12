/**
 * Sözleşmeden aylık tahakkuk türeten yardımcı (client + server kullanılabilir).
 * lib/integrations/gib/sozlesmeler.ts'in server-side versiyonunun client kuzeni.
 */

import type { GibSozlesme, Tahakkuk } from "@/lib/types";

/**
 * Verilen sözleşmeden belirli dönem için bir tahakkuk objesi türetir.
 * Brüt → Net → KDV → Stopaj (%20) → Tahsil edilecek
 */
export function sozlesmedenTahakkukTuretClient(
  sozlesme: GibSozlesme,
  donem: string, // "YYYY-MM"
  createdBy?: string
): Tahakkuk | null {
  if (!sozlesme.aylikUcret || sozlesme.aylikUcret <= 0) return null;
  if (sozlesme.durum !== "gecerli") return null;

  const brut = sozlesme.aylikUcret;
  const kdvOran = sozlesme.kdvOrani ?? 20;
  const net = brut / (1 + kdvOran / 100);
  const kdv = brut - net;
  const stopajOran = 20;
  const stopaj = net * (stopajOran / 100);
  const tahsil = brut - stopaj;
  const [yyyy, mm] = donem.split("-").map(Number);
  const sonGun = new Date(yyyy, mm, 0).toISOString().slice(0, 10);

  return {
    id: `tk-soz-${sozlesme.musteriId}-${donem}-${sozlesme.sozlesmeNo}`,
    ofisId: sozlesme.ofisId,
    musteriId: sozlesme.musteriId,
    musteriAdi: sozlesme.musteriAdi,
    donem,
    tahakkukTuru: "hizmet",
    hizmetTuru: "mali_musavirlik",
    tutar: brut,
    odenenTutar: 0,
    netTutar: net,
    kdvTutar: kdv,
    kdvOrani: kdvOran,
    stopajTutar: stopaj,
    stopajOrani: stopajOran,
    tahsilEdilecek: tahsil,
    vadeTarihi: sonGun,
    durum: "bekliyor",
    bildirimDurumu: "kapali",
    panelLinki: `/panel?tahakkuk=tk-soz-${sozlesme.musteriId}-${donem}`,
    aciklama: `Sözleşme ${sozlesme.sozlesmeNo} otomatik aylık tahakkuk (${donem})`,
    otomatikTuretilmis: true,
    createdBy: createdBy ?? "system",
    createdAt: new Date().toISOString(),
  };
}
