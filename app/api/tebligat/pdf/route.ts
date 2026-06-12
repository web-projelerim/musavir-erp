/**
 * GET /api/tebligat/pdf?id=<tebligatId>
 *
 * Tebligat PDF proxy — GİB'deki PDF URL'sini server-side fetch eder ve
 * application/pdf olarak istemciye verir. Bu sayede:
 *   - CORS sorunu yok (kendi domain'imizden geliyor)
 *   - GİB cookie session'ları sızmıyor (sunucu çekiyor)
 *   - Karşıt inceleme tutanağı, sitemiz içinde iframe ile gösterilebilir
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/firebase/verifyToken";
import { getAdminDb } from "@/lib/firebase/admin";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const actor = await requireAuth(req);
  if (!actor) {
    return NextResponse.json({ ok: false, error: "Yetkisiz" }, { status: 401 });
  }
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ ok: false, error: "Tebligat id gerekli" }, { status: 400 });
  }

  const db = getAdminDb();
  if (!db) {
    return NextResponse.json({ ok: false, error: "Firestore admin eksik" }, { status: 500 });
  }

  try {
    const doc = await db.collection("tebligatlar").doc(id).get();
    if (!doc.exists) {
      return NextResponse.json({ ok: false, error: "Tebligat bulunamadı" }, { status: 404 });
    }
    const data = doc.data() as { pdfUrl?: string; ofisId?: string } | undefined;
    const pdfUrl = data?.pdfUrl;
    if (!pdfUrl) {
      return NextResponse.json({ ok: false, error: "PDF URL yok" }, { status: 404 });
    }

    // PDF'i GİB'den çek (cookie/session gerektirebilir — şu an düz fetch)
    const res = await fetch(pdfUrl, {
      signal: AbortSignal.timeout(30_000),
      headers: { "user-agent": "Mozilla/5.0 (MusavirERP)" },
    });
    if (!res.ok) {
      return NextResponse.json({ ok: false, error: `PDF alınamadı: HTTP ${res.status}` }, { status: 502 });
    }
    const buf = await res.arrayBuffer();
    return new NextResponse(buf, {
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `inline; filename="tebligat-${id}.pdf"`,
        "cache-control": "private, max-age=300",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Bilinmeyen hata";
    console.error("[Tebligat PDF Proxy] HATA:", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
