import { format, formatDistanceToNow, isAfter, isBefore, parseISO } from "date-fns";
import { tr } from "date-fns/locale";

export function formatTarih(tarih: string, pattern = "dd.MM.yyyy") {
  return format(parseISO(tarih), pattern, { locale: tr });
}

export function formatTarihSaat(tarih: string) {
  return format(parseISO(tarih), "dd.MM.yyyy HH:mm", { locale: tr });
}

export function formatSureGecmis(tarih: string) {
  return formatDistanceToNow(parseISO(tarih), { addSuffix: true, locale: tr });
}

export function formatPara(tutar: number) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 2,
  }).format(tutar);
}

export function geciktiMi(tarih: string) {
  return isBefore(parseISO(tarih), new Date());
}

export function yaklasanMi(tarih: string, gunSayisi = 7) {
  const hedef = parseISO(tarih);
  const limit = new Date();
  limit.setDate(limit.getDate() + gunSayisi);
  return isAfter(hedef, new Date()) && isBefore(hedef, limit);
}

/**
 * Herhangi bir tarih değerini `<input type="date">` için gereken `yyyy-MM-dd`
 * biçimine çevirir. ISO, tam Date string'i ("Wed Feb 25 2026 ..."), Firestore
 * Timestamp toString'i vb. kabul eder; geçersizse boş string döner.
 * (React "does not conform to yyyy-MM-dd" uyarısını önler.)
 */
export function toDateInputValue(value?: string | null): string {
  if (!value) return "";
  // ISO veya yyyy-MM-dd ile başlıyorsa tarih kısmını doğrudan al (saat-dilimi
  // kaymasını önlemek için parse etmeden). "2026-02-25T21:00Z" → "2026-02-25".
  const isoMatch = value.match(/^(\d{4}-\d{2}-\d{2})/);
  if (isoMatch) return isoMatch[1];
  // Aksi halde locale Date string'i ("Wed Feb 25 2026 ...") — parse edip yerel bileşenler.
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const gun = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${gun}`;
}
