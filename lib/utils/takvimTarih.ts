/** Takvim/tarih dönüşümleri — MiniTakvim ve benzeri bileşenlerde kullanılır. */

/**
 * Bir olay tarihini (ISO string) "YYYY-MM-DD" takvim gününe çevirir.
 *
 * ISO string'in ilk 10 karakteri her zaman yazarın kastettiği takvim gününü
 * verir. `new Date()` ile parse edip yerel saat dilimi bileşenlerini okumak
 * yerine bunu doğrudan almak gerekir — aksi halde UTC gece yarısına yakın tam
 * zaman damgaları (çoğu sonTarih/vadeTarihi/terminTarihi alanı
 * `new Date().toISOString()` ile üretiliyor) yerel saat diliminde bir sonraki
 * güne/aya kayabiliyor (özellikle ay sonlarında fark ediliyor).
 */
export function isoToLocalDateStr(iso: string): string {
  const direct = iso.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(direct)) return direct;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Bir Date nesnesinin YEREL takvim gününü döner ("bugün" gibi "şu an" anlamındaki değerler için). */
export function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
