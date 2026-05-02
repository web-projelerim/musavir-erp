import "server-only";

/**
 * GİB İnteraktif Vergi Dairesi (IVD) HTTP istemcisi.
 *
 * GİB'in kamuya açık resmi API'si bulunmamaktadır.
 * Bu dosya intvrg.gib.gov.tr servis katmanına yönelik HTTP çağrılarını yönetir.
 *
 * ⚠️  GİB sistemi değişti (2024): Eski tvd_server/dispatch → intvrg_server/assos-login
 * ⚠️  Login artık CAPTCHA gerektiriyor (assoscmd: multilogin).
 *     Captcha'yı /api/gib/captcha endpoint'i üzerinden çekin,
 *     kullanıcıya gösterin, çözümü bu client'a dk+imageID olarak iletin.
 */

import type { Beyanname, BeyannameType, Tahakkuk, VergiTahakkukTuru, Tebligat } from "@/lib/types";

const VERGI_TUR_MAP: Record<string, VergiTahakkukTuru> = {
  KDV: "KDV",
  MUHTAS: "MUHTASAR",
  MUHTASAR: "MUHTASAR",
  KURUM: "KURUMLAR",
  GELIR: "GELIR",
  GECICI: "GECICI_VERGI",
  DAMGA: "DAMGA",
  SGK: "SGK",
};

export interface IvdCredentials {
  vknTckn: string;
  kullaniciKodu: string;
  sifre: string;
  /** CAPTCHA çözümü — GİB yeni sistemde zorunlu */
  captchaDk: string;
  /** CAPTCHA görsel ID — /api/gib/captcha'dan alınır */
  captchaImageID: string;
}

export interface GibCaptcha {
  imageID: string;
  /** base64 encoded JPEG — <img src={`data:image/jpeg;base64,${...}`}> */
  imageBase64: string;
}

const BASE = "https://intvrg.gib.gov.tr";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

/**
 * Captcha session cookie'lerini geçici bellekte tutar.
 * Key: imageID, Value: cookie string + expiry
 * Not: Vercel gibi serverless ortamlarda bu işlevsel olmayabilir;
 * local dev ve tek-instance sunucular için yeterli.
 */
const cookieStore = new Map<string, { cookie: string; exp: number }>();

function saveCookie(imageID: string, cookie: string) {
  cookieStore.set(imageID, { cookie, exp: Date.now() + 10 * 60 * 1000 }); // 10 dk TTL
}

function getCookie(imageID: string): string {
  const entry = cookieStore.get(imageID);
  if (!entry || Date.now() > entry.exp) {
    cookieStore.delete(imageID);
    return "";
  }
  return entry.cookie;
}

/** Set-Cookie header'ından taşınabilir cookie string'i çıkar */
function parseCookies(headers: Headers): string {
  const raw = headers.getSetCookie?.() ?? [];
  if (raw.length > 0) {
    return raw.map((c) => c.split(";")[0]).join("; ");
  }
  // Eski Node.js uyumu
  const single = headers.get("set-cookie") ?? "";
  return single ? single.split(";")[0] : "";
}

/**
 * GİB'den captcha görselini çeker.
 * Session cookie'yi saklar; ivdLogin aynı cookie'yi kullanır.
 */
export async function fetchGibCaptcha(): Promise<GibCaptcha> {
  // 1. captchaImg.jsp → imageID + session cookie
  const imgPageRes = await fetch(`${BASE}/captcha/captchaImg.jsp`, {
    headers: { "User-Agent": UA, Referer: `${BASE}/` },
  });

  const sessionCookie = parseCookies(imgPageRes.headers);
  const imgPageHtml = await imgPageRes.text();
  console.log("[GİB Captcha] session cookie:", sessionCookie);
  console.log("[GİB Captcha] HTML snippet:", imgPageHtml.slice(0, 400));

  // imageID'yi name="imageID" veya name="cid" olan input'tan çıkar
  const byName =
    imgPageHtml.match(/name=["'](?:imageID|cid)["'][^>]*value=["']([^"']+)["']/i) ??
    imgPageHtml.match(/value=["']([^"']+)["'][^>]*name=["'](?:imageID|cid)["']/i);
  const cidMatch = byName ?? imgPageHtml.match(/value="([^"']+)"/);
  if (!cidMatch) throw new Error("GİB captcha ID alınamadı");
  const imageID = cidMatch[1];
  console.log("[GİB Captcha] imageID:", imageID);

  // Cookie'yi sakla (login isteğinde kullanılacak)
  if (sessionCookie) saveCookie(imageID, sessionCookie);

  // 2. Captcha görselini çek (cookie ile)
  const imgHeaders: Record<string, string> = { "User-Agent": UA, Referer: `${BASE}/` };
  if (sessionCookie) imgHeaders["Cookie"] = sessionCookie;

  const imgRes = await fetch(`${BASE}/captcha/jcaptcha?imageID=${imageID}`, { headers: imgHeaders });
  if (!imgRes.ok) throw new Error(`GİB captcha görseli alınamadı: HTTP ${imgRes.status}`);
  const imgBuffer = await imgRes.arrayBuffer();
  const imageBase64 = Buffer.from(imgBuffer).toString("base64");

  return { imageID, imageBase64 };
}

/**
 * IVD'ye captcha ile giriş yapar, oturum token'ı döndürür.
 * Token birden fazla müşteri için yeniden kullanılabilir —
 * her müşteri için ayrı login (ve captcha) gerekmez.
 */
export async function ivdLogin(creds: IvdCredentials): Promise<string> {
  if (!creds.captchaDk || !creds.captchaImageID) {
    throw new Error(
      "GİB IVD girişi için captcha gereklidir. " +
      "/api/gib/captcha endpoint'inden captcha alıp kullanıcıya gösterin."
    );
  }

  const body = new URLSearchParams({
    assoscmd: "multilogin",
    rtype: "json",
    userid: creds.kullaniciKodu,
    sifre: creds.sifre,
    parola: "maliye", // GİB sistem sabiti — değişmez
    dk: creds.captchaDk,
    imageID: creds.captchaImageID,
  });

  // Captcha session cookie'sini geri yükle — GİB bunu doğrulama için kullanıyor
  const sessionCookie = getCookie(creds.captchaImageID);
  console.log("[GİB IVD Login] Cookie:", sessionCookie || "(yok)");

  const loginHeaders: Record<string, string> = {
    "Content-Type": "application/x-www-form-urlencoded",
    "User-Agent": UA,
    Referer: `${BASE}/`,
  };
  if (sessionCookie) loginHeaders["Cookie"] = sessionCookie;

  const res = await fetch(`${BASE}/intvrg_server/assos-login`, {
    method: "POST",
    headers: loginHeaders,
    body: body.toString(),
  });

  if (!res.ok) {
    const rawText = await res.text().catch(() => "");
    console.error("[GİB IVD Login] HTTP hata:", res.status, rawText.slice(0, 500));
    throw new Error(`IVD login HTTP ${res.status}: ${rawText.slice(0, 200)}`);
  }

  const rawText = await res.text();
  console.log("[GİB IVD Login] Ham yanıt:", rawText.slice(0, 500));

  let json: Record<string, unknown> | null = null;
  try { json = JSON.parse(rawText); } catch { /* HTML yanıt gelebilir */ }

  if (!json) {
    throw new Error(`IVD login: JSON yanıt alınamadı. Ham yanıt: ${rawText.slice(0, 200)}`);
  }

  if (json?.error) {
    const mesaj = (json?.messages as { text?: string; type?: string }[])?.[0]?.text ?? String(json?.error);
    const tip = (json?.messages as { text?: string; type?: string }[])?.[0]?.type;
    console.error("[GİB IVD Login] Hata yanıtı:", JSON.stringify(json));
    if (tip === "5") {
      throw new Error(`Captcha hatalı: ${mesaj}`);
    }
    throw new Error(`IVD giriş başarısız: ${mesaj}`);
  }

  const token: string = (json?.token as string) ?? "";
  if (!token) {
    console.error("[GİB IVD Login] Token yok, yanıt:", JSON.stringify(json));
    throw new Error("IVD oturum token'ı alınamadı");
  }

  // GİB şifre yenileme zorunluluğunu logla — API çağrıları çalışmayabilir
  if (json?.chgpwd === "true" || json?.chgpwd === true) {
    console.warn("[GİB IVD Login] ⚠️  GİB şifre değişikliği gerekiyor (chgpwd=true). intvrg.gib.gov.tr adresinden şifrenizi yenileyin ve .env.local dosyasını güncelleyin.");
    throw new Error("GİB şifrenizin süresi dolmuş. intvrg.gib.gov.tr adresine girerek şifrenizi yenileyin, ardından .env.local dosyasındaki GIB_IVD_SIFRE değerini güncelleyin.");
  }

  return token;
}

/** Tebligatları çeker. `existingToken` verilirse yeni login yapmaz. */
export async function fetchTebligatlar(
  creds: IvdCredentials,
  musteriVkn?: string,
  existingToken?: string
): Promise<Omit<Tebligat, "id">[]> {
  const token = existingToken ?? await ivdLogin(creds);

  const res = await fetch(`${BASE}/intvrg_server/dispatch`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Token: token,
      "User-Agent": UA,
    },
    body: new URLSearchParams({
      assoscmd: "tebligat_liste",
      rtype: "json",
      vkn: musteriVkn ?? creds.vknTckn,
    }).toString(),
  });

  if (!res.ok) throw new Error(`Tebligat listesi HTTP ${res.status}`);
  const json = await res.json();
  const rows: Record<string, string>[] = json?.data ?? json?.liste ?? [];

  return rows.map((row): Omit<Tebligat, "id"> => ({
    musteriId: musteriVkn ?? "",
    musteriAdi: row.unvan ?? "",
    vknTckn: musteriVkn ?? creds.vknTckn,
    tarih: row.tarih ?? new Date().toISOString(),
    baslik: row.konu ?? row.baslik ?? "GİB Tebligatı",
    tur: row.tur ?? "idari",
    durum: "yeni",
    pdfUrl: row.pdfUrl,
  }));
}

/** Beyannameleri çeker. `existingToken` verilirse yeni login yapmaz. */
export async function fetchBeyannameler(
  creds: IvdCredentials,
  musteriVkn?: string,
  existingToken?: string
): Promise<Omit<Beyanname, "id">[]> {
  const token = existingToken ?? await ivdLogin(creds);

  const res = await fetch(`${BASE}/intvrg_server/dispatch`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Token: token,
      "User-Agent": UA,
    },
    body: new URLSearchParams({
      assoscmd: "beyanname_liste",
      rtype: "json",
      vkn: musteriVkn ?? creds.vknTckn,
    }).toString(),
  });

  if (!res.ok) throw new Error(`Beyanname listesi HTTP ${res.status}`);
  const rawText = await res.text();
  console.log(`[GİB Beyanname] VKN ${musteriVkn} yanıt:`, rawText.slice(0, 600));
  let json: Record<string, unknown> = {};
  try { json = JSON.parse(rawText); } catch { /* HTML geldi */ }
  const rows: Record<string, string>[] = (json?.data ?? json?.liste ?? []) as Record<string, string>[];

  const TUR_MAP: Record<string, BeyannameType> = {
    KDV: "KDV", MUHTAS: "MUHTAS", KURUM: "KURUM",
    GELIR: "GELIR", GECICI: "GECICI",
  };

  return rows.map((row): Omit<Beyanname, "id"> => ({
    musteriId: musteriVkn ?? "",
    musteriAdi: row.unvan ?? "",
    tur: TUR_MAP[row.beyannameKodu?.toUpperCase() ?? ""] ?? "DIGER",
    donem: row.donem ?? "",
    sonTarih: row.sonTarih ?? new Date().toISOString(),
    durum: row.durum === "V" ? "verildi" : "bekliyor",
    yasamDongusuDurum: row.durum === "V" ? "kapandi" : "planlandi",
    sorumlu: "",
    kaynakSistem: "gib",
  }));
}

/** Vergi borç/tahakkuk listesini çeker. `existingToken` verilirse yeni login yapmaz. */
export async function fetchBorcListesi(
  creds: IvdCredentials,
  musteriVkn?: string,
  existingToken?: string
): Promise<Omit<Tahakkuk, "id" | "ofisId">[]> {
  const token = existingToken ?? await ivdLogin(creds);
  const vkn = musteriVkn ?? creds.vknTckn;

  const res = await fetch(`${BASE}/intvrg_server/dispatch`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Token: token,
      "User-Agent": UA,
    },
    body: new URLSearchParams({
      assoscmd: "borc_listesi",
      rtype: "json",
      vkn,
    }).toString(),
  });

  if (!res.ok) throw new Error(`Borç listesi HTTP ${res.status}`);
  const json = await res.json();
  const rows: Record<string, string>[] = json?.data ?? json?.liste ?? [];

  return rows.map((row): Omit<Tahakkuk, "id" | "ofisId"> => {
    const vergiTuruRaw = (row.vergiTuru ?? row.vergikodu ?? "").toUpperCase();
    const vergiTuru: VergiTahakkukTuru = VERGI_TUR_MAP[vergiTuruRaw] ?? "DIGER";
    const tutar = parseFloat(row.borcTutari ?? row.tutar ?? "0") || 0;
    const vadeTarihi = row.vade ?? row.sonOdemeTarihi ?? new Date().toISOString().slice(0, 10);
    const donem = row.donem ?? row.vergiDonemi ?? vadeTarihi.slice(0, 7);
    return {
      musteriId: vkn,
      musteriAdi: row.unvan ?? "",
      donem,
      tahakkukTuru: "vergi",
      vergiTuru,
      resmiTahakkukFisNo: row.fisNo ?? row.tahakkukNo,
      kaynakSistem: "gib",
      otomatikTuretilmis: false,
      tutar,
      odenenTutar: parseFloat(row.odenenTutar ?? "0") || 0,
      vadeTarihi,
      durum: tutar <= 0 ? "odendi" : "bekliyor",
      bildirimDurumu: "kapali",
      panelLinki: "/panel",
      aciklama: row.aciklama,
      createdBy: "gib-sync",
      createdAt: new Date().toISOString(),
    };
  });
}

/** Mükellef durumunu sorgular. `existingToken` verilirse yeni login yapmaz. */
export async function fetchMukellefDurumu(
  creds: IvdCredentials,
  musteriVkn: string,
  existingToken?: string
): Promise<{ aktif: boolean; vergiDairesi?: string; mesaj?: string }> {
  const token = existingToken ?? await ivdLogin(creds);

  const res = await fetch(`${BASE}/intvrg_server/dispatch`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Token: token,
      "User-Agent": UA,
    },
    body: new URLSearchParams({
      assoscmd: "mukellef_durum",
      rtype: "json",
      vkn: musteriVkn,
    }).toString(),
  });

  if (!res.ok) return { aktif: false, mesaj: `HTTP ${res.status}` };
  const json = await res.json().catch(() => ({}));
  return {
    aktif: json?.aktif === true || json?.durum === "aktif",
    vergiDairesi: json?.vergiDairesi ?? json?.vd,
    mesaj: json?.mesaj,
  };
}
