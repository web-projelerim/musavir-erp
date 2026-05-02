import "server-only";

/**
 * GİB İnteraktif Vergi Dairesi (IVD) HTTP istemcisi.
 *
 * GİB'in kamuya açık resmi API'si bulunmamaktadır.
 * Bu dosya ivd.gib.gov.tr servis katmanına yönelik HTTP çağrılarını yönetir.
 *
 * Endpoint'ler GİB tarafından değiştirilebilir; değişiklik durumunda
 * yalnızca bu dosyayı güncellemeniz yeterlidir.
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
  /** GİB IVD internet parolası — bazı hesaplarda gereklidir (varsayılan: "1") */
  parola?: string;
}

const BASE = "https://ivd.gib.gov.tr/tvd_server";

/** IVD'ye giriş yapar, oturum token'ı döndürür */
async function ivdLogin(creds: IvdCredentials): Promise<string> {
  const body = new URLSearchParams({
    assoscmd: "anlogin",
    rtype: "json",
    userid: creds.kullaniciKodu,
    sifre: creds.sifre,
    sifre2: creds.sifre,
    parola: creds.parola ?? "1",
  });

  const res = await fetch(`${BASE}/dispatch`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) throw new Error(`IVD login HTTP ${res.status}`);

  const json = await res.json().catch(() => null);

  if (json?.sonuc === "0" || json?.error) {
    throw new Error(json?.hata ?? json?.error ?? "IVD giriş başarısız — kullanıcı kodu veya şifre hatalı");
  }

  const token: string = json?.token ?? json?.TknInfo?.Token ?? "";
  if (!token) throw new Error("IVD oturum token'ı alınamadı");
  return token;
}

/** Tebligatları çeker */
export async function fetchTebligatlar(
  creds: IvdCredentials,
  musteriVkn?: string
): Promise<Omit<Tebligat, "id">[]> {
  const token = await ivdLogin(creds);

  const res = await fetch(`${BASE}/dispatch`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Token: token,
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

/** Beyannameleri çeker */
export async function fetchBeyannameler(
  creds: IvdCredentials,
  musteriVkn?: string
): Promise<Omit<Beyanname, "id">[]> {
  const token = await ivdLogin(creds);

  const res = await fetch(`${BASE}/dispatch`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Token: token,
    },
    body: new URLSearchParams({
      assoscmd: "beyanname_liste",
      rtype: "json",
      vkn: musteriVkn ?? creds.vknTckn,
    }).toString(),
  });

  if (!res.ok) throw new Error(`Beyanname listesi HTTP ${res.status}`);
  const json = await res.json();
  const rows: Record<string, string>[] = json?.data ?? json?.liste ?? [];

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

/** Vergi borç/tahakkuk listesini çeker (borc_listesi endpoint'i).
 *  Dönen kayıtlarda ofisId yoktur — caller inject etmelidir. */
export async function fetchBorcListesi(
  creds: IvdCredentials,
  musteriVkn?: string
): Promise<Omit<Tahakkuk, "id" | "ofisId">[]> {
  const token = await ivdLogin(creds);
  const vkn = musteriVkn ?? creds.vknTckn;

  const res = await fetch(`${BASE}/dispatch`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Token: token,
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

/** Mükellef durumunu sorgular */
export async function fetchMukellefDurumu(
  creds: IvdCredentials,
  musteriVkn: string
): Promise<{ aktif: boolean; vergiDairesi?: string; mesaj?: string }> {
  const token = await ivdLogin(creds);

  const res = await fetch(`${BASE}/dispatch`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Token: token,
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
