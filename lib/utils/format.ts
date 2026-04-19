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
