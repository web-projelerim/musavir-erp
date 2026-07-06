/**
 * POST /api/resmi-gazete/ozetle
 *
 * Resmi Gazete'nin günlük fihristini (eskiler/YYYY/MM/YYYYMMDD.htm) çeker,
 * mali müşavirlikle ilgili maddeleri Gemini API ile özetler ve
 * yapılandırılmış JSON döner.
 *
 * Not: resmigazete.gov.tr'nin eski RSS beslemesi (/rss/rss.xml) 404 döndüğü için
 * artık kullanılmıyor. Bunun yerine her gün yayımlanan HTML fihrist sayfası
 * (windows-1254 kodlu) ayrıştırılıyor; gazete yayımlanmayan günlerde (hafta sonu/
 * resmî tatil) en yakın önceki yayına düşülür.
 *
 * Gerekli env: GEMINI_API_KEY (Google AI Studio API anahtarı)
 * Opsiyonel env: CRON_SECRET (cron doğrulama için)
 *
 * GEMINI_API_KEY yoksa AI özeti olmadan ham başlıklar döner (stub mod).
 *
 * Vercel Cron veya manuel tetikleyici ile çağrılabilir.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireStaff } from "@/lib/firebase/verifyToken";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const RG_BASE = "https://www.resmigazete.gov.tr";
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

/** Verilen tarih için günlük fihrist URL'sini ve çözümleme bilgisini üretir. */
function fihristBilgisi(d: Date): { url: string; base: string; prefix: string } {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const prefix = `${yyyy}${mm}${dd}`;
  const base = `${RG_BASE}/eskiler/${yyyy}/${mm}/`;
  return { url: `${base}${prefix}.htm`, base, prefix };
}

/** Günlük fihrist HTML'ini ayrıştırıp o günün maddelerini çıkarır. */
function parseFihrist(html: string, base: string, prefix: string, isoTarih: string): RSSMadde[] {
  const maddeler: RSSMadde[] = [];
  const gorulen = new Set<string>();
  // Örn: <a href="20260706-1.htm">...başlık...</a> — sadece o güne ait dosyalar.
  const re = new RegExp(`href="(${prefix}[^"]*\\.(?:htm|pdf))"[^>]*>([\\s\\S]*?)</a>`, "gi");
  let match;
  while ((match = re.exec(html)) !== null) {
    const href = match[1];
    if (gorulen.has(href)) continue;
    gorulen.add(href);
    let baslik = match[2]
      .replace(/<[^>]+>/g, " ")
      .replace(/&[a-z]+;/gi, " ")
      .replace(/\s+/g, " ")
      .trim();
    // Fihristteki madde işareti (–– vb.) ve baştaki noktalama temizlenir.
    baslik = baslik.replace(/^[^0-9A-Za-zÇĞİÖŞÜçğıöşü]+/, "").trim();
    if (baslik.length < 8) continue;
    maddeler.push({ baslik, link: `${base}${href}`, tarih: isoTarih, aciklama: "" });
  }
  return maddeler;
}

/**
 * Bugünden başlayarak en fazla 7 gün geriye giderek yayımlanmış
 * en yakın günlük fihristi çeker. Gazete yayımlanmayan günler (hafta sonu/
 * tatil) 404 döndüğü için atlanır.
 */
async function fetchGunlukFihrist(): Promise<{ maddeler: RSSMadde[]; tarih: string }> {
  const bugun = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(bugun);
    d.setDate(d.getDate() - i);
    const { url, base, prefix } = fihristBilgisi(d);
    let res: Response;
    try {
      res = await fetch(url, {
        next: { revalidate: 0 },
        signal: AbortSignal.timeout(15_000),
        headers: { "user-agent": "Mozilla/5.0" },
      });
    } catch {
      continue; // ağ hatası — önceki güne düş
    }
    if (!res.ok) continue; // 404 — o gün gazete yok, önceki güne düş
    const buf = await res.arrayBuffer();
    // Fihrist sayfaları windows-1254 (Türkçe) kodludur; UTF-8 varsaymak bozar.
    const html = new TextDecoder("windows-1254").decode(buf);
    const maddeler = parseFihrist(html, base, prefix, d.toISOString());
    if (maddeler.length > 0) return { maddeler, tarih: d.toISOString() };
  }
  throw new Error("Resmi Gazete günlük fihristi alınamadı (son 7 gün)");
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

function generateHeuristicSummary(title: string): string {
  const normalized = title.toLowerCase();
  const matched = MALI_ANAHTAR_KELIMELER.filter((kw) => normalized.includes(kw));
  if (matched.length > 0) {
    const keywordsStr = matched.map(m => m.toUpperCase()).join(", ");
    return `Bu Resmi Gazete maddesi doğrudan ${keywordsStr} süreçlerini etkilemektedir. İlgili mükelleflerin durumunu kontrol etmeniz önerilir.`;
  }
  return "Resmi Gazete'de yayımlanan mevzuat değişikliği/tebliğ. Detaylı bilgi için kaynak bağlantıyı inceleyin.";
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
    const { maddeler: tumMaddeler } = await fetchGunlukFihrist();
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
        aiOzet: generateHeuristicSummary(m.baslik),
        maliMusavirEtkisi: "AI özeti devre dışı — detay için kaynak linke bakın.",
        aksiyonGerekiyor: false,
        maliMusavirEtkiPuani: 35,
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
