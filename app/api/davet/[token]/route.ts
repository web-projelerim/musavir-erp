import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import type { Davet } from "@/lib/types";

// Sunucu tarafında btoa yerine Buffer kullanılır
function hashToken(token: string): string {
  return Buffer.from(token).toString("base64").replace(/=+$/, "");
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
    const tokenHash = hashToken(token);

    // tokenHash ile ara, bulamazsan davetLinki sonekiyle ara
    let snapshot = await db
      .collection("davetler")
      .where("tokenHash", "==", tokenHash)
      .limit(1)
      .get();

    if (snapshot.empty) {
      snapshot = await db
        .collection("davetler")
        .where("davetLinki", ">=", `/davet/${token}`)
        .where("davetLinki", "<=", `/davet/${token}`)
        .limit(1)
        .get();
    }

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
