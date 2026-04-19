/**
 * GİB (Gelir İdaresi Başkanlığı) API entegrasyonu
 * Base URL: https://ebeyanname.gib.gov.tr/api/v1
 *
 * Gerçek kimlik bilgileri .env.local dosyasına girilmelidir:
 *   GIB_API_BASE_URL, GIB_API_KEY
 */

const GIB_BASE = process.env.GIB_API_BASE_URL ?? "https://ebeyanname.gib.gov.tr/api/v1";
const GIB_KEY  = process.env.GIB_API_KEY ?? "";

interface GIBHeaders {
  "Content-Type": string;
  Authorization: string;
  "X-API-Key": string;
}

function headers(): GIBHeaders {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${GIB_KEY}`,
    "X-API-Key": GIB_KEY,
  };
}

async function gibFetch<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${GIB_BASE}${path}`, {
    ...opts,
    headers: { ...headers(), ...opts?.headers },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`GIB API ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

// ─── Types ──────────────────────────────────────────────────────
export interface GIBMukellefBilgi {
  vkn: string;
  unvan: string;
  adres: string;
  vergiDairesi: string;
  vergiDairesiKodu: string;
  mukellefiyetTipleri: string[];
  aktif: boolean;
}

export interface GIBBeyanname {
  beyanId: string;
  vkn: string;
  beyannameTipi: string;
  donem: string;
  verildigiTarih?: string;
  sonTarih: string;
  durum: "verildi" | "bekliyor" | "gecikti";
  matrah?: number;
  odenenVergi?: number;
}

export interface GIBTebligat {
  tebligatNo: string;
  vkn: string;
  konu: string;
  tarih: string;
  tur: string;
  icerik?: string;
  pdfUrl?: string;
}

export interface GIBBorc {
  vkn: string;
  vergiTuru: string;
  donem: string;
  asilBorc: number;
  gecikmeZammi: number;
  toplamBorc: number;
  vadeTarihi: string;
}

// ─── API Methods ────────────────────────────────────────────────
export const GIB = {
  /** Mükellef bilgilerini VKN/TCKN ile sorgula */
  async mukellefSorgula(vkn: string): Promise<GIBMukellefBilgi> {
    return gibFetch<GIBMukellefBilgi>(`/mukellef/${vkn}`);
  },

  /** VKN'ye ait beyanname geçmişi */
  async beyannameleriGetir(vkn: string, yil?: number): Promise<GIBBeyanname[]> {
    const q = yil ? `?yil=${yil}` : "";
    return gibFetch<GIBBeyanname[]>(`/beyanname/${vkn}${q}`);
  },

  /** VKN'ye ait tebligatlar */
  async tebligatlariGetir(vkn: string): Promise<GIBTebligat[]> {
    return gibFetch<GIBTebligat[]>(`/tebligat/${vkn}`);
  },

  /** Vergi borçları */
  async borcSorgula(vkn: string): Promise<GIBBorc[]> {
    return gibFetch<GIBBorc[]>(`/borc/${vkn}`);
  },

  /** Beyanname PDF indir — returns blob URL */
  async beyannamePdfIndir(beyanId: string): Promise<string> {
    const res = await fetch(`${GIB_BASE}/beyanname/pdf/${beyanId}`, {
      headers: headers() as unknown as HeadersInit,
    });
    if (!res.ok) throw new Error(`GIB PDF ${res.status}`);
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  },

  /** Son 30 günlük yeni tebligatları kontrol et */
  async yeniTebligatlariKontrolEt(vknler: string[]): Promise<Record<string, number>> {
    return gibFetch<Record<string, number>>("/tebligat/toplu-kontrol", {
      method: "POST",
      body: JSON.stringify({ vknler }),
    });
  },
};

// ─── Mock fallback (Firebase config yokken dev ortamı için) ─────
export function gibMockMu(): boolean {
  return !GIB_KEY || GIB_KEY === "your_gib_api_key";
}
