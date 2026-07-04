import { authHeaders } from "@/lib/firebase/client";

/**
 * Bir kullanıcının rol/ofisId/musteriId bilgisini custom claim'e senkronize eder.
 * Müşavirin, kendi ofisindeki bir kullanıcının rolünü değiştirdikten sonra
 * çağırması içindir. Sunucu (/api/auth/sync-claims), hedef kullanıcının çağıranla
 * aynı ofiste olduğunu doğrular.
 *
 * NOT: Claim, hedef kullanıcının token'ı yenilenene kadar (~1 saat veya yeniden
 * giriş) etkin olmaz. Bu yüzden UI, rol değişiminde kullanıcıya "değişikliğin
 * tam etkin olması için yeniden giriş gerekebilir" bilgisini göstermelidir.
 *
 * @returns { ok, error? }
 */
export async function syncClaimsFor(
  targetUid: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch("/api/auth/sync-claims", {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify({ targetUid }),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      return { ok: false, error: data.error ?? `Sunucu hatası (${res.status})` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Ağ hatası" };
  }
}
