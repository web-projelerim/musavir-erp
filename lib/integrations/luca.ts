/**
 * Luca API entegrasyonu (Logo / Luca muhasebe yazılımı)
 * Base URL: https://api.luca.com.tr/v1
 *
 * Gerçek kimlik bilgileri .env.local dosyasına girilmelidir:
 *   LUCA_API_BASE_URL, LUCA_API_KEY, LUCA_COMPANY_CODE
 */

const LUCA_BASE    = process.env.LUCA_API_BASE_URL   ?? "https://api.luca.com.tr/v1";
const LUCA_KEY     = process.env.LUCA_API_KEY         ?? "";
const LUCA_COMPANY = process.env.LUCA_COMPANY_CODE    ?? "";

interface LucaHeaders {
  "Content-Type": string;
  Authorization: string;
  "X-Company-Code": string;
}

function headers(): LucaHeaders {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${LUCA_KEY}`,
    "X-Company-Code": LUCA_COMPANY,
  };
}

async function lucaFetch<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${LUCA_BASE}${path}`, {
    ...opts,
    headers: { ...headers(), ...opts?.headers },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`Luca API ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

// ─── Types ──────────────────────────────────────────────────────
export interface LucaMusteriKodu {
  musteriKodu: string;
  unvan: string;
  vkn: string;
}

export interface LucaHesapHareketi {
  tarih: string;
  belgeNo: string;
  hesapKodu: string;
  aciklama: string;
  borc: number;
  alacak: number;
  bakiye: number;
}

export interface LucaGelirGider {
  donem: string;
  gelir: number;
  gider: number;
  karZarar: number;
  kdvMatrahi: number;
  hesaplananKdv: number;
  indirimliKdv: number;
  odenmesiGerekenKdv: number;
}

export interface LucaFatura {
  faturaNo: string;
  tarih: string;
  musteriAdi: string;
  vkn: string;
  matrah: number;
  kdv: number;
  toplam: number;
  tur: "satis" | "alis";
}

export interface LucaMizan {
  hesapKodu: string;
  hesapAdi: string;
  borcToplam: number;
  alacakToplam: number;
  bakiye: number;
}

// ─── API Methods ────────────────────────────────────────────────
export const Luca = {
  /** Muhasebe sistemindeki müşteri kodlarını listele */
  async musteriKodlariniGetir(): Promise<LucaMusteriKodu[]> {
    return lucaFetch<LucaMusteriKodu[]>("/musteriler");
  },

  /** Belirli bir müşteri/hesap için hareket sorgula */
  async hesapHareketleri(
    musteriKodu: string,
    baslangic: string,
    bitis: string
  ): Promise<LucaHesapHareketi[]> {
    return lucaFetch<LucaHesapHareketi[]>(
      `/hareketler/${musteriKodu}?baslangic=${baslangic}&bitis=${bitis}`
    );
  },

  /** Dönem gelir gider özeti */
  async gelirGiderOzeti(musteriKodu: string, donem: string): Promise<LucaGelirGider> {
    return lucaFetch<LucaGelirGider>(`/gelir-gider/${musteriKodu}?donem=${donem}`);
  },

  /** Fatura listesi */
  async faturalariGetir(musteriKodu: string, donem: string): Promise<LucaFatura[]> {
    return lucaFetch<LucaFatura[]>(`/faturalar/${musteriKodu}?donem=${donem}`);
  },

  /** Mizan raporu */
  async mizanRaporu(donem: string): Promise<LucaMizan[]> {
    return lucaFetch<LucaMizan[]>(`/mizan?donem=${donem}`);
  },

  /** KDV2 beyanı için matrah bilgisi */
  async kdv2Matrah(musteriKodu: string, donem: string): Promise<{
    matrah: number;
    kdvOrani: number;
    kdvTutari: number;
    kdv2Tutari: number;
  }> {
    return lucaFetch(`/kdv2/${musteriKodu}?donem=${donem}`);
  },

  /** Toplu dönem senkronizasyonu */
  async donemSenkronize(donem: string): Promise<{ guncellenen: number; hata: number }> {
    return lucaFetch("/senkronize", { method: "POST", body: JSON.stringify({ donem }) });
  },
};

export function lucaMockMu(): boolean {
  return !LUCA_KEY || LUCA_KEY === "your_luca_api_key";
}
