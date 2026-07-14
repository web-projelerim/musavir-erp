/**
 * GET /api/turmob/duyurular
 *
 * TÜRMOB (turmob.org.tr) haber/duyuru feed'ini çeker ve
 * son 10 haberi döner. RSS XML parse edilir; RSS yoksa boş döner.
 *
 * Günlük cache: istemci tarafında localStorage ile yönetilir.
 * Sunucu tarafı cache: Next.js revalidate ile 4 saat.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireStaff } from "@/lib/firebase/verifyToken";

export const dynamic = "force-dynamic";
export const maxDuration = 20;

const TURMOB_RSS_URLS = [
  "https://www.turmob.org.tr/rss/haberler",
  "https://www.turmob.org.tr/rss.aspx",
  "https://www.turmob.org.tr/feed",
];

interface TurmobHaber {
  baslik: string;
  link: string;
  tarih: string;
  ozet: string;
}

function parseRssXml(xml: string): TurmobHaber[] {
  const haberler: TurmobHaber[] = [];
  // <item> bloklarını çek
  const itemRe = /<item[^>]*>([\s\S]*?)<\/item>/gi;
  let itemMatch;
  while ((itemMatch = itemRe.exec(xml)) !== null) {
    const block = itemMatch[1];

    const baslik = extractTag(block, "title");
    const link = extractTag(block, "link") || extractTag(block, "guid");
    const tarihRaw = extractTag(block, "pubDate") || extractTag(block, "dc:date");
    const ozet =
      stripHtml(extractTag(block, "description") || extractTag(block, "content:encoded") || "")
        .slice(0, 200)
        .trim();

    if (!baslik || !link) continue;

    let tarih = new Date().toISOString();
    if (tarihRaw) {
      const parsed = new Date(tarihRaw);
      if (!isNaN(parsed.getTime())) tarih = parsed.toISOString();
    }

    haberler.push({ baslik: stripHtml(baslik).trim(), link: link.trim(), tarih, ozet });
  }
  return haberler;
}

function extractTag(xml: string, tag: string): string {
  const re = new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`, "i");
  const m = re.exec(xml);
  return m ? m[1].trim() : "";
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/&[a-z#0-9]+;/gi, " ").replace(/\s+/g, " ").trim();
}

async function fetchTurmobRss(): Promise<TurmobHaber[]> {
  for (const url of TURMOB_RSS_URLS) {
    try {
      const res = await fetch(url, {
        headers: { "user-agent": "Mozilla/5.0", accept: "application/rss+xml, application/xml, text/xml, */*" },
        signal: AbortSignal.timeout(12_000),
        next: { revalidate: 14_400 }, // 4 saat
      });
      if (!res.ok) continue;
      const text = await res.text();
      if (!text.includes("<item")) continue;
      const haberler = parseRssXml(text);
      if (haberler.length > 0) return haberler.slice(0, 10);
    } catch {
      // bir sonraki URL'yi dene
    }
  }
  return [];
}

export async function GET(req: NextRequest) {
  const actor = await requireStaff(req);
  if (!actor) {
    return NextResponse.json({ ok: false, error: "Yetkisiz" }, { status: 401 });
  }

  try {
    const haberler = await fetchTurmobRss();
    return NextResponse.json({ ok: true, haberler, tarih: new Date().toISOString() });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Bilinmeyen hata";
    console.warn("[TÜRMOB Duyurular] atlandı:", message);
    return NextResponse.json({ ok: false, error: message });
  }
}
