import type { BeyanTakipKolon } from "@/lib/types";

export const BEYAN_TAKIP_KOLONLARI: BeyanTakipKolon[] = [
  { key: "kdv1", label: "KDV-1", sonGun: 26, periyot: "aylik", grup: "kdv", sira: 1 },
  { key: "kdv2", label: "KDV-2", sonGun: 26, periyot: "aylik", grup: "kdv", sira: 2 },
  { key: "kdv4", label: "KDV-4", sonGun: 26, periyot: "aylik", grup: "kdv", sira: 3 },
  { key: "ba", label: "BA", sonGun: "son_gun", periyot: "aylik", grup: "bildirim", sira: 4 },
  { key: "bs", label: "BS", sonGun: "son_gun", periyot: "aylik", grup: "bildirim", sira: 5 },
  { key: "muhsgk", label: "MuhSGK", sonGun: 26, periyot: "aylik", grup: "muhtasar", sira: 6 },
  { key: "muhsgk2", label: "MuhSGK2", sonGun: 26, periyot: "aylik", grup: "muhtasar", sira: 7 },
  { key: "damga", label: "Damga", sonGun: 26, periyot: "aylik", grup: "diger", sira: 8 },
  { key: "gecici", label: "Geçici", sonGun: 17, periyot: "ucaylik", grup: "gelir_kurumlar", sira: 9, gorunurAylar: [1, 4, 7, 10] },
  { key: "kurumlar", label: "Kurumlar", sonGun: 30, periyot: "yillik", grup: "gelir_kurumlar", sira: 10, gorunurAylar: [3] },
  { key: "gelir", label: "Gelir", sonGun: 31, periyot: "yillik", grup: "gelir_kurumlar", sira: 11, gorunurAylar: [2] },
  { key: "gelir1001e", label: "Gelir1001E", sonGun: 31, periyot: "yillik", grup: "gelir_kurumlar", sira: 12, gorunurAylar: [2] },
  { key: "poset", label: "Poşet", sonGun: 26, periyot: "aylik", grup: "diger", sira: 13 },
  { key: "turizm", label: "Turizm", sonGun: 26, periyot: "aylik", grup: "diger", sira: 14 },
  { key: "otv1", label: "ÖTV 1", sonGun: 15, periyot: "aylik", grup: "otv", sira: 15 },
  { key: "otv3a", label: "ÖTV 3A", sonGun: 15, periyot: "aylik", grup: "otv", sira: 16 },
  { key: "otv4", label: "ÖTV 4", sonGun: 15, periyot: "aylik", grup: "otv", sira: 17 },
  { key: "basit", label: "Basit", sonGun: "son_gun", periyot: "yillik", grup: "gelir_kurumlar", sira: 18, gorunurAylar: [1] },
  { key: "noter", label: "Noter", sonGun: 26, periyot: "aylik", grup: "diger", sira: 19 },
  { key: "oiv", label: "ÖİV", sonGun: 15, periyot: "aylik", grup: "diger", sira: 20 },
  { key: "konaklama", label: "Konaklama", sonGun: 26, periyot: "aylik", grup: "diger", sira: 21 },
];

export const BEYAN_TAKIP_GRUP_LABELS: Record<string, string> = {
  kdv: "KDV",
  muhtasar: "Muhtasar",
  gelir_kurumlar: "Gelir/Kurumlar",
  otv: "ÖTV",
  bildirim: "Bildirim",
  diger: "Diğer",
};
