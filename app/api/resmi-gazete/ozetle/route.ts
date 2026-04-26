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
  // Cron secret doğrulama (opsiyonel)
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ ok: false, error: "Yetkisiz" }, { status: 401 });
    }
  }

  const geminiApiKey = process.env.GEMINI_API_KEY;

  if (!geminiApiKey) {
    // STUB — MVP dışı: GEMINI_API_KEY env yoksa simülasyon modu
    return NextResponse.json(
      {
        ok: false,
        stub: true,
        mesaj: "GEMINI_API_KEY env değişkeni tanımlanmamış. Resmi Gazete AI özeti pasif.",
      },
      { status: 501 }
    );
  }

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
      return NextResponse.json({
        ok: true,
        mesaj: "Bu sayıda mali müşavirlikle ilgili madde bulunamadı.",
        ilgiliMaddeSayisi: 0,
        toplamMaddeSayisi: tumMaddeler.length,
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
    console.error("[Resmi Gazete Özetle]", err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
