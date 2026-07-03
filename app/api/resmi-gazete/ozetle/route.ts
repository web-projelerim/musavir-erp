/**
 * POST /api/resmi-gazete/ozetle
 *
 * Resmi Gazete RSS'ini çeker, mali müşavirlikle ilgili maddeleri
 * Gemini API ile özetler ve yapılandırılmış JSON döner.
 *
 * Gerekli env: GEMINI_API_KEY (Google AI Studio API anahtarı)
 * Opsiyonel env: CRON_SECRET (cron doğrulama için)
 *
 * GEMINI_API_KEY yoksa 501 döner (stub mod).
 *
 * Vercel Cron veya manuel tetikleyici ile çağrılabilir.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireStaff } from "@/lib/firebase/verifyToken";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const RSS_URL = "https://www.resmigazete.gov.tr/rss/rss.xml";
const GEMINI_MODEL = "gemini-2.0-flash";
const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

const MALI_ANAHTAR_KELIMELER = [
  "vergi", "kdv", "muhtasar", "gelir vergisi", "kurumlar vergisi",
  "beyanname", "tebligat", "mali müşavir", "smmm", "yeminli",
  "stopaj", "gecikme zammı", "vergi dairesi", "gib", "tevkifat",
  "amortisman", "asgari ücret", "sgk", "sosyal güvenlik",
  "ihracat", "ithalat", "gümrük", "e-fatura", "e-arşiv", "e-defter",
];

interface RSSMadde {
  baslik: string;
  link: string;
  tarih: string;
  aciklama: string;
}

interface GazeteOzetMadde {
  baslik: string;
  aiOzet: string;
  maliMusavirEtkisi: string;
  aksiyonGerekiyor: boolean;
  maliMusavirEtkiPuani: number;
  kaynakLink: string;
  yayinTarihi: string;
}

function parseTarih(tarihStr: string): string {
  try {
    return new Date(tarihStr).toISOString();
  } catch {
    return new Date().toISOString();
  }
}

function extractText(xml: string, tag: string): string {
  const match = xml.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>|<${tag}[^>]*>([\\s\\S]*?)</${tag}>`));
  if (!match) return "";
  return (match[1] ?? match[2] ?? "").trim();
}

function parseRSSItems(xml: string): RSSMadde[] {
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  const maddeler: RSSMadde[] = [];
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const itemXml = match[1];
    maddeler.push({
      baslik: extractText(itemXml, "title"),
      link: extractText(itemXml, "link"),
      tarih: parseTarih(extractText(itemXml, "pubDate")),
      aciklama: extractText(itemXml, "description"),
    });
  }

  return maddeler;
}

function maliMuşavirlikIlgili(madde: RSSMadde): boolean {
  const metin = `${madde.baslik} ${madde.aciklama}`.toLowerCase();
  return MALI_ANAHTAR_KELIMELER.some((kw) => metin.includes(kw));
}

async function geminiOzetle(maddeler: RSSMadde[], apiKey: string): Promise<GazeteOzetMadde[]> {
  const icerik = maddeler
    .map((m, i) => `${i + 1}. Başlık: ${m.baslik}\nAçıklama: ${m.aciklama}\nLink: ${m.link}\nTarih: ${m.tarih}`)
    .join("\n\n");

  const prompt = `Aşağıdaki Resmi Gazete maddelerini bir mali müşavir için analiz et.
Her madde için aşağıdaki alanları doldur:
- baslik: Konuyu tek cümleyle özetle (Türkçe, sade)
- aiOzet: Maddenin kısa özeti (1-2 cümle)
- maliMusavirEtkisi: Mali müşavirler için pratik etkisi (1-2 cümle)
- aksiyonGerekiyor: true (acil aksiyon gerekiyorsa) veya false
- maliMusavirEtkiPuani: 0-100 arası etki puanı (100 = çok kritik, 0 = ilgisiz)
- kaynakLink: Verilen link olduğu gibi
- yayinTarihi: Verilen tarih olduğu gibi

Yanıtı SADECE geçerli bir JSON dizisi olarak ver, başka hiçbir açıklama ekleme:
[{"baslik":"...","aiOzet":"...","maliMusavirEtkisi":"...","aksiyonGerekiyor":false,"maliMusavirEtkiPuani":50,"kaynakLink":"...","yayinTarihi":"..."}]

Maddeler:
${icerik}`;

  const url = `${GEMINI_API_BASE}/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        maxOutputTokens: 2048,
        temperature: 0.2,
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
    return JSON.parse(jsonMatch[0]) as GazeteOzetMadde[];
  } catch {
    return [];
  }
}

export async function POST(req: NextRequest) {
  // Doğrulama: CRON_SECRET veya Firebase Bearer token
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");
  if (cronSecret) {
    // Vercel Cron veya manuel tetikleyici — CRON_SECRET ile doğrula
    if (authHeader !== `Bearer ${cronSecret}`) {
      // CRON_SECRET eşleşmezse Firebase token dene
      const actor = await requireStaff(req);
      if (!actor) {
        return NextResponse.json({ ok: false, error: "Yetkisiz" }, { status: 401 });
      }
    }
  } else {
    // CRON_SECRET yoksa Firebase token zorunlu
    const actor = await requireStaff(req);
    if (!actor) {
      return NextResponse.json({ ok: false, error: "Yetkisiz" }, { status: 401 });
    }
  }

  const geminiApiKey = process.env.GEMINI_API_KEY;

  try {
    const rssRes = await fetch(RSS_URL, {
      next: { revalidate: 0 },
      signal: AbortSignal.timeout(15_000),
    });

    if (!rssRes.ok) {
      throw new Error(`RSS alınamadı: HTTP ${rssRes.status}`);
    }

    const rssXml = await rssRes.text();
    const tumMaddeler = parseRSSItems(rssXml);
    const ilgiliMaddeler = tumMaddeler.filter(maliMuşavirlikIlgili);

    if (ilgiliMaddeler.length === 0) {
      // Mali müşavirlik filtresi eşleşmedi — tüm maddelerin ilk 5'ini göster
      const sonMaddeler: GazeteOzetMadde[] = tumMaddeler.slice(0, 5).map((m) => ({
        baslik: m.baslik,
        aiOzet: m.aciklama || "Detay için kaynak linke tıklayın.",
        maliMusavirEtkisi: "",
        aksiyonGerekiyor: false,
        maliMusavirEtkiPuani: 10,
        kaynakLink: m.link,
        yayinTarihi: m.tarih,
      }));
      return NextResponse.json({
        ok: true,
        maddeler: sonMaddeler,
        ilgiliMaddeSayisi: 0,
        toplamMaddeSayisi: tumMaddeler.length,
        tarih: new Date().toISOString(),
      });
    }

    if (!geminiApiKey) {
      // Gemini API key yok — RSS maddelerini AI özeti olmadan doğrudan döndür
      const maddeler: GazeteOzetMadde[] = ilgiliMaddeler.slice(0, 10).map((m) => ({
        baslik: m.baslik,
        aiOzet: m.aciklama || "Detay için kaynak linke tıklayın.",
        maliMusavirEtkisi: "AI özeti devre dışı — detay için kaynak linke bakın.",
        aksiyonGerekiyor: false,
        maliMusavirEtkiPuani: 30,
        kaynakLink: m.link,
        yayinTarihi: m.tarih,
      }));

      return NextResponse.json({
        ok: true,
        maddeler,
        ilgiliMaddeSayisi: ilgiliMaddeler.length,
        toplamMaddeSayisi: tumMaddeler.length,
        tarih: new Date().toISOString(),
      });
    }

    const maddeler = await geminiOzetle(ilgiliMaddeler.slice(0, 10), geminiApiKey);

    // TODO(faz-2): firebase-admin eklenince resmiGazeteOzetleri koleksiyonuna yaz
    return NextResponse.json({
      ok: true,
      model: GEMINI_MODEL,
      maddeler,
      ilgiliMaddeSayisi: ilgiliMaddeler.length,
      toplamMaddeSayisi: tumMaddeler.length,
      tarih: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Bilinmeyen hata";
    // Dış kaynak (Resmi Gazete RSS) erişilemezliği beklenen bir durumdur —
    // istemci ok:false'u nazikçe yutar. 500 yerine 200 dönerek tarayıcı
    // konsolunda "Failed to load resource" gürültüsünü önle.
    console.warn("[Resmi Gazete Özetle] atlandı:", message);
    return NextResponse.json({ ok: false, error: message });
  }
}
