import type { ResmiGazeteOzeti } from "@/lib/types";

const KEYWORDS = [
  "vergi",
  "usul",
  "beyanname",
  "sgk",
  "tesvik",
  "kdv",
  "gelir",
  "kurumlar",
  "e-belge",
  "mukellef",
  "muhasebe",
  "bildirim",
  "ceza",
  "yapilandirma",
];

export function isMaliMusavirRelevant(title: string) {
  const normalized = title.toLocaleLowerCase("tr-TR");
  return KEYWORDS.some((keyword) => normalized.includes(keyword));
}

export function createHeuristicGazeteSummary(input: {
  ofisId: string;
  title: string;
  sourceUrl: string;
  date: string;
}): Omit<ResmiGazeteOzeti, "id" | "createdAt"> {
  const normalized = input.title.toLocaleLowerCase("tr-TR");
  const matched = KEYWORDS.filter((keyword) => normalized.includes(keyword));
  const score = Math.min(95, 45 + matched.length * 12);

  return {
    ofisId: input.ofisId,
    yayinTarihi: input.date,
    baslik: input.title,
    kaynakLink: input.sourceUrl,
    kategori: matched[0] ?? "genel",
    aiOzet:
      matched.length > 0
        ? `Bu duzenleme ${matched.join(", ")} basliklariyla iliskili olabilir. Resmi metin incelenerek etkilenen musteriler belirlenmeli.`
        : "Mali musavirlik etkisi otomatik olarak net belirlenemedi.",
    maliMusavirEtkisi:
      matched.length > 0
        ? "Sure, beyan, bildirim veya belge takibi acisindan portfoy kontrolu onerilir."
        : "Kaynak metin kontrol edilmeli.",
    aksiyonGerekiyor: score >= 60,
    maliMusavirEtkiPuani: score,
    durum: "yeni",
  };
}
