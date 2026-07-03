/**
 * POST /api/vergi-takvimi/sync?yil=2026
 *
 * GİB'in vergi takvimi sayfasını (gib.gov.tr/yardim-ve-kaynaklar/vergi-takvimi)
 * çeker, Gemini API ile yapılandırılmış JSON'a dönüştürür.
 *
 * Gerekli env: GEMINI_API_KEY
 * Opsiyonel env: CRON_SECRET
 *
 * Sonuç: { ok: true, yil, olaylar: VergiTakvimOlay[] }
 *
 * GEMINI_API_KEY yoksa 200 + ok:false döner; istemci statik takvime fallback eder.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/firebase/verifyToken";
import { getAdminDb } from "@/lib/firebase/admin";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const GIB_TAKVIM_URL = "https://www.gib.gov.tr/yardim-ve-kaynaklar/vergi-takvimi";
const GEMINI_MODEL = "gemini-2.0-flash";
const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

interface VergiTakvimOlay {
  tarih: string; // YYYY-MM-DD
  baslik: string;
  aciklama: string;
  kategori: "aylik" | "gecici_vergi" | "yillik" | "ucaylik" | "bildirim";
}

function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

async function geminiParse(metin: string, yil: number, apiKey: string): Promise<VergiTakvimOlay[]> {
  const prompt = `Aşağıda Gelir İdaresi Başkanlığı (GİB) vergi takvimi sayfasının metin içeriği var.
${yil} yılı için TÜM vergi yükümlülüklerini çıkar (beyanname, ödeme, bildirim, e-defter berat vb.).
Hiçbir kalemi atlama. Aylık tekrar edenler için 12 ay × her ay bir kayıt üret.

Her olay için:
- tarih: "${yil}-MM-DD" formatında (hafta sonuna denk gelirse Pazartesi'ye kaydır)
- baslik: "[Vergi Adı] — [Dönem Ay Yıl]" (örn: "KDV-1 Beyanname — Ocak ${yil}")
- aciklama: 1 cümle açıklama
- kategori: "aylik" | "gecici_vergi" | "yillik" | "ucaylik" | "bildirim"

Yanıtı SADECE geçerli JSON dizisi olarak ver, başka metin ekleme:
[{"tarih":"${yil}-01-26","baslik":"...","aciklama":"...","kategori":"aylik"}]

GİB Takvim İçeriği:
${metin.slice(0, 30_000)}`;

  const url = `${GEMINI_API_BASE}/${GEMINI_MODEL}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        maxOutputTokens: 32768,
        temperature: 0.1,
      },
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message ?? `Gemini API HTTP ${res.status}`);
  }

  const data = await res.json();
  const text: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "[]";
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return [];
  try {
    const parsed = JSON.parse(jsonMatch[0]) as VergiTakvimOlay[];
    return parsed.filter((o) => o.tarih && o.baslik);
  } catch {
    return [];
  }
}

/**
 * GET — Firestore'dan cache'li veriyi döner (Gemini çağrısı yok, ucuz okuma).
 * Cron'un veya manuel sync'in son yazdığı veriyi okur.
 */
export async function GET(req: NextRequest) {
  const actor = await requireAuth(req);
  if (!actor) {
    return NextResponse.json({ ok: false, error: "Yetkisiz" }, { status: 401 });
  }
  const url = new URL(req.url);
  const yilParam = url.searchParams.get("yil");
  const yil = yilParam ? Number(yilParam) : new Date().getFullYear();
  if (!Number.isFinite(yil) || yil < 2020 || yil > 2100) {
    return NextResponse.json({ ok: false, error: "Geçersiz yıl" }, { status: 400 });
  }

  const db = getAdminDb();
  if (!db) {
    return NextResponse.json({ ok: false, error: "Firestore admin yapılandırması eksik" });
  }
  try {
    const doc = await db.collection("vergiTakvimi").doc(String(yil)).get();
    if (!doc.exists) {
      return NextResponse.json({ ok: true, yil, olaylar: [], guncellemeTarihi: null });
    }
    return NextResponse.json({ ok: true, ...doc.data() });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Bilinmeyen hata";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  // Doğrulama: CRON_SECRET veya Firebase Bearer token
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");
  if (cronSecret) {
    if (authHeader !== `Bearer ${cronSecret}`) {
      const actor = await requireAuth(req);
      if (!actor) {
        return NextResponse.json({ ok: false, error: "Yetkisiz" }, { status: 401 });
      }
    }
  } else {
    const actor = await requireAuth(req);
    if (!actor) {
      return NextResponse.json({ ok: false, error: "Yetkisiz" }, { status: 401 });
    }
  }

  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (!geminiApiKey) {
    return NextResponse.json({
      ok: false,
      stub: true,
      mesaj: "GEMINI_API_KEY env değişkeni tanımlanmamış. GİB takvim sync pasif.",
    });
  }

  const url = new URL(req.url);
  const yilParam = url.searchParams.get("yil");
  const yil = yilParam ? Number(yilParam) : new Date().getFullYear();

  if (!Number.isFinite(yil) || yil < 2020 || yil > 2100) {
    return NextResponse.json({ ok: false, error: "Geçersiz yıl" }, { status: 400 });
  }

  try {
    const gibRes = await fetch(GIB_TAKVIM_URL, {
      next: { revalidate: 0 },
      signal: AbortSignal.timeout(15_000),
      headers: { "user-agent": "Mozilla/5.0 (MusavirERP)" },
    });

    if (!gibRes.ok) {
      throw new Error(`GİB takvim sayfası alınamadı: HTTP ${gibRes.status}`);
    }

    const html = await gibRes.text();
    const metin = htmlToText(html);

    if (metin.length < 200) {
      throw new Error("GİB sayfasından metin çıkarılamadı");
    }

    const olaylar = await geminiParse(metin, yil, geminiApiKey);

    // Firestore'a yaz + diff hesapla (admin SDK varsa)
    const guncellemeler: Array<{ baslik: string; eskiTarih: string; yeniTarih: string }> = [];
    const db = getAdminDb();
    if (db) {
      try {
        const docRef = db.collection("vergiTakvimi").doc(String(yil));
        const onceki = await docRef.get();
        if (onceki.exists) {
          const data = onceki.data() as { olaylar?: VergiTakvimOlay[] } | undefined;
          const eskiMap = new Map<string, string>();
          for (const e of data?.olaylar ?? []) {
            // baslık anahtar: vergi türü + dönem (tarihten bağımsız)
            const key = e.baslik.toLowerCase().replace(/\s+/g, " ").trim();
            eskiMap.set(key, e.tarih);
          }
          for (const yeni of olaylar) {
            const key = yeni.baslik.toLowerCase().replace(/\s+/g, " ").trim();
            const eskiTarih = eskiMap.get(key);
            if (eskiTarih && eskiTarih !== yeni.tarih) {
              guncellemeler.push({ baslik: yeni.baslik, eskiTarih, yeniTarih: yeni.tarih });
            }
          }
        }
        // Firestore admin undefined değerleri reddeder — temizle
        const temizOlaylar = olaylar
          .filter((o) => o && o.tarih && o.baslik)
          .map((o) => ({
            tarih: String(o.tarih),
            baslik: String(o.baslik),
            aciklama: String(o.aciklama ?? ""),
            kategori: String(o.kategori ?? "aylik"),
          }));
        await docRef.set({
          yil,
          olaylar: temizOlaylar,
          guncellemeTarihi: new Date().toISOString(),
          kaynak: GIB_TAKVIM_URL,
        });
        // Tespit edilen ertelemeler/değişiklikler için ayrı koleksiyon
        if (guncellemeler.length > 0) {
          const batch = db.batch();
          for (const g of guncellemeler) {
            const ref = db.collection("vergiTakvimiGuncellemeleri").doc();
            batch.set(ref, {
              yil,
              baslik: g.baslik,
              eskiTarih: g.eskiTarih,
              yeniTarih: g.yeniTarih,
              tespitTarihi: new Date().toISOString(),
            });
          }
          await batch.commit();
        }
      } catch (err) {
        console.error("[Vergi Takvimi Sync] Firestore yazımı başarısız:", err);
      }
    }

    return NextResponse.json({
      ok: true,
      model: GEMINI_MODEL,
      yil,
      olaylar,
      guncellemeler,
      kaynak: GIB_TAKVIM_URL,
      tarih: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Bilinmeyen hata";
    // Dış kaynak (GİB vergi takvimi sayfası) erişilemezliği/parse hatası
    // beklenen bir durumdur — istemci ok:false'u nazikçe yutar. 500 yerine
    // 200 dönerek tarayıcı konsolunda "Failed to load resource" gürültüsünü önle.
    console.warn("[Vergi Takvimi Sync] atlandı:", message);
    return NextResponse.json({ ok: false, error: message });
  }
}
