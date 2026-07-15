/**
 * Yeni deploy sonrası eski chunk hash'leri 404 verir → ChunkLoadError.
 * Tek çare sayfayı yenilemektir; ancak chunk kalıcı olarak eksikse (bozuk deploy)
 * koşulsuz reload sonsuz döngü kurar ve sunucuyu döver. Bu yüzden yenileme
 * 15 saniyede bir ile sınırlanır: geçici durumda kurtarır, kalıcı arızada
 * kullanıcı bakım ekranında kalır ve döngü oluşmaz.
 */

const ANAHTAR = "last-chunk-error-reload";
const ARALIK_MS = 15_000;

export function isChunkError(error: { name?: string; message?: string } | null | undefined): boolean {
  if (!error) return false;
  const mesaj = error.message ?? "";
  return error.name === "ChunkLoadError" || /loading chunk/i.test(mesaj) || /failed to fetch/i.test(mesaj);
}

/**
 * Döngü koruması ile sayfayı bir kez yeniler.
 * @returns yenileme tetiklendiyse true
 */
export function chunkReloadOnce(): boolean {
  try {
    const son = sessionStorage.getItem(ANAHTAR);
    const simdi = Date.now();
    if (son && simdi - parseInt(son, 10) <= ARALIK_MS) return false;
    sessionStorage.setItem(ANAHTAR, String(simdi));
  } catch {
    // sessionStorage erişilemiyorsa döngüyü engelleyemeyiz → yenileme yapma
    return false;
  }
  window.location.reload();
  return true;
}
