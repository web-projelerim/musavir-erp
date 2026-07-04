/**
 * POST /api/auth/sync-claims
 *
 * Kullanıcının Firestore'daki rol/ofisId/musteriId bilgisini Firebase custom
 * claims'e yazar (B1). İki senaryo:
 *
 *  1. Self-sync: Kullanıcı kendi claim'ini senkronize eder (body boş).
 *     Yalnızca kendi Firestore kaydındaki değerler claim'e yazılır — kullanıcı
 *     rolünü YÜKSELTEMEZ, çünkü kaynak Firestore dokümanıdır ve o doküman da
 *     kurallarla korunmaktadır.
 *
 *  2. Admin-sync: Müşavir, kendi ofisindeki bir kullanıcının claim'ini
 *     senkronize eder (body: { targetUid }). Hedef kullanıcı müşavirle aynı
 *     ofiste olmalı.
 *
 * Claim değişikliği istemcide getIdToken(true) çağrılana kadar (ya da en geç
 * ~1 saat sonra token yenilenene kadar) etkin olmaz.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/firebase/verifyToken";
import { getAdminDb, syncUserClaims } from "@/lib/firebase/admin";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const actor = await requireAuth(req);
  if (!actor) {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
  }

  const db = getAdminDb();
  if (!db) {
    return NextResponse.json(
      { error: "Firebase Admin yapılandırması eksik (FIREBASE_SERVICE_ACCOUNT_KEY)" },
      { status: 503 }
    );
  }

  let body: { targetUid?: string } = {};
  try {
    body = await req.json();
  } catch {
    /* body opsiyonel */
  }

  // Hedef kullanıcıyı belirle: kendisi mi, yoksa müşavir başkası için mi?
  const targetUid = body.targetUid ?? actor.uid;

  try {
    // Actor'ın kendi kaydını oku (rol doğrulaması için)
    const actorSnap = await db.collection("kullanicilar").doc(actor.uid).get();
    if (!actorSnap.exists) {
      return NextResponse.json({ error: "Kullanıcı kaydı bulunamadı" }, { status: 404 });
    }
    const actorData = actorSnap.data() as { rol?: string; ofisId?: string; aktif?: boolean };

    if (actorData.aktif === false) {
      return NextResponse.json({ error: "Hesap devre dışı" }, { status: 403 });
    }

    // Başkası için sync isteniyorsa: yalnızca müşavir + aynı ofis
    let targetSnap = actorSnap;
    if (targetUid !== actor.uid) {
      if (actorData.rol !== "musavir") {
        return NextResponse.json(
          { error: "Yalnızca müşavir başka kullanıcının claim'ini senkronize edebilir" },
          { status: 403 }
        );
      }
      targetSnap = await db.collection("kullanicilar").doc(targetUid).get();
      if (!targetSnap.exists) {
        return NextResponse.json({ error: "Hedef kullanıcı bulunamadı" }, { status: 404 });
      }
      const targetData = targetSnap.data() as { ofisId?: string };
      if (targetData.ofisId !== actorData.ofisId) {
        return NextResponse.json(
          { error: "Hedef kullanıcı sizin ofisinizde değil" },
          { status: 403 }
        );
      }
    }

    const data = targetSnap.data() as {
      rol?: string;
      ofisId?: string;
      musteriId?: string | null;
    };

    if (!data.rol || !data.ofisId) {
      return NextResponse.json(
        { error: "Kullanıcı kaydında rol veya ofisId eksik" },
        { status: 422 }
      );
    }

    const ok = await syncUserClaims(targetUid, {
      rol: data.rol,
      ofisId: data.ofisId,
      musteriId: data.musteriId ?? null,
    });

    if (!ok) {
      return NextResponse.json(
        { error: "Claim yazılamadı (Admin Auth yapılandırması eksik)" },
        { status: 503 }
      );
    }

    return NextResponse.json({
      ok: true,
      uid: targetUid,
      claims: { rol: data.rol, ofisId: data.ofisId, ...(data.musteriId ? { musteriId: data.musteriId } : {}) },
      // İstemci bu bilgiyle getIdToken(true) çağırıp token'ı tazelemeli
      refreshRequired: true,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Bilinmeyen hata";
    console.error("[sync-claims] HATA:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
