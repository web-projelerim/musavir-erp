import "server-only";

/**
 * GİB İnteraktif Vergi Dairesi (IVD) HTTP istemcisi.
 *
 * GİB'in kamuya açık resmi API'si bulunmamaktadır.
 *
 * Auth akışı:
 *   1. Captcha: intvrg.gib.gov.tr/captcha/captchaImg.jsp → imageID + sessionCookie
 *   2. Login:   intvrg.gib.gov.tr/intvrg_server/assos-login (assoscmd=multilogin) → TOKEN
 *   3. Dispatch: ebeyanname.gib.gov.tr/dispatch (cmd=X, TOKEN=Y body param) → veri
 *
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
  /**
   * GİB captcha session cookie'si.
   * Serverless ortamda login isteğiyle birlikte geri gönderilmeli;
   * /api/gib/bulk-sync ve /api/gib/sync body'sine captchaSessionCookie olarak ekleyin.
   */
  sessionCookie: string;
}

/** Captcha ve login sunucusu */
const BASE = "https://intvrg.gib.gov.tr";
/** Dispatch (veri sorgulama) sunucusu */
const DISPATCH_BASE = "https://ebeyanname.gib.gov.tr";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

// ── Cookie stores ─────────────────────────────────────────────────────────

const cookieStore = new Map<string, { cookie: string; exp: number }>();

function saveCookie(imageID: string, cookie: string) {
  cookieStore.set(imageID, { cookie, exp: Date.now() + 10 * 60 * 1000 });
}

function getCookie(imageID: string): string {
  const entry = cookieStore.get(imageID);
  if (!entry || Date.now() > entry.exp) {
    cookieStore.delete(imageID);
    return "";
  }
  return entry.cookie;
}

/** Login sonrası oturum cookie'leri: token → cookie string */
const loginCookieStore = new Map<string, string>();
function saveLoginCookie(token: string, cookie: string) {
  loginCookieStore.set(token, cookie);
}
function getLoginCookie(token: string): string {
  return loginCookieStore.get(token) ?? "";
}

/**
 * Serverless cold-start sonrası Firestore cache'den yüklenen cookie'yi
 * in-memory store'a geri yükler. bulk-sync route'u tarafından çağrılır.
 */
export function restoreLoginCookie(token: string, cookie: string): void {
  if (token && cookie) saveLoginCookie(token, cookie);
}

/** bulk-sync'in token cache'e yazması için mevcut cookie'yi döner */
export function getLoginCookieForCaching(token: string): string {
  return getLoginCookie(token);
}

/**
 * Captcha session cookie'sini in-memory store'a geri yükler.
 * Serverless ortamda /api/gib/captcha farklı bir instance'da çalıştığından
 * client cookie'yi geri gönderir; sync route'ları bu fonksiyonla restore eder.
 */
export function restoreCaptchaCookie(imageID: string, cookie: string): void {
  if (imageID && cookie) saveCookie(imageID, cookie);
}

/** Set-Cookie header'ından taşınabilir cookie string'i çıkar */
function parseCookies(headers: Headers): string {
  const raw = headers.getSetCookie?.() ?? [];
  if (raw.length > 0) {
    return raw.map((c) => c.split(";")[0]).join("; ");
  }
  const single = headers.get("set-cookie") ?? "";
  return single ? single.split(";")[0] : "";
}

// ── Token Exchange (intvrg TOKEN → ebeyanname session cookie) ────────────

/**
 * IVD login'den alınan TOKEN'ı ebeyanname.gib.gov.tr domain'ine taşır.
 * Browser'da login sonrası otomatik gerçekleşen redirect'i simüle eder:
 *   GET ebeyanname.gib.gov.tr/dispatch?cmd=LOGIN&TOKEN=<token>
 *   → Set-Cookie: JSESSIONID=... (ebeyanname domain session cookie)
 *
 * Bu adım atlanırsa dispatch çağrıları session bulamaz → hata.
 */
async function exchangeTokenOnEbeyanname(token: string): Promise<string> {
  try {
    const url = `${DISPATCH_BASE}/dispatch?cmd=LOGIN&TOKEN=${encodeURIComponent(token)}`;
    console.log("[GİB Token Exchange] İstek:", url.slice(0, 120));
    const res = await fetch(url, {
      method: "GET",
      headers: { "User-Agent": UA, Referer: `${DISPATCH_BASE}/` },
      redirect: "follow",
    });
    const cookie = parseCookies(res.headers);
    console.log(
      "[GİB Token Exchange] Sonuç HTTP",
      res.status,
      "| session cookie:",
      cookie ? cookie.slice(0, 80) : "(cookie yok — devam)"
    );
    return cookie;
  } catch (err) {
    // Exchange başarısız olursa TOKEN body param ile devam et (fallback)
    console.warn("[GİB Token Exchange] Hata (TOKEN body ile devam):", err instanceof Error ? err.message : err);
    return "";
  }
}

// ── Identifier param resolver ─────────────────────────────────────────────

/**
 * GİB dispatch çağrısında mükellef tanımlayıcısı için denenen parametre adları.
 * Sistem assoscmd başına hangisinin çalıştığını keşfeder ve cache'ler.
 */
const IDENTIFIER_CANDIDATES = ["vkn", "mvkn", "mukellefVkn", "tckn"] as const;
type IdentifierParam = (typeof IDENTIFIER_CANDIDATES)[number];

/**
 * Dispatch başına keşfedilen identifier param adını tutar.
 * Key: "gib.dispatch.param.${dispatchName}.identifierParamName"
 * Value: çalışan param adı ("vkn", "mvkn", vb.)
 */
const identifierParamCache = new Map<string, IdentifierParam>();

function identifierCacheKey(dispatchName: string): string {
  return `gib.dispatch.param.${dispatchName}.identifierParamName`;
}

/**
 * Oturum, yetki veya bakım kaynaklı gerçek GİB hatası mı?
 * Bu hatalarda identifier param alternatifleri denenmez, doğrudan fırlatılır.
 */
function isRealGibError(hata: { type: string; text: string }): boolean {
  const t = hata.text.toLowerCase();
  return (
    hata.type === "5" || // captcha hatası
    t.includes("oturum") ||
    t.includes("yetkisiz") ||
    t.includes("yetki") ||
    t.includes("bakım") ||
    t.includes("unauthorized") ||
    t.includes("token geçersiz") ||
    t.includes("süresi doldu") ||
    t.includes("expired")
  );
}

/**
 * Servis parametre hatası mı? (farklı identifier adayı denenebilir)
 * GİB type "1" = "Servis parametreleri hatalı"
 */
function isParamDiscoveryError(hata: { type: string; text: string }): boolean {
  if (isRealGibError(hata)) return false;
  const t = hata.text.toLowerCase();
  return hata.type === "1" || t.includes("parametre") || t.includes("geçersiz parametre");
}

/**
 * Tüm identifier adayları tüketildiğinde fırlatılır.
 * assoscmd adı yanlışsa da bu hata üretilir; yakalayıcı bir üst komutu deneyebilir.
 */
class GibIdentifierParamError extends Error {
  readonly dispatchName: string;
  constructor(dispatchName: string) {
    super(
      `GİB ${dispatchName}: Desteklenen tanımlayıcı parametre belirlenemedi. ` +
        `Lütfen GİB entegrasyon ayarlarınızı kontrol edin.`
    );
    this.name = "GibIdentifierParamError";
    this.dispatchName = dispatchName;
  }
}

/**
 * Tüm gibDispatch çağrılarının geçtiği merkezi resolver.
 *
 * - assoscmd (dispatchName) bazlı identifier param adını keşfeder ve cache'ler.
 * - Cache geçersizse siler ve adayları yeniden dener.
 * - Oturum / yetki / bakım hatalarında fallback yapmaz, doğrudan fırlatır.
 *
 * @throws {GibIdentifierParamError} Tüm identifier adayları tükendi
 * @throws {Error} Gerçek GİB hatası (oturum/yetki/bakım)
 */
async function gibDispatchResolved(
  token: string,
  dispatchName: string,
  identifierValue: string,
  extraParams?: Record<string, string>,
  cookie?: string
): Promise<Record<string, unknown>> {
  const ck = identifierCacheKey(dispatchName);
  const cached = identifierParamCache.get(ck);

  // Cache hit — önce cache'deki adı dene
  if (cached !== undefined) {
    const json = await gibDispatch(
      token,
      { cmd: dispatchName, [cached]: identifierValue, ...extraParams },
      cookie
    );
    const hata = extractGibHata(json);
    if (!hata) return json;
    if (isRealGibError(hata)) throw new Error(`GİB ${dispatchName} hatası: ${hata.text}`);
    if (isParamDiscoveryError(hata)) {
      identifierParamCache.delete(ck); // cache geçersiz — yeniden keşfet
    } else {
      throw new Error(`GİB ${dispatchName} hatası: ${hata.text}`);
    }
  }

  // Identifier param adaylarını sırayla dene
  for (const candidate of IDENTIFIER_CANDIDATES) {
    const json = await gibDispatch(
      token,
      { cmd: dispatchName, [candidate]: identifierValue, ...extraParams },
      cookie
    );
    const hata = extractGibHata(json);
    if (!hata) {
      identifierParamCache.set(ck, candidate);
      return json;
    }
    if (isRealGibError(hata)) throw new Error(`GİB ${dispatchName} hatası: ${hata.text}`);
    if (!isParamDiscoveryError(hata)) throw new Error(`GİB ${dispatchName} hatası: ${hata.text}`);
    // Parametre hatası → sonraki adayı dene
  }

  throw new GibIdentifierParamError(dispatchName);
}

// ── Raw dispatcher ────────────────────────────────────────────────────────

/**
 * GİB dispatch endpoint'ine POST atar, ham JSON döner.
 * Doğrudan çağrılmaz — tüm çağrılar gibDispatchResolved üzerinden geçer.
 *
 * ebeyanname.gib.gov.tr/dispatch kullanır:
 *  - cmd=<komut>    (eski: assoscmd=)
 *  - TOKEN=<token>  body param (eski: Token: header)
 */
async function gibDispatch(
  token: string,
  params: Record<string, string>,
  cookie?: string
): Promise<Record<string, unknown>> {
  const headers: Record<string, string> = {
    "Content-Type": "application/x-www-form-urlencoded",
    "User-Agent": UA,
    Referer: `${DISPATCH_BASE}/`,
  };
  if (cookie) headers["Cookie"] = cookie;

  // TOKEN body'de — header'da değil
  const body = new URLSearchParams({ TOKEN: token, rtype: "json", ...params }).toString();
  console.log(`[GİB Dispatch] cmd=${params.cmd} | body=${body.slice(0, 200)}`);

  const res = await fetch(`${DISPATCH_BASE}/dispatch`, {
    method: "POST",
    headers,
    body,
  });

  const rawText = await res.text();
  console.log(`[GİB Dispatch] yanıt (${res.status}):`, rawText.slice(0, 600));

  if (!res.ok) throw new Error(`GİB dispatch HTTP ${res.status}: ${rawText.slice(0, 200)}`);

  let json: Record<string, unknown> = {};
  try {
    json = JSON.parse(rawText);
  } catch {
    /* HTML geldi */
  }
  return json;
}

// ── Error extractor ───────────────────────────────────────────────────────

/** GİB hata nesnesini çıkarır. Hata yoksa null döner. */
function extractGibHata(json: Record<string, unknown>): { type: string; text: string } | null {
  const err = json?.error;
  if (
    err === undefined ||
    err === null ||
    err === 0 ||
    err === "0" ||
    err === false ||
    err === "false"
  )
    return null;
  const msgs = json.messages as { type?: string; text?: string }[] | undefined;
  const text = msgs?.[0]?.text ?? String(err);
  const type = msgs?.[0]?.type ?? String(err);
  return { type, text };
}

// ── Public API ────────────────────────────────────────────────────────────

/**
 * GİB'den captcha görselini çeker.
 * Session cookie'yi saklar; ivdLogin aynı cookie'yi kullanır.
 */
export async function fetchGibCaptcha(): Promise<GibCaptcha> {
  const imgPageRes = await fetch(`${BASE}/captcha/captchaImg.jsp`, {
    headers: { "User-Agent": UA, Referer: `${BASE}/` },
  });

  const sessionCookie = parseCookies(imgPageRes.headers);
  const imgPageHtml = await imgPageRes.text();
  console.log("[GİB Captcha] session cookie:", sessionCookie);
  console.log("[GİB Captcha] HTML snippet:", imgPageHtml.slice(0, 400));

  const byName =
    imgPageHtml.match(/name=["'](?:imageID|cid)["'][^>]*value=["']([^"']+)["']/i) ??
    imgPageHtml.match(/value=["']([^"']+)["'][^>]*name=["'](?:imageID|cid)["']/i);
  const bySrc =
    imgPageHtml.match(/jcaptcha[^"']*[?&]imageID=([^"'&\s>]+)/i) ??
    imgPageHtml.match(/imageID=([A-Za-z0-9_-]{6,})/i);
  const cidMatch = byName ?? bySrc ?? imgPageHtml.match(/value="([A-Za-z0-9_-]{6,})"/);
  if (!cidMatch) throw new Error("GİB captcha ID alınamadı.");
  const imageID = cidMatch[1];
  console.log("[GİB Captcha] imageID:", imageID);

  if (sessionCookie) saveCookie(imageID, sessionCookie);

  const imgHeaders: Record<string, string> = { "User-Agent": UA, Referer: `${BASE}/` };
  if (sessionCookie) imgHeaders["Cookie"] = sessionCookie;

  const imgRes = await fetch(`${BASE}/captcha/jcaptcha?imageID=${imageID}`, {
    headers: imgHeaders,
  });
  if (!imgRes.ok) throw new Error(`GİB captcha görseli alınamadı: HTTP ${imgRes.status}`);
  const imgBuffer = await imgRes.arrayBuffer();
  const imageBase64 = Buffer.from(imgBuffer).toString("base64");

  return { imageID, imageBase64, sessionCookie: sessionCookie ?? "" };
}

/**
 * IVD'ye captcha ile giriş yapar, oturum token'ı döndürür.
 * Token birden fazla müşteri için yeniden kullanılabilir.
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
    parola: "maliye",
    dk: creds.captchaDk,
    imageID: creds.captchaImageID,
  });

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
    throw new Error(`IVD giriş başarısız: HTTP ${res.status}`);
  }

  const rawText = await res.text();
  console.log("[GİB IVD Login] Ham yanıt:", rawText.slice(0, 500));

  let json: Record<string, unknown> | null = null;
  try {
    json = JSON.parse(rawText);
  } catch {
    /* HTML yanıt */
  }

  if (!json) {
    throw new Error("GİB IVD giriş başarısız: Sunucudan geçersiz yanıt alındı.");
  }

  if (json?.error) {
    const mesaj =
      (json?.messages as { text?: string; type?: string }[])?.[0]?.text ?? String(json?.error);
    const tip = (json?.messages as { text?: string; type?: string }[])?.[0]?.type;
    console.error("[GİB IVD Login] Hata yanıtı:", JSON.stringify(json));
    if (tip === "5") {
      throw new Error(`GİB girişi başarısız: Captcha hatalı.`);
    }
    throw new Error(`GİB girişi başarısız: ${mesaj}`);
  }

  const token: string = (json?.token as string) ?? "";
  if (!token) {
    console.error("[GİB IVD Login] Token yok, yanıt:", JSON.stringify(json));
    throw new Error("GİB IVD oturum token'ı alınamadı.");
  }

  if (json?.chgpwd === "true" || json?.chgpwd === true) {
    console.warn("[GİB IVD Login] chgpwd=true — devam ediliyor");
  }

  const loginCookie = parseCookies(res.headers);
  const captchaCookie = getCookie(creds.captchaImageID);

  // ebeyanname.gib.gov.tr domain'inde session cookie kur (kritik adım)
  const ebeyannameSessionCookie = await exchangeTokenOnEbeyanname(token);

  const fullCookie = [captchaCookie, loginCookie, ebeyannameSessionCookie]
    .filter(Boolean)
    .join("; ");
  if (fullCookie) {
    saveLoginCookie(token, fullCookie);
    console.log("[GİB IVD Login] Tüm cookie'ler kaydedildi:", fullCookie.slice(0, 120));
  }

  return token;
}

/** Tebligatları çeker. `existingToken` verilirse yeni login yapmaz. */
export async function fetchTebligatlar(
  creds: IvdCredentials,
  musteriVkn?: string,
  existingToken?: string
): Promise<Omit<Tebligat, "id">[]> {
  const token = existingToken ?? (await ivdLogin(creds));
  const identifierValue = musteriVkn ?? creds.vknTckn;
  const oturumCookie = getLoginCookie(token) || undefined;

  // GİB cmd büyük/küçük harf duyarlılığı belirsiz — her ikisini de dene
  const tebligatCmds = ["tebligat_liste", "TEBLIGAT_LISTE", "tebligat_listesi"] as const;
  let json: Record<string, unknown> | null = null;
  for (let i = 0; i < tebligatCmds.length; i++) {
    try {
      json = await gibDispatchResolved(token, tebligatCmds[i], identifierValue, undefined, oturumCookie);
      break;
    } catch (err) {
      if (i < tebligatCmds.length - 1 && err instanceof GibIdentifierParamError) continue;
      throw err;
    }
  }
  if (!json) throw new Error("GİB tebligat verisi alınamadı.");

  const rows: Record<string, string>[] = (json?.data ?? json?.liste ?? []) as Record<
    string,
    string
  >[];
  return rows.map(
    (row): Omit<Tebligat, "id"> => ({
      musteriId: identifierValue,
      musteriAdi: row.unvan ?? "",
      vknTckn: identifierValue,
      tarih: row.tarih ?? new Date().toISOString(),
      baslik: row.konu ?? row.baslik ?? "GİB Tebligatı",
      tur: row.tur ?? "idari",
      durum: "yeni",
      pdfUrl: row.pdfUrl,
    })
  );
}

/** Beyannameleri çeker. `existingToken` verilirse yeni login yapmaz. */
export async function fetchBeyannameler(
  creds: IvdCredentials,
  musteriVkn?: string,
  existingToken?: string
): Promise<Omit<Beyanname, "id">[]> {
  const token = existingToken ?? (await ivdLogin(creds));
  const identifierValue = musteriVkn ?? creds.vknTckn;
  const oturumCookie = getLoginCookie(token) || undefined;

  // GİB cmd adı ve büyük/küçük harf belirsiz — tüm adayları sırayla dene.
  // Resolver her komut için identifier param keşfini bağımsız yönetir.
  const komutlar = [
    "beyanname_liste",
    "BEYANNAME_LISTE",
    "beyanname_listesi",
    "BEYANNAME_LISTESI",
  ] as const;
  let json: Record<string, unknown> | null = null;

  for (let i = 0; i < komutlar.length; i++) {
    const assoscmd = komutlar[i];
    const isLast = i === komutlar.length - 1;
    try {
      json = await gibDispatchResolved(token, assoscmd, identifierValue, undefined, oturumCookie);
      break;
    } catch (err) {
      // Tüm identifier adayları tükendi → bu komut adı çalışmıyor; sonrakini dene
      if (!isLast && err instanceof GibIdentifierParamError) continue;
      throw err;
    }
  }

  if (!json) throw new Error("GİB beyanname verisi alınamadı.");

  const TUR_MAP: Record<string, BeyannameType> = {
    KDV: "KDV",
    KDV1: "KDV",
    KDV2: "KDV",
    MUHTAS: "MUHTAS",
    MUHTASAR: "MUHTAS",
    KURUM: "KURUM",
    KURUMLAR: "KURUM",
    GELIR: "GELIR",
    GECICI: "GECICI",
    GECICIVERGI: "GECICI",
    DAMGA: "DIGER",
    SGK: "DIGER",
    "0015": "KDV",
    "9015": "KDV",
    "0040": "MUHTAS",
    "0033": "KURUM",
    "1033": "KURUM",
    "1040": "GELIR",
    "0024": "GECICI",
    "1024": "GECICI",
  };

  const rows: Record<string, string>[] = (json?.data ?? json?.liste ?? []) as Record<
    string,
    string
  >[];

  return rows.map((row): Omit<Beyanname, "id"> => {
    const kodRaw = (row.beyannameKodu ?? row.beyannameTuru ?? "").toUpperCase().replace(/\s/g, "");
    const tur: BeyannameType = TUR_MAP[kodRaw] ?? "DIGER";
    if (tur === "DIGER" && kodRaw) {
      console.warn("[GİB Beyanname] Bilinmeyen beyanname kodu:", kodRaw);
    }
    const gibDurum = (row.durum ?? "").toUpperCase();
    const verildi = gibDurum === "V" || gibDurum === "K" || gibDurum === "1";
    return {
      musteriId: identifierValue,
      musteriAdi: row.unvan ?? "",
      tur,
      donem: row.donem ?? "",
      sonTarih: row.sonTarih ?? new Date().toISOString(),
      durum: verildi ? "verildi" : "bekliyor",
      yasamDongusuDurum: verildi ? "kapandi" : "planlandi",
      sorumlu: "",
      kaynakSistem: "gib",
    };
  });
}

/** Vergi borç/tahakkuk listesini çeker. `existingToken` verilirse yeni login yapmaz. */
export async function fetchBorcListesi(
  creds: IvdCredentials,
  musteriVkn?: string,
  existingToken?: string
): Promise<Omit<Tahakkuk, "id" | "ofisId">[]> {
  const token = existingToken ?? (await ivdLogin(creds));
  const identifierValue = musteriVkn ?? creds.vknTckn;
  const oturumCookie = getLoginCookie(token) || undefined;

  const borcCmds = ["borc_listesi", "BORC_LISTESI", "borcListesi"] as const;
  let json: Record<string, unknown> | null = null;
  for (let i = 0; i < borcCmds.length; i++) {
    try {
      json = await gibDispatchResolved(token, borcCmds[i], identifierValue, undefined, oturumCookie);
      break;
    } catch (err) {
      if (i < borcCmds.length - 1 && err instanceof GibIdentifierParamError) continue;
      throw err;
    }
  }
  if (!json) throw new Error("GİB borç/tahakkuk verisi alınamadı.");

  const rows: Record<string, string>[] = (json?.data ?? json?.liste ?? []) as Record<
    string,
    string
  >[];

  return rows.map((row): Omit<Tahakkuk, "id" | "ofisId"> => {
    const vergiTuruRaw = (row.vergiTuru ?? row.vergikodu ?? "").toUpperCase();
    const vergiTuru: VergiTahakkukTuru = VERGI_TUR_MAP[vergiTuruRaw] ?? "DIGER";
    const tutar = parseFloat(row.borcTutari ?? row.tutar ?? "0") || 0;
    const vadeTarihi = row.vade ?? row.sonOdemeTarihi ?? new Date().toISOString().slice(0, 10);
    const donem = row.donem ?? row.vergiDonemi ?? vadeTarihi.slice(0, 7);
    return {
      musteriId: identifierValue,
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
  const token = existingToken ?? (await ivdLogin(creds));
  const oturumCookie = getLoginCookie(token) || undefined;

  const mukellefCmds = ["mukellef_durum", "MUKELLEF_DURUM", "mukellefDurum"] as const;
  let json: Record<string, unknown> | null = null;
  for (let i = 0; i < mukellefCmds.length; i++) {
    try {
      json = await gibDispatchResolved(token, mukellefCmds[i], musteriVkn, undefined, oturumCookie);
      break;
    } catch (err) {
      if (i < mukellefCmds.length - 1 && err instanceof GibIdentifierParamError) continue;
      throw err;
    }
  }
  if (!json) throw new Error("GİB mükellef durum verisi alınamadı.");

  return {
    aktif: json?.aktif === true || json?.durum === "aktif",
    vergiDairesi: (json?.vergiDairesi ?? json?.vd) as string | undefined,
    mesaj: json?.mesaj as string | undefined,
  };
}
