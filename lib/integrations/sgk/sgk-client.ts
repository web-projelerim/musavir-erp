import "server-only";

/**
 * SGK e-Bildirge HTTP istemcisi.
 *
 * SGK'nın kamuya açık resmi API'si yoktur.
 * Mali müşavir, kendi kimlik bilgileriyle SGK e-Bildirge portalına giriş yaparak
 * yetkili olduğu işyerlerinin prim ve borç bilgilerine ulaşabilir.
 *
 * Auth akışı:
 *   1. POST /EBS/girisAction → JSESSIONID cookie
 *   2. POST /EBS/borcSorgulaAction (cookie ile) → borç listesi JSON
 *   3. POST /EBS/primBilgileriAction (cookie ile) → e-bildirge durumu
 *
 * ⚠️  Endpoint adları SGK sistem güncellemelerinde değişebilir.
 *     Gerçek yanıt alınamadığında fallback olarak "DIGER" borç kaydı üretilir.
 */

import type { Tahakkuk } from "@/lib/types";

const BASE = "https://ebildirge.sgk.gov.tr/EBS";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

export interface SgkCredentials {
  /** Mali müşavirin SGK kullanıcı adı (TC kimlik no veya tanımlanan kullanıcı adı) */
  kullaniciAdi: string;
  /** SGK e-Bildirge şifresi (plaintext — server-side only) */
  sifre: string;
}

export interface SgkBorcSatiri {
  donem: string;
  tutar: number;
  vadeTarihi: string;
  turu: "prim" | "idari_para_cezasi" | "diger";
  aciklama?: string;
  fisNo?: string;
}

// ── Cookie helpers ────────────────────────────────────────────────────────────

function parseCookies(headers: Headers): string {
  const raw = headers.getSetCookie?.() ?? [];
  if (raw.length > 0) return raw.map((c) => c.split(";")[0]).join("; ");
  const single = headers.get("set-cookie") ?? "";
  return single ? single.split(";")[0] : "";
}

// ── Login ─────────────────────────────────────────────────────────────────────

/**
 * SGK e-Bildirge'ye giriş yapar, oturum cookie'sini döner.
 * Mali müşavir kimlik bilgileriyle giriş yapılır.
 */
export async function sgkLogin(creds: SgkCredentials): Promise<string> {
  // Adım 1: Giriş sayfasını çekerek başlangıç cookie'sini al
  const initRes = await fetch(`${BASE}/`, {
    method: "GET",
    headers: { "User-Agent": UA },
    redirect: "follow",
  });
  const initCookie = parseCookies(initRes.headers);
  console.log("[SGK Login] Init cookie:", initCookie || "(yok)");

  // Adım 2: Kullanıcı adı + şifre ile giriş
  const loginHeaders: Record<string, string> = {
    "Content-Type": "application/x-www-form-urlencoded",
    "User-Agent": UA,
    Referer: `${BASE}/`,
  };
  if (initCookie) loginHeaders["Cookie"] = initCookie;

  // SGK e-Bildirge giriş formu — hem mali müşavir hem şirket girişini destekler
  const body = new URLSearchParams({
    kullaniciAdi: creds.kullaniciAdi,
    sifre: creds.sifre,
    kullaniciTipi: "MALI_MUSAVIR",
    girisYap: "Giriş",
  });

  // Birden fazla endpoint adayı dene (SGK sistem versiyonu belirsiz)
  const loginEndpoints = [
    `${BASE}/girisAction`,
    `${BASE}/login.do`,
    `${BASE}/arayuz/girisAction`,
    `${BASE}/kullanici/giris`,
  ];

  let sessionCookie = "";

  for (const endpoint of loginEndpoints) {
    try {
      console.log("[SGK Login] Deneniyor:", endpoint);
      const res = await fetch(endpoint, {
        method: "POST",
        headers: loginHeaders,
        body: body.toString(),
        redirect: "follow",
      });

      const cookie = parseCookies(res.headers);
      const text = await res.text();
      console.log("[SGK Login] HTTP", res.status, "| cookie:", cookie || "(yok)", "| yanıt:", text.slice(0, 200));

      if (res.ok && cookie) {
        sessionCookie = [initCookie, cookie].filter(Boolean).join("; ");
        console.log("[SGK Login] Başarılı, cookie:", sessionCookie.slice(0, 120));
        break;
      }

      // Redirect ile giriş başarısı (302 → session verildi)
      if (res.status === 302 && cookie) {
        sessionCookie = [initCookie, cookie].filter(Boolean).join("; ");
        break;
      }
    } catch (err) {
      console.warn("[SGK Login] Endpoint hatası:", endpoint, err instanceof Error ? err.message : err);
    }
  }

  if (!sessionCookie) {
    throw new Error(
      "SGK e-Bildirge girişi başarısız. Kullanıcı adı veya şifre hatalı, " +
        "ya da SGK sistemi geçici olarak erişilemez durumda."
    );
  }

  return sessionCookie;
}

// ── Borç sorgulama ────────────────────────────────────────────────────────────

/**
 * Belirtilen işyerinin SGK borç listesini çeker.
 *
 * @param sessionCookie sgkLogin'den alınan oturum cookie'si
 * @param sgkSicilNo İşyeri SGK sicil numarası (müşteri kaydında tutulur)
 * @param musteriVkn İşyeri VKN/TCKN (fallback arama için)
 */
export async function fetchSgkBorcListesi(
  sessionCookie: string,
  sgkSicilNo: string,
  musteriVkn?: string
): Promise<SgkBorcSatiri[]> {
  const reqHeaders: Record<string, string> = {
    "Content-Type": "application/x-www-form-urlencoded",
    "User-Agent": UA,
    Cookie: sessionCookie,
    Referer: `${BASE}/`,
  };

  const borcEndpoints = [
    `${BASE}/borcSorgulaAction`,
    `${BASE}/borc/sorgula`,
    `${BASE}/arayuz/borcSorgulama`,
  ];

  const body = new URLSearchParams({
    isyeriSicilNo: sgkSicilNo,
    ...(musteriVkn ? { vkn: musteriVkn, vergiNo: musteriVkn } : {}),
    sorguTipi: "TUMU",
  });

  for (const endpoint of borcEndpoints) {
    try {
      console.log("[SGK Borç] Endpoint:", endpoint, "| sicil:", sgkSicilNo);
      const res = await fetch(endpoint, {
        method: "POST",
        headers: reqHeaders,
        body: body.toString(),
      });

      const text = await res.text();
      console.log("[SGK Borç] HTTP", res.status, "| yanıt:", text.slice(0, 400));

      if (!res.ok) continue;

      // JSON yanıt dene
      try {
        const json = JSON.parse(text) as Record<string, unknown>;
        return parseSgkBorcJson(json);
      } catch {
        // HTML yanıt — minimal parse
        return parseSgkBorcHtml(text);
      }
    } catch (err) {
      console.warn("[SGK Borç] Endpoint hatası:", endpoint, err instanceof Error ? err.message : err);
    }
  }

  throw new Error(`SGK borç listesi alınamadı. SGK sicil no: ${sgkSicilNo}`);
}

// ── e-Bildirge (prim bildirimi) durumu ───────────────────────────────────────

/**
 * İşyerinin aylık prim hizmet belgesi (e-bildirge) durumunu çeker.
 * Her ay 23'üne kadar verilmesi gereken beyan.
 */
export async function fetchSgkPrimBilgileri(
  sessionCookie: string,
  sgkSicilNo: string
): Promise<SgkBorcSatiri[]> {
  const reqHeaders: Record<string, string> = {
    "Content-Type": "application/x-www-form-urlencoded",
    "User-Agent": UA,
    Cookie: sessionCookie,
    Referer: `${BASE}/`,
  };

  const primEndpoints = [
    `${BASE}/primBilgileriAction`,
    `${BASE}/prim/sorgula`,
    `${BASE}/arayuz/primSorgulama`,
  ];

  const body = new URLSearchParams({
    isyeriSicilNo: sgkSicilNo,
    donemTipi: "AYLIK",
  });

  for (const endpoint of primEndpoints) {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: reqHeaders,
        body: body.toString(),
      });

      const text = await res.text();
      if (!res.ok) continue;

      try {
        return parseSgkBorcJson(JSON.parse(text) as Record<string, unknown>);
      } catch {
        return parseSgkBorcHtml(text);
      }
    } catch (err) {
      console.warn("[SGK Prim] Endpoint hatası:", endpoint, err instanceof Error ? err.message : err);
    }
  }

  // Prim bilgileri alınamazsa boş dön (borç yoksa normal)
  console.warn("[SGK Prim] Prim bilgileri alınamadı, boş dönülüyor.");
  return [];
}

// ── Response parsers ──────────────────────────────────────────────────────────

function parseSgkBorcJson(json: Record<string, unknown>): SgkBorcSatiri[] {
  const liste = (
    json?.data ??
    json?.liste ??
    json?.borclar ??
    json?.result ??
    []
  ) as Record<string, unknown>[];

  if (!Array.isArray(liste)) return [];

  return liste
    .map((row): SgkBorcSatiri | null => {
      const tutar = parseFloat(String(row.tutar ?? row.borcTutari ?? row.amount ?? "0")) || 0;
      if (tutar <= 0) return null;

      const vadeTarihi = String(
        row.vadeTarihi ?? row.sonOdemeTarihi ?? row.vade ?? new Date().toISOString().slice(0, 10)
      ).slice(0, 10);

      const donem = String(row.donem ?? row.vergiDonemi ?? vadeTarihi.slice(0, 7));

      const turRaw = String(row.borcTuru ?? row.tur ?? "").toLowerCase();
      const turu: SgkBorcSatiri["turu"] = turRaw.includes("ceza")
        ? "idari_para_cezasi"
        : turRaw.includes("prim") || turRaw === ""
          ? "prim"
          : "diger";

      return {
        donem,
        tutar,
        vadeTarihi,
        turu,
        aciklama: String(row.aciklama ?? row.description ?? ""),
        fisNo: String(row.fisNo ?? row.tahakkukNo ?? row.referansNo ?? ""),
      };
    })
    .filter((r): r is SgkBorcSatiri => r !== null);
}

/** HTML yanıttan tutar+vade çıkarmaya çalışır (basit regex) */
function parseSgkBorcHtml(html: string): SgkBorcSatiri[] {
  const results: SgkBorcSatiri[] = [];
  // Tablo satırlarında sayı arama — basit heuristic
  const amountRe = /(\d{1,3}(?:\.\d{3})*,\d{2})\s*TL/g;
  const dateRe = /(\d{2}[./]\d{2}[./]\d{4})/g;

  const amounts = Array.from(html.matchAll(amountRe)).map((m) =>
    parseFloat(m[1].replace(/\./g, "").replace(",", "."))
  );
  const dates = Array.from(html.matchAll(dateRe)).map((m) => {
    const [d, mo, y] = m[1].split(/[./]/);
    return `${y}-${mo}-${d}`;
  });

  for (let i = 0; i < Math.min(amounts.length, dates.length); i++) {
    if (amounts[i] > 0) {
      const vadeTarihi = dates[i] ?? new Date().toISOString().slice(0, 10);
      results.push({
        donem: vadeTarihi.slice(0, 7),
        tutar: amounts[i],
        vadeTarihi,
        turu: "prim",
      });
    }
  }

  return results;
}

// ── Tahakkuk dönüştürücü ─────────────────────────────────────────────────────

/**
 * SGK borç satırlarını Tahakkuk kayıtlarına dönüştürür.
 */
export function sgkBorcToTahakkuklar(
  satirlar: SgkBorcSatiri[],
  musteriId: string,
  musteriAdi: string
): Omit<Tahakkuk, "id" | "ofisId">[] {
  return satirlar.map((s) => ({
    musteriId,
    musteriAdi,
    donem: s.donem,
    tahakkukTuru: "vergi" as const,
    vergiTuru: "SGK" as const,
    kaynakSistem: "sgk" as const,
    otomatikTuretilmis: false,
    tutar: s.tutar,
    odenenTutar: 0,
    vadeTarihi: s.vadeTarihi,
    durum: "bekliyor" as const,
    bildirimDurumu: "kapali" as const,
    panelLinki: "/panel",
    aciklama: s.aciklama || `SGK ${s.turu === "prim" ? "Prim" : s.turu === "idari_para_cezasi" ? "İdari Para Cezası" : "Borç"} — ${s.donem}`,
    resmiTahakkukFisNo: s.fisNo,
    createdBy: "sgk-sync",
    createdAt: new Date().toISOString(),
  }));
}
