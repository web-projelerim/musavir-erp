import type {
  Belge,
  Beyanname,
  Gorev,
  GorevOncelik,
  GorevTip,
  Musteri,
  Tahsilat,
  Tebligat,
} from "@/lib/types";
import { buildTebligatSlaFields } from "@/lib/domain/tebligatSla";

export type OtomatikGorevKaynak = "tebligat" | "beyanname" | "tahsilat" | "belge";

export interface OtomatikGorevOnerisi {
  id: string;
  kaynak: OtomatikGorevKaynak;
  kaynakId: string;
  musteriId: string;
  musteriAdi: string;
  baslik: string;
  aciklama: string;
  gerekce: string;
  terminTarihi: string;
  oncelik: GorevOncelik;
  tip: GorevTip;
  atananKisi: string;
  atayanKisi: string;
}

export interface OtomatikGorevInput {
  musteriler: Musteri[];
  gorevler: Gorev[];
  tebligatlar: Tebligat[];
  beyannameler: Beyanname[];
  tahsilatlar: Tahsilat[];
  belgeler?: Belge[];
  today?: Date;
}

const kapaliDurumlar = new Set<Gorev["durum"]>(["tamamlandi", "iptal"]);

function isoDay(date: Date) {
  return date.toISOString().split("T")[0];
}

function startOfDay(date: Date) {
  const clone = new Date(date);
  clone.setHours(0, 0, 0, 0);
  return clone;
}

function addDays(date: Date, days: number) {
  const clone = new Date(date);
  clone.setDate(clone.getDate() + days);
  return clone;
}

function subDays(date: Date, days: number) {
  return addDays(date, -days);
}

function parseDate(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function daysUntil(value: string, today: Date) {
  const date = parseDate(value);
  if (!date) return 0;
  const diff = startOfDay(date).getTime() - startOfDay(today).getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function kaynakMarker(kaynak: OtomatikGorevKaynak, kaynakId: string) {
  return `[auto-gorev:${kaynak}:${kaynakId}]`;
}

function normalize(value: string) {
  return value.toLocaleLowerCase("tr-TR").trim();
}

function aktifGorevler(gorevler: Gorev[]) {
  return gorevler.filter((gorev) => !kapaliDurumlar.has(gorev.durum));
}

function kaynakIcinGorevVarMi(gorevler: Gorev[], kaynak: OtomatikGorevKaynak, kaynakId: string) {
  const marker = kaynakMarker(kaynak, kaynakId);
  return aktifGorevler(gorevler).some((gorev) => gorev.aciklama?.includes(marker));
}

function musteriBul(musteriler: Musteri[], musteriId: string, fallbackAdi: string) {
  return musteriler.find((musteri) => musteri.id === musteriId) ?? {
    id: musteriId,
    firmaAdi: fallbackAdi,
    sorumluPersonel: "Selin Kaya",
  };
}

function legacyBenzerGorevVarMi(gorevler: Gorev[], musteriId: string, tip: GorevTip, aramaTerimleri: string[]) {
  const terms = aramaTerimleri.map(normalize).filter(Boolean);
  return aktifGorevler(gorevler).some((gorev) => {
    if (gorev.musteriId !== musteriId || gorev.tip !== tip) return false;
    const title = normalize(gorev.baslik);
    if (tip === "tebligat" || tip === "tahsilat") return true;
    return terms.length > 0 && terms.every((term) => title.includes(term));
  });
}

function beyannameBelgesiVarMi(belgeler: Belge[], beyanname: Beyanname) {
  const tur = normalize(beyanname.tur);
  const donemTokens = normalize(beyanname.donem)
    .split(/\s+/)
    .filter((token) => token.length > 1);

  return belgeler
    .filter((belge) => belge.musteriId === beyanname.musteriId && belge.kategori === "beyanname")
    .some((belge) => {
      const belgeText = normalize(`${belge.dosyaAdi} ${belge.notlar ?? ""}`);
      return belgeText.includes(tur) && donemTokens.every((token) => belgeText.includes(token));
    });
}

function geciktiMi(tarih: string, today: Date) {
  return daysUntil(tarih, today) < 0;
}

function yaklasiyorMu(tarih: string, today: Date, gun = 7) {
  const kalan = daysUntil(tarih, today);
  return kalan >= 0 && kalan <= gun;
}

export function gorevInputFromOneri(
  oneri: OtomatikGorevOnerisi,
  ofisId: string
): Omit<Gorev, "id" | "durum" | "createdAt" | "tamamlanmaTarihi" | "notlar"> {
  return {
    ofisId,
    baslik: oneri.baslik,
    aciklama: `${oneri.aciklama}\n\n${kaynakMarker(oneri.kaynak, oneri.kaynakId)}`,
    musteriId: oneri.musteriId,
    musteriAdi: oneri.musteriAdi,
    atananKisi: oneri.atananKisi,
    atayanKisi: oneri.atayanKisi,
    terminTarihi: oneri.terminTarihi,
    oncelik: oneri.oncelik,
    tip: oneri.tip,
  };
}

export function hesaplaOtomatikGorevOnerileri({
  musteriler,
  gorevler,
  tebligatlar,
  beyannameler,
  tahsilatlar,
  belgeler = [],
  today = new Date(),
}: OtomatikGorevInput): OtomatikGorevOnerisi[] {
  const oneriler: OtomatikGorevOnerisi[] = [];
  const bugun = startOfDay(today);

  tebligatlar
    .filter((tebligat) => tebligat.durum === "yeni" || tebligat.durum === "bekliyor")
    .forEach((tebligat) => {
      if (kaynakIcinGorevVarMi(gorevler, "tebligat", tebligat.id)) return;
      if (legacyBenzerGorevVarMi(gorevler, tebligat.musteriId, "tebligat", [tebligat.baslik])) return;

      const musteri = musteriBul(musteriler, tebligat.musteriId, tebligat.musteriAdi);
      const acil = /uzlasma|inceleme|ceza|haciz/i.test(normalize(`${tebligat.tur} ${tebligat.baslik}`));
      // Görevin termini gerçek SLA yanıt süresine (kritikSonTarih) bağlanır — sabit 1-2 gün sezgisi değil.
      const kritikSonTarih =
        tebligat.kritikSonTarih ?? buildTebligatSlaFields(tebligat).kritikSonTarih ?? isoDay(addDays(bugun, acil ? 1 : 2));
      const terminTarihi = kritikSonTarih < isoDay(bugun) ? isoDay(bugun) : kritikSonTarih;

      oneriler.push({
        id: `tebligat-${tebligat.id}`,
        kaynak: "tebligat",
        kaynakId: tebligat.id,
        musteriId: tebligat.musteriId,
        musteriAdi: tebligat.musteriAdi,
        baslik: `Tebligat incele - ${tebligat.musteriAdi}`,
        aciklama: `${tebligat.baslik}\nTur: ${tebligat.tur}\nTarih: ${tebligat.tarih}`,
        gerekce: "Yeni/islem bekleyen tebligat var",
        terminTarihi,
        oncelik: acil ? "kritik" : "yuksek",
        tip: "tebligat",
        atananKisi: "sorumluPersonel" in musteri ? musteri.sorumluPersonel : "Selin Kaya",
        atayanKisi: "Sistem",
      });
    });

  beyannameler
    .filter((beyanname) => beyanname.durum === "gecikti" || (beyanname.durum === "bekliyor" && (geciktiMi(beyanname.sonTarih, bugun) || yaklasiyorMu(beyanname.sonTarih, bugun))))
    .forEach((beyanname) => {
      if (kaynakIcinGorevVarMi(gorevler, "beyanname", beyanname.id)) return;
      if (legacyBenzerGorevVarMi(gorevler, beyanname.musteriId, "beyanname", [beyanname.tur, beyanname.donem])) return;

      const musteri = musteriBul(musteriler, beyanname.musteriId, beyanname.musteriAdi);
      const gecikti = beyanname.durum === "gecikti" || geciktiMi(beyanname.sonTarih, bugun);

      oneriler.push({
        id: `beyanname-${beyanname.id}`,
        kaynak: "beyanname",
        kaynakId: beyanname.id,
        musteriId: beyanname.musteriId,
        musteriAdi: beyanname.musteriAdi,
        baslik: `${beyanname.tur} beyannamesi hazirla - ${beyanname.donem}`,
        aciklama: `${beyanname.musteriAdi} icin ${beyanname.donem} donemi ${beyanname.tur} beyannamesi takip edilmeli.\nSon tarih: ${beyanname.sonTarih}`,
        gerekce: gecikti ? "Beyanname son tarihi gecmis" : "Beyanname son tarihi yaklasiyor",
        terminTarihi: gecikti ? isoDay(bugun) : beyanname.sonTarih,
        oncelik: gecikti ? "kritik" : "yuksek",
        tip: "beyanname",
        atananKisi: "sorumluPersonel" in musteri ? musteri.sorumluPersonel : beyanname.sorumlu,
        atayanKisi: "Sistem",
      });
    });

  beyannameler
    .filter((beyanname) => beyanname.durum === "bekliyor" || beyanname.durum === "gecikti")
    .forEach((beyanname) => {
      if (beyannameBelgesiVarMi(belgeler, beyanname)) return;
      if (kaynakIcinGorevVarMi(gorevler, "belge", beyanname.id)) return;
      if (legacyBenzerGorevVarMi(gorevler, beyanname.musteriId, "belge", [beyanname.tur, beyanname.donem])) return;

      const musteri = musteriBul(musteriler, beyanname.musteriId, beyanname.musteriAdi);
      const kalanGun = daysUntil(beyanname.sonTarih, bugun);
      const gecikti = beyanname.durum === "gecikti" || kalanGun < 0;
      const termin = gecikti || kalanGun <= 2
        ? bugun
        : subDays(parseDate(beyanname.sonTarih) ?? bugun, 2);

      oneriler.push({
        id: `belge-${beyanname.id}`,
        kaynak: "belge",
        kaynakId: beyanname.id,
        musteriId: beyanname.musteriId,
        musteriAdi: beyanname.musteriAdi,
        baslik: `${beyanname.tur} evrak talebi - ${beyanname.musteriAdi}`,
        aciklama: `${beyanname.donem} donemi ${beyanname.tur} beyannamesi icin musteri dosyalarinda ilgili belge bulunamadi.\nSon tarih: ${beyanname.sonTarih}`,
        gerekce: "Beyanname icin ilgili belge yuklenmemis",
        terminTarihi: isoDay(termin),
        oncelik: gecikti || kalanGun <= 2 ? "kritik" : "yuksek",
        tip: "belge",
        atananKisi: "sorumluPersonel" in musteri ? musteri.sorumluPersonel : beyanname.sorumlu,
        atayanKisi: "Sistem",
      });
    });

  tahsilatlar
    .filter((tahsilat) => tahsilat.durum !== "odendi" && (tahsilat.durum === "gecikti" || geciktiMi(tahsilat.vadeTarihi, bugun)))
    .forEach((tahsilat) => {
      if (kaynakIcinGorevVarMi(gorevler, "tahsilat", tahsilat.id)) return;
      if (legacyBenzerGorevVarMi(gorevler, tahsilat.musteriId, "tahsilat", [tahsilat.donem])) return;

      const musteri = musteriBul(musteriler, tahsilat.musteriId, tahsilat.musteriAdi);
      const gecikmeGunu = Math.abs(Math.min(0, daysUntil(tahsilat.vadeTarihi, bugun)));

      oneriler.push({
        id: `tahsilat-${tahsilat.id}`,
        kaynak: "tahsilat",
        kaynakId: tahsilat.id,
        musteriId: tahsilat.musteriId,
        musteriAdi: tahsilat.musteriAdi,
        baslik: `Tahsilat takibi - ${tahsilat.musteriAdi}`,
        aciklama: `${tahsilat.donem} donemi tahsilat vadesi gecmis.\nVade: ${tahsilat.vadeTarihi}\nTutar: ${tahsilat.tutar}`,
        gerekce: `${gecikmeGunu} gun gecikmis tahsilat`,
        terminTarihi: isoDay(bugun),
        oncelik: gecikmeGunu > 7 ? "kritik" : "yuksek",
        tip: "tahsilat",
        atananKisi: "sorumluPersonel" in musteri ? musteri.sorumluPersonel : "Selin Kaya",
        atayanKisi: "Sistem",
      });
    });

  return oneriler.sort((a, b) => {
    const oncelikSirasi: Record<GorevOncelik, number> = { kritik: 0, yuksek: 1, normal: 2, dusuk: 3 };
    return oncelikSirasi[a.oncelik] - oncelikSirasi[b.oncelik] || a.terminTarihi.localeCompare(b.terminTarihi);
  });
}
