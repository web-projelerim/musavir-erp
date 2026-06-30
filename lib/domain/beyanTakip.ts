import type {
  BeyanTakipDurum,
  BeyanTakipHucresi,
  BeyanTakipKolon,
  Musteri,
} from "@/lib/types";
import { BEYAN_TAKIP_KOLONLARI } from "@/lib/data/beyanTakipKolonlari";

// ─── Durum Etiketleri ───────────────────────────────────────

const DURUM_CONFIG: Record<
  BeyanTakipDurum,
  { label: string; renk: string; bg: string; border: string }
> = {
  bos: { label: "Başlanmadı", renk: "text-slate-400", bg: "bg-slate-100", border: "border-slate-200" },
  evrak_bekleniyor: { label: "Evrak Bekleniyor", renk: "text-blue-700", bg: "bg-blue-100", border: "border-blue-200" },
  hazirlaniyor: { label: "Hazırlanıyor", renk: "text-blue-800", bg: "bg-blue-200", border: "border-blue-300" },
  kontrol: { label: "Kontrol", renk: "text-amber-800", bg: "bg-amber-100", border: "border-amber-300" },
  gonderildi: { label: "Gönderildi", renk: "text-amber-900", bg: "bg-amber-300", border: "border-amber-400" },
  tamamlandi: { label: "Tamamlandı", renk: "text-emerald-800", bg: "bg-emerald-400", border: "border-emerald-500" },
  sorun: { label: "Sorun", renk: "text-red-800", bg: "bg-red-300", border: "border-red-400" },
};

export function takipDurumLabel(durum: BeyanTakipDurum): string {
  return DURUM_CONFIG[durum].label;
}

export function takipDurumRenk(durum: BeyanTakipDurum) {
  return DURUM_CONFIG[durum];
}

export const TAKIP_DURUM_SECENEKLER: { value: BeyanTakipDurum; label: string }[] = [
  { value: "bos", label: "Başlanmadı" },
  { value: "evrak_bekleniyor", label: "Evrak Bekleniyor" },
  { value: "hazirlaniyor", label: "Hazırlanıyor" },
  { value: "kontrol", label: "Kontrol" },
  { value: "gonderildi", label: "Gönderildi" },
  { value: "tamamlandi", label: "Tamamlandı" },
  { value: "sorun", label: "Sorun" },
];

// ─── Sütun Görünürlüğü ─────────────────────────────────────

export function gorunurKolonlar(
  musteriler: Musteri[],
  donem: string,
  kolonlar: BeyanTakipKolon[] = BEYAN_TAKIP_KOLONLARI
): BeyanTakipKolon[] {
  const ay = parseInt(donem.split("-")[1], 10) - 1;

  return kolonlar.filter((kolon) => {
    const herhangiMukellef = musteriler.some(
      (m) => m.durum === "aktif" && m.vergiTurleri?.[kolon.key] === "mukellef"
    );
    if (!herhangiMukellef) return false;

    if (kolon.gorunurAylar) {
      return kolon.gorunurAylar.includes(ay);
    }

    return true;
  });
}

// ─── Son Tarih Hesaplama ────────────────────────────────────

export type SonTarihDurumu = "normal" | "yaklasan" | "gecikti";

function ayinSonGunu(yil: number, ay: number): number {
  return new Date(yil, ay, 0).getDate();
}

export function hesaplaSonTarih(kolon: BeyanTakipKolon, donem: string): Date {
  const [yil, ay] = donem.split("-").map(Number);
  const gun = kolon.sonGun === "son_gun" ? ayinSonGunu(yil, ay) : kolon.sonGun;
  const tarih = new Date(yil, ay - 1, gun);
  // Hafta sonuna denk gelirse pazartesiye al
  const dow = tarih.getDay();
  if (dow === 6) tarih.setDate(tarih.getDate() + 2);
  if (dow === 0) tarih.setDate(tarih.getDate() + 1);
  return tarih;
}

export function sonTarihDurumu(kolon: BeyanTakipKolon, donem: string): SonTarihDurumu {
  const sonTarih = hesaplaSonTarih(kolon, donem);
  const bugun = new Date();
  bugun.setHours(0, 0, 0, 0);
  const kalanMs = sonTarih.getTime() - bugun.getTime();
  const kalanGun = Math.ceil(kalanMs / 86_400_000);
  if (kalanGun < 0) return "gecikti";
  if (kalanGun <= 3) return "yaklasan";
  return "normal";
}

// ─── Kalan İş Hesaplama ────────────────────────────────────

export interface KalanIsUyari {
  kolon: BeyanTakipKolon;
  kalanFirma: number;
  toplamFirma: number;
  sonTarihDurumu: SonTarihDurumu;
  sonTarih: Date;
}

export function hesaplaKalanIsler(
  musteriler: Musteri[],
  kolonlar: BeyanTakipKolon[],
  hucreler: BeyanTakipHucresi[],
  donem: string
): KalanIsUyari[] {
  const hucreMap = new Map<string, BeyanTakipHucresi>();
  for (const h of hucreler) {
    hucreMap.set(`${h.musteriId}-${h.vergiTuruKey}`, h);
  }

  const uyarilar: KalanIsUyari[] = [];

  for (const kolon of kolonlar) {
    const durumu = sonTarihDurumu(kolon, donem);
    if (durumu === "normal") continue;

    const ilgiliMusteriler = musteriler.filter(
      (m) => m.durum === "aktif" && m.vergiTurleri?.[kolon.key] === "mukellef"
    );
    const kalanFirma = ilgiliMusteriler.filter((m) => {
      const hucre = hucreMap.get(`${m.id}-${kolon.key}`);
      return !hucre || hucre.durum !== "tamamlandi";
    }).length;

    if (kalanFirma > 0) {
      uyarilar.push({
        kolon,
        kalanFirma,
        toplamFirma: ilgiliMusteriler.length,
        sonTarihDurumu: durumu,
        sonTarih: hesaplaSonTarih(kolon, donem),
      });
    }
  }

  return uyarilar.sort((a, b) => a.sonTarih.getTime() - b.sonTarih.getTime());
}

// ─── Geçici Vergi Dönem Uyarısı ─────────────────────────────

export function geciciVergiUyarisi(donem: string): string | null {
  const ay = parseInt(donem.split("-")[1], 10);
  const donemler: Record<number, string> = {
    3: "1. Geçici Vergi dönemi bitiyor, vergi çıkacak mükelleflerinizi uyarınız",
    6: "2. Geçici Vergi dönemi bitiyor, vergi çıkacak mükelleflerinizi uyarınız",
    9: "3. Geçici Vergi dönemi bitiyor, vergi çıkacak mükelleflerinizi uyarınız",
    12: "4. Geçici Vergi dönemi bitiyor, vergi çıkacak mükelleflerinizi uyarınız",
  };
  return donemler[ay] ?? null;
}

// ─── Hücre ID Hesaplama ─────────────────────────────────────

export function beyanTakipHucreId(musteriId: string, vergiTuruKey: string, donem: string): string {
  return `bth-${musteriId}-${vergiTuruKey}-${donem}`;
}

// ─── İstatistikler ──────────────────────────────────────────

export function hesaplaTakipIstatistik(
  musteriler: Musteri[],
  kolonlar: BeyanTakipKolon[],
  hucreler: BeyanTakipHucresi[]
) {
  let toplam = 0;
  let tamamlanan = 0;
  let sorunlu = 0;

  const hucreMap = new Map<string, BeyanTakipHucresi>();
  for (const h of hucreler) {
    hucreMap.set(`${h.musteriId}-${h.vergiTuruKey}`, h);
  }

  for (const m of musteriler.filter((m) => m.durum === "aktif")) {
    for (const k of kolonlar) {
      if (m.vergiTurleri?.[k.key] !== "mukellef") continue;
      toplam++;
      const hucre = hucreMap.get(`${m.id}-${k.key}`);
      if (hucre?.durum === "tamamlandi") tamamlanan++;
      if (hucre?.durum === "sorun") sorunlu++;
    }
  }

  return { toplam, tamamlanan, sorunlu, kalan: toplam - tamamlanan };
}
