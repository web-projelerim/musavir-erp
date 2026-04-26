/**
 * POST /api/resmi-gazete/ozetle
 *
 * Resmi Gazete RSS'ini çeker, mali müşavirlikle ilgili maddeleri
 * Claude API ile özetler ve resmiGazeteOzetleri koleksiyonuna yazar.
 *
 * Gerekli env: CLAUDE_API_KEY (Anthropic API anahtarı)
 * Opsiyonel env: CRON_SECRET (cron doğrulama için)
 *
 * CLAUDE_API_KEY yoksa 501 döner (stub mod).
 *
 * Vercel Cron veya manuel tetikleyici ile çağrılabilir.
 */

import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const RSS_URL = "https://www.resmigazete.gov.tr/rss/rss.xml";
const CLAUDE_MODEL = "claude-haiku-4-5-20251001";

// Mali müşavirlikle ilgili anahtar kelimeler (Türkçe)
const MALI_ANAHTAR_KELIMELER = [
  "vergi", "kdv", "muhtasar", "gelir vergisi", "kurumlar vergisi",
  "beyanname", "tebligat", "mali müşavir", "smmm", "yeminli",
  "stopaj", "gecikme zammı", "vergi dairesi", "gib", "tevkifat",
  "amortisман", "asgari ücret", "sgk", "sosyal güvenlik",
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

async function claudeOzetle(maddeler: RSSMadde[], apiKey: string): Promise<GazeteOzetMadde[]> {
  const icerik = maddeler
    .map((m, i) => `${i + 1}. Başlık: ${m.baslik}\nAçıklama: ${m.aciklama}\nLink: ${m.link}\nTarih: ${m.tarih}`)
    .join("\n\n");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: `Aşağıdaki Resmi Gazete maddelerini bir mali müşavir için analiz et.
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
${icerik}`,
        },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message ?? `Claude API HTTP ${res.status}`);
  }

  const data = await res.json();
  const text: string = data.content?.[0]?.text ?? "[]";
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return [];
  try {
    return JSON.parse(jsonMatch[0]) as GazeteOzetMadde[];
  } catch {
    return [];
  }
}

export async function POST(req: NextRequest) {
  const claudeApiKey = process.env.CLAUDE_API_KEY;

  if (!claudeApiKey) {
    // STUB — MVP dışı: CLAUDE_API_KEY env yoksa simülasyon modu
    return NextResponse.json(
      {
        ok: false,
        stub: true,
        mesaj: "CLAUDE_API_KEY env değişkeni tanımlanmamış. Resmi Gazete AI özeti pasif.",
      },
      { status: 501 }
    );
  }

  try {
    // 1. RSS'i çek
    const rssRes = await fetch(RSS_URL, {
      next: { revalidate: 0 },
      signal: AbortSignal.timeout(15_000),
    });

    if (!rssRes.ok) {
      throw new Error(`RSS alınamadı: HTTP ${rssRes.status}`);
    }

    const rssXml = await rssRes.text();
    const tumMaddeler = parseRSSItems(rssXml);

    // 2. Mali müşavirlikle ilgili maddeleri filtrele
    const ilgiliMaddeler = tumMaddeler.filter(maliMuşavirlikIlgili);

    if (ilgiliMaddeler.length === 0) {
      return NextResponse.json({
        ok: true,
        mesaj: "Bu sayıda mali müşavirlikle ilgili madde bulunamadı.",
        ilgiliMaddeSayisi: 0,
        toplamMaddeSayisi: tumMaddeler.length,
      });
    }

    // 3. Claude API ile özetle (per-madde yapılandırılmış JSON)
    const maddeler = await claudeOzetle(ilgiliMaddeler.slice(0, 10), claudeApiKey);

    // TODO(faz-2): firebase-admin eklenince resmiGazeteOzetleri koleksiyonuna yaz
    return NextResponse.json({
      ok: true,
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
