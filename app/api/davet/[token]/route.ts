import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import type { Davet } from "@/lib/types";

async function hashToken(token: string): Promise<string> {
  const data = new TextEncoder().encode(token);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function GET(_req: Request, { params }: { params: { token: string } }) {
  const { token } = params;
  if (!token) {
    return NextResponse.json({ error: "Token eksik" }, { status: 400 });
  }

  const db = getAdminDb();
  if (!db) {
    // Admin SDK yoksa (geliştirme ortamı / demo), 404 döner
    return NextResponse.json({ error: "Firebase Admin yapılandırması eksik" }, { status: 503 });
  }

  try {
    const tokenHash = await hashToken(token);

    // Yalnızca tokenHash ile ara. (Eski `davetLinki` fallback'i kaldırıldı:
    // hash'lenmemiş token'ların düz metinle bulunmasına izin veriyordu.
    // Eski format davetler geçersizdir; gerekirse yeniden davet gönderin.)
    const snapshot = await db
      .collection("davetler")
      .where("tokenHash", "==", tokenHash)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return NextResponse.json({ error: "Davet bulunamadı" }, { status: 404 });
    }

    const docSnap = snapshot.docs[0];
    const davet = { id: docSnap.id, ...docSnap.data() } as Davet;

    // Güvenli alanları döndür — tokenHash'i istemciye verme
    const { tokenHash: _hash, ...safeDavet } = davet;
    void _hash;
    return NextResponse.json(safeDavet);
  } catch (err) {
    console.error("[API /api/davet] Hata:", err);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
