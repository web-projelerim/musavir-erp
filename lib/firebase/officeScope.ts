import "server-only";
import { getAdminDb } from "@/lib/firebase/admin";

/**
 * B9: Bir gönderim/işlem, çağıran personelin ofisi dışındaki müşterileri
 * hedefleyemez. Verilen musteriId listesinin TAMAMININ `ofisId`'ye ait
 * olduğunu Admin SDK ile doğrular.
 *
 * Dönüş:
 *   { ok: true }                         → tüm müşteriler ofise ait
 *   { ok: false, disallowed: string[] }  → ofis dışı / bulunamayan müşteriler
 *
 * Admin SDK yapılandırılmamışsa:
 *   - production → fail-closed ({ ok:false })
 *   - development → doğrulamayı atlar ({ ok:true }, uyarı loglanır)
 */
export async function assertMusterilerInOffice(
  musteriIds: string[],
  ofisId: string
): Promise<{ ok: true } | { ok: false; disallowed: string[] }> {
  const uniqueIds = Array.from(new Set(musteriIds.filter(Boolean)));
  if (uniqueIds.length === 0) return { ok: true };

  const db = getAdminDb();
  if (!db) {
    if (process.env.NODE_ENV === "production") {
      console.error(
        "[assertMusterilerInOffice] Admin SDK yok — production'da ofis kapsamı doğrulanamıyor, istek reddedildi."
      );
      return { ok: false, disallowed: uniqueIds };
    }
    console.warn(
      "[assertMusterilerInOffice] Admin SDK yok (dev) — ofis kapsamı kontrolü atlanıyor."
    );
    return { ok: true };
  }

  const snaps = await db.getAll(
    ...uniqueIds.map((id) => db.collection("musteriler").doc(id))
  );

  const disallowed: string[] = [];
  for (const snap of snaps) {
    const data = snap.data();
    if (!snap.exists || !data || data.ofisId !== ofisId) {
      disallowed.push(snap.id);
    }
  }

  return disallowed.length === 0 ? { ok: true } : { ok: false, disallowed };
}
