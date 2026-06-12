import { COLLECTIONS, deleteDocument, updateDocument, upsertDocument } from "@/lib/firebase/firestore";
import { mapLegacyDurumToWorkflow, workflowToBeyanDurum } from "@/lib/domain/beyanWorkflow";
import type {
  AuditLog,
  BankaEkstresi,
  Davet,
  GibSyncLog,
  Gorev,
  GorevDurum,
  Belge,
  GonderimKaydi,
  KDV2Hesaplama,
  Musteri,
  Odeme,
  Rapor,
  ResmiGazeteOzeti,
  Tahakkuk,
  TahakkukDurum,
  Tebligat,
  TebligatDurum,
  Bildirim,
  BildirimDurum,
  Beyanname,
  BeyannameDurum,
  BeyannameYasamDongusuDurum,
  Tahsilat,
  TahsilatDurum,
  MukellefiyetProfili,
  Yukumluluk,
  GibEntegrasyonAyari,
  LucaEntegrasyonAyari,
  WhatsAppEntegrasyonAyari,
  BankaEntegrasyonAyari,
  EmailEntegrasyonAyari,
  EntegrasyonLog,
  Not,
  Ofis,
} from "@/lib/types";

function createId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}`;
}

export async function createMusteri(input: {
  ofisId?: string;
  firmaAdi: string;
  vknTckn: string;
  yetkiliAd: string;
  telefon: string;
  email: string;
  adres: string;
  sorumluPersonel: string;
  sorumluPersonelId?: string;
  kdvMukellef: boolean;
  muhtasarMukellef: boolean;
  varsayilanHizmetUcreti?: number;
  vergiDairesi?: string;
  kurulusTarihi?: string;
  aciklama?: string;
  importBatchId?: string;
  kaynak?: Musteri["kaynak"];
  gibIvdKullaniciAdi?: string;
  gibEncryptedIvdSifre?: string;
} & Partial<Musteri>) {
  const musteri: Musteri = {
    id: createId("m"),
    ofisId: input.ofisId ?? "ofis-default",
    firmaAdi: input.firmaAdi,
    vknTckn: input.vknTckn,
    yetkiliAd: input.yetkiliAd,
    telefon: input.telefon,
    email: input.email,
    adres: input.adres,
    durum: "aktif",
    riskSeviyesi: "dusuk",
    riskSkoru: 0,
    sorumluPersonel: input.sorumluPersonel,
    sorumluPersonelId: input.sorumluPersonelId,
    gorevDurumu: "Temiz",
    tahsilatDurumu: "bekliyor" as TahsilatDurum,
    sonGuncelleme: new Date().toISOString(),
    kdvMukellef: input.kdvMukellef,
    muhtasarMukellef: input.muhtasarMukellef,
    gecikmisPesinat: false,
    varsayilanHizmetUcreti: input.varsayilanHizmetUcreti,
    vergiDairesi: input.vergiDairesi,
    kurulusTarihi: input.kurulusTarihi,
    aciklama: input.aciklama,
    importBatchId: input.importBatchId,
    kaynak: input.kaynak ?? "manuel",
    gibIvdKullaniciAdi: input.gibIvdKullaniciAdi,
    gibEncryptedIvdSifre: input.gibEncryptedIvdSifre,
    // Genişletilmiş alanlar
    sahissaVergiNo: input.sahissaVergiNo,
    eposta1: input.eposta1, eposta1Ad: input.eposta1Ad,
    eposta2: input.eposta2, eposta2Ad: input.eposta2Ad,
    eposta3: input.eposta3, eposta3Ad: input.eposta3Ad,
    gsm1: input.gsm1, gsm1Ad: input.gsm1Ad,
    gsm2: input.gsm2, gsm2Ad: input.gsm2Ad,
    gsm3: input.gsm3, gsm3Ad: input.gsm3Ad,
    vergiTurleri: input.vergiTurleri,
    gruplar: input.gruplar,
    eDefter: input.eDefter,
    eDefterGecis: input.eDefterGecis,
    naceKodu: input.naceKodu,
    mudurGorevBitisTarihi: input.mudurGorevBitisTarihi,
    maliMuhurler: input.maliMuhurler,
    panelGirisAktif: input.panelGirisAktif,
    ikiAdimliDogrulama: input.ikiAdimliDogrulama,
    ikiAdimliYontem: input.ikiAdimliYontem,
    dogumTarihi: input.dogumTarihi,
    acilisTarihi: input.acilisTarihi,
    kapanisTarihi: input.kapanisTarihi,
    girisMailGonder: input.girisMailGonder,
  };

  await upsertDocument(COLLECTIONS.musteriler, musteri);
  return musteri;
}

export async function updateMusteri(id: string, input: Partial<Musteri>) {
  await updateDocument<Musteri>(COLLECTIONS.musteriler, id, {
    ...input,
    sonGuncelleme: new Date().toISOString(),
  });
}

export async function archiveMusteri(id: string) {
  await updateMusteri(id, {
    durum: "pasif",
  });
}

export async function createMukellefiyetProfili(input: Omit<MukellefiyetProfili, "id" | "createdAt">) {
  const profil: MukellefiyetProfili = {
    id: createId("mp"),
    ...input,
    createdAt: new Date().toISOString(),
  };

  await upsertDocument(COLLECTIONS.mukellefiyetProfilleri, profil);
  return profil;
}

export async function updateMukellefiyetProfili(id: string, input: Partial<MukellefiyetProfili>) {
  await updateDocument<MukellefiyetProfili>(COLLECTIONS.mukellefiyetProfilleri, id, {
    ...input,
    updatedAt: new Date().toISOString(),
  });
}

export async function createYukumluluk(input: Omit<Yukumluluk, "id" | "createdAt">) {
  const yukumluluk: Yukumluluk = {
    id: createId("yuk"),
    ...input,
    createdAt: new Date().toISOString(),
  };

  await upsertDocument(COLLECTIONS.yukumlulukler, yukumluluk);
  return yukumluluk;
}

export async function updateYukumluluk(id: string, input: Partial<Yukumluluk>) {
  await updateDocument<Yukumluluk>(COLLECTIONS.yukumlulukler, id, input);
}

export async function createGorev(input: {
  ofisId: string;
  baslik: string;
  aciklama?: string;
  musteriId: string;
  musteriAdi: string;
  atananKisi: string;
  atayanKisi: string;
  terminTarihi: string;
  oncelik: Gorev["oncelik"];
  tip: Gorev["tip"];
  altGorevler?: Gorev["altGorevler"];
}) {
  const gorev: Gorev = {
    id: createId("g"),
    ofisId: input.ofisId,
    baslik: input.baslik,
    aciklama: input.aciklama,
    musteriId: input.musteriId,
    musteriAdi: input.musteriAdi,
    atananKisi: input.atananKisi,
    atayanKisi: input.atayanKisi,
    terminTarihi: input.terminTarihi,
    oncelik: input.oncelik,
    durum: "beklemede",
    tip: input.tip,
    altGorevler: input.altGorevler,
    createdAt: new Date().toISOString(),
  };

  await upsertDocument(COLLECTIONS.gorevler, gorev);
  return gorev;
}

export async function updateGorevDurum(id: string, durum: GorevDurum) {
  await updateDocument<Gorev>(COLLECTIONS.gorevler, id, {
    durum,
    tamamlanmaTarihi: durum === "tamamlandi" ? new Date().toISOString() : undefined,
  });
}

export async function updateGorev(id: string, input: Partial<Gorev>) {
  await updateDocument<Gorev>(COLLECTIONS.gorevler, id, input);
}

export async function deleteGorev(id: string) {
  await deleteDocument(COLLECTIONS.gorevler, id);
}

export async function createRapor(input: Pick<Rapor, "ofisId" | "musteriId" | "musteriAdi" | "tip" | "donem">) {
  const rapor: Rapor = {
    id: createId("r"),
    ...input,
    durum: "uretiliyor",
    olusturmaTarihi: new Date().toISOString(),
  };

  await upsertDocument(COLLECTIONS.raporlar, rapor);
  return rapor;
}

export async function updateRaporDurum(id: string, durum: Rapor["durum"]) {
  await updateDocument<Rapor>(COLLECTIONS.raporlar, id, {
    durum,
  });
}

export async function updateRapor(id: string, input: Partial<Rapor>) {
  await updateDocument<Rapor>(COLLECTIONS.raporlar, id, input);
}

export async function markRaporGonderildi(id: string, kanal: NonNullable<Rapor["kanal"]>) {
  await updateDocument<Rapor>(COLLECTIONS.raporlar, id, {
    durum: "gonderildi",
    kanal,
    gonderimTarihi: new Date().toISOString(),
  });
}

export async function updateTebligatDurum(id: string, durum: TebligatDurum) {
  await updateDocument<Tebligat>(COLLECTIONS.tebligatlar, id, {
    durum,
  });
}

export async function updateTebligat(id: string, input: Partial<Tebligat>) {
  await updateDocument<Tebligat>(COLLECTIONS.tebligatlar, id, input);
}

export async function updateBildirimDurum(id: string, durum: BildirimDurum) {
  await updateDocument<Bildirim>(COLLECTIONS.bildirimler, id, {
    durum,
  });
}

export async function updateBeyannameDurum(id: string, durum: BeyannameDurum) {
  await updateDocument<Beyanname>(COLLECTIONS.beyannameler, id, {
    durum,
    yasamDongusuDurum: mapLegacyDurumToWorkflow(durum),
    verilmeTarihi: durum === "verildi" ? new Date().toISOString() : undefined,
  });
}

export async function updateBeyannameWorkflow(
  id: string,
  yasamDongusuDurum: BeyannameYasamDongusuDurum,
  extra?: Partial<Beyanname>
) {
  await updateDocument<Beyanname>(COLLECTIONS.beyannameler, id, {
    yasamDongusuDurum,
    durum: workflowToBeyanDurum(yasamDongusuDurum),
    ...extra,
  });
}

export async function updateTahsilatDurum(id: string, durum: TahsilatDurum) {
  await updateDocument<Tahsilat>(COLLECTIONS.tahsilatlar, id, {
    durum,
    odemeTarihi: durum === "odendi" || durum === "kismi" ? new Date().toISOString() : undefined,
  });
}

export async function createTahsilat(input: Omit<Tahsilat, "id">) {
  const tahsilat: Tahsilat = {
    id: createId("th"),
    ...input,
  };

  await upsertDocument(COLLECTIONS.tahsilatlar, tahsilat);
  return tahsilat;
}

export async function createTahakkuk(input: Omit<Tahakkuk, "id" | "createdAt">) {
  const tahakkuk: Tahakkuk = {
    id: createId("tk"),
    ...input,
    createdAt: new Date().toISOString(),
  };

  await upsertDocument(COLLECTIONS.tahakkuklar, tahakkuk);
  return tahakkuk;
}

export async function updateTahakkuk(id: string, input: Partial<Tahakkuk>) {
  await updateDocument<Tahakkuk>(COLLECTIONS.tahakkuklar, id, {
    ...input,
    updatedAt: new Date().toISOString(),
  });
}

export async function updateTahakkukDurum(id: string, durum: TahakkukDurum, odenenTutar?: number) {
  await updateTahakkuk(id, {
    durum,
    odenenTutar,
  });
}

export async function createOdeme(input: Omit<Odeme, "id" | "createdAt">) {
  const odeme: Odeme = {
    id: createId("od"),
    ...input,
    createdAt: new Date().toISOString(),
  };

  await upsertDocument(COLLECTIONS.odemeler, odeme);
  return odeme;
}

export async function createBankaEkstresi(input: Omit<BankaEkstresi, "id" | "createdAt">) {
  const ekstre: BankaEkstresi = {
    id: createId("be"),
    ...input,
    createdAt: new Date().toISOString(),
  };

  await upsertDocument(COLLECTIONS.bankaEkstreleri, ekstre);
  return ekstre;
}

export async function createDavet(input: Omit<Davet, "id" | "createdAt" | "durum">) {
  const davet: Davet = {
    id: createId("dav"),
    ...input,
    durum: "bekliyor",
    createdAt: new Date().toISOString(),
  };

  await upsertDocument(COLLECTIONS.davetler, davet);
  return davet;
}

export async function updateDavet(id: string, input: Partial<Davet>) {
  await updateDocument<Davet>(COLLECTIONS.davetler, id, input);
}

export async function createResmiGazeteOzeti(input: Omit<ResmiGazeteOzeti, "id" | "createdAt">) {
  const ozet: ResmiGazeteOzeti = {
    id: createId("rg"),
    ...input,
    createdAt: new Date().toISOString(),
  };

  await upsertDocument(COLLECTIONS.resmiGazeteOzetleri, ozet);
  return ozet;
}

export async function updateResmiGazeteOzeti(id: string, input: Partial<ResmiGazeteOzeti>) {
  await updateDocument<ResmiGazeteOzeti>(COLLECTIONS.resmiGazeteOzetleri, id, input);
}

export async function createGibSyncLog(input: Omit<GibSyncLog, "id">) {
  const log: GibSyncLog = {
    id: createId("gib"),
    ...input,
  };

  await upsertDocument(COLLECTIONS.gibSyncLogs, log);
  return log;
}

export async function upsertGibEntegrasyonAyari(input: Omit<GibEntegrasyonAyari, "updatedAt">) {
  const ayar: GibEntegrasyonAyari = {
    ...input,
    updatedAt: new Date().toISOString(),
  };

  await upsertDocument(COLLECTIONS.gibEntegrasyonAyarlari, ayar);
  return ayar;
}

export async function upsertLucaEntegrasyonAyari(input: Omit<LucaEntegrasyonAyari, "updatedAt">) {
  const ayar: LucaEntegrasyonAyari = {
    ...input,
    updatedAt: new Date().toISOString(),
  };

  await upsertDocument(COLLECTIONS.lucaEntegrasyonAyarlari, ayar);
  return ayar;
}

export async function upsertWhatsAppEntegrasyonAyari(input: Omit<WhatsAppEntegrasyonAyari, "updatedAt">) {
  const ayar: WhatsAppEntegrasyonAyari = {
    ...input,
    updatedAt: new Date().toISOString(),
  };

  await upsertDocument(COLLECTIONS.whatsappEntegrasyonAyarlari, ayar);
  return ayar;
}

export async function createEntegrasyonLog(input: Omit<EntegrasyonLog, "id" | "createdAt">) {
  const log: EntegrasyonLog = {
    id: createId("elog"),
    ...input,
    createdAt: new Date().toISOString(),
  };

  await upsertDocument(COLLECTIONS.entegrasyonLoglari, log);
  return log;
}

export async function updateTahsilat(id: string, input: Partial<Tahsilat>) {
  await updateDocument<Tahsilat>(COLLECTIONS.tahsilatlar, id, input);
}

export async function createTebligat(input: Omit<Tebligat, "id">) {
  const tebligat: Tebligat = {
    id: createId("teb"),
    ...input,
  };
  await upsertDocument(COLLECTIONS.tebligatlar, tebligat);
  return tebligat;
}

export async function createBeyanname(input: Omit<Beyanname, "id">) {
  const beyanname: Beyanname = {
    id: createId("bey"),
    ...input,
  };
  await upsertDocument(COLLECTIONS.beyannameler, beyanname);
  return beyanname;
}

/** GİB sync için idempotent upsert — aynı (musteriId+tur+donem) ikinci kez sync edilirse duplicate oluşmaz */
export async function upsertBeyannameFromGib(input: Omit<Beyanname, "id"> & { ofisId: string }) {
  const stableId = `bey-gib-${input.musteriId}-${input.tur}-${input.donem}`
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-");
  const beyanname: Beyanname = { id: stableId, ...input };
  await upsertDocument(COLLECTIONS.beyannameler, beyanname);
  return beyanname;
}

/** GİB sync için idempotent upsert — aynı (musteriId+donem+vergiTuru+fisNo|vadeTarihi) ikinci kez sync edilirse duplicate oluşmaz */
export async function upsertTahakkukFromGib(input: Omit<Tahakkuk, "id"> & { ofisId: string }) {
  const discriminator = input.resmiTahakkukFisNo ?? input.vadeTarihi;
  const key = `${input.musteriId}-${input.donem}-${input.vergiTuru ?? "diger"}-${discriminator}`;
  const stableId = `tk-gib-${key}`.toLowerCase().replace(/[^a-z0-9-]/g, "-");
  const tahakkuk: Tahakkuk = { id: stableId, ...input };
  await upsertDocument(COLLECTIONS.tahakkuklar, tahakkuk);
  return tahakkuk;
}

/** GİB sync için idempotent upsert — aynı (musteriId+tarih+baslik) ikinci kez sync edilirse duplicate oluşmaz */
export async function upsertTebligatFromGib(input: Omit<Tebligat, "id"> & { ofisId: string }) {
  const stableId = `teb-gib-${input.musteriId}-${input.tarih.slice(0, 10)}-${input.baslik.slice(0, 30)}`
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-");
  const tebligat: Tebligat = { id: stableId, ...input };
  await upsertDocument(COLLECTIONS.tebligatlar, tebligat);
  return tebligat;
}

export async function createBelge(input: Omit<Belge, "id" | "createdAt">) {
  const belge: Belge = {
    id: createId("doc"),
    ...input,
    createdAt: new Date().toISOString(),
  };

  await upsertDocument(COLLECTIONS.belgeler, belge);
  return belge;
}

export async function deleteBelge(id: string) {
  await deleteDocument(COLLECTIONS.belgeler, id);
}

export async function createKDV2Hesaplama(input: Omit<KDV2Hesaplama, "id" | "createdAt">) {
  const hesaplama: KDV2Hesaplama = {
    id: createId("k"),
    ...input,
    createdAt: new Date().toISOString(),
  };

  await upsertDocument(COLLECTIONS.kdv2, hesaplama);
  return hesaplama;
}

export async function updateKDV2Hesaplama(id: string, input: Partial<KDV2Hesaplama>) {
  await updateDocument<KDV2Hesaplama>(COLLECTIONS.kdv2, id, input);
}

export async function deleteKDV2Hesaplama(id: string) {
  await deleteDocument(COLLECTIONS.kdv2, id);
}

export async function createGonderimKaydi(
  input: Omit<GonderimKaydi, "id" | "createdAt" | "denemeSayisi">
) {
  const kayit: GonderimKaydi = {
    id: createId("snd"),
    ...input,
    denemeSayisi: 1,
    createdAt: new Date().toISOString(),
  };

  await upsertDocument(COLLECTIONS.gonderimler, kayit);
  return kayit;
}

export async function updateGonderimKaydi(
  id: string,
  data: Partial<GonderimKaydi>
) {
  await updateDocument<GonderimKaydi>(COLLECTIONS.gonderimler, id, data);
}

export async function createAuditLog(input: Omit<AuditLog, "id" | "createdAt">) {
  const log: AuditLog = {
    id: createId("audit"),
    ...input,
    createdAt: new Date().toISOString(),
  };

  await upsertDocument(COLLECTIONS.auditLogs, log);
  return log;
}

export async function createNot(input: Omit<Not, "id" | "createdAt">) {
  const not: Not = {
    id: createId("not"),
    ...input,
    createdAt: new Date().toISOString(),
  };
  await upsertDocument(COLLECTIONS.notlar, not);
  return not;
}

export async function deleteNot(id: string) {
  await deleteDocument(COLLECTIONS.notlar, id);
}

export async function upsertOfis(input: Ofis) {
  const ofis: Ofis = {
    ...input,
    updatedAt: new Date().toISOString(),
  };
  await upsertDocument(COLLECTIONS.ofisler, ofis);
  return ofis;
}

