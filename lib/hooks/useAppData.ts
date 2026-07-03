"use client";

import { useMemo } from "react";
import { COLLECTIONS } from "@/lib/firebase/firestore";
import { mergeDerivedVergiTahakkuklari } from "@/lib/domain/tahakkuk";
import { useCollectionData } from "@/lib/hooks/useCollectionData";
import { useDocumentData } from "@/lib/hooks/useDocumentData";
import { useAuth } from "@/lib/context/AuthContext";
import type {
  AuditLog,
  BankaEkstresi,
  BankaEntegrasyonAyari,
  Beyanname,
  Belge,
  Bildirim,
  Davet,
  EmailEntegrasyonAyari,
  EntegrasyonLog,
  GibEntegrasyonAyari,
  GibSyncLog,
  Gorev,
  GonderimKaydi,
  KDV2Hesaplama,
  LucaEntegrasyonAyari,
  Musteri,
  MukellefiyetProfili,
  Not,
  Odeme,
  Ofis,
  Rapor,
  ResmiGazeteOzeti,
  Tahakkuk,
  Tahsilat,
  Tebligat,
  User,
  WhatsAppEntegrasyonAyari,
  Yukumluluk,
  GibSozlesme,
} from "@/lib/types";

export function useAppData() {
  const { user, loading: authLoading } = useAuth();
  const enabled = !authLoading && !!user;
  const ofisId = user?.ofisId;
  const isMukellef = user?.rol === "mukellef";

  const isStaff = !isMukellef;
  const ofisDoc = useDocumentData<Ofis>(COLLECTIONS.ofisler, isStaff ? ofisId : undefined, enabled && isStaff);
  const ofisler = { data: ofisDoc.data ? [ofisDoc.data] : [], loading: ofisDoc.loading, source: ofisDoc.source };
  const kullanicilar = useCollectionData<User>(COLLECTIONS.kullanicilar, [], enabled && isStaff, ofisId);
  const davetler = useCollectionData<Davet>(COLLECTIONS.davetler, [], enabled && isStaff, ofisId);
  // Mükellef: doğrudan musteriId ile belge aboneliği — ofisId uyuşmazlığını aşar
  const musterilerCollection = useCollectionData<Musteri>(COLLECTIONS.musteriler, [], enabled && !isMukellef, ofisId);
  const mukellefMusteri = useDocumentData<Musteri>(COLLECTIONS.musteriler, isMukellef ? user?.musteriId : undefined, enabled && isMukellef);
  const musteriler = isMukellef
    ? { data: mukellefMusteri.data ? [mukellefMusteri.data] : [], loading: mukellefMusteri.loading, source: mukellefMusteri.source }
    : musterilerCollection;
  const mukellefiyetProfilleri = useCollectionData<MukellefiyetProfili>(COLLECTIONS.mukellefiyetProfilleri, [], enabled, ofisId);
  const yukumlulukler = useCollectionData<Yukumluluk>(COLLECTIONS.yukumlulukler, [], enabled, ofisId);
  const gorevler = useCollectionData<Gorev>(COLLECTIONS.gorevler, [], enabled, ofisId);
  const tebligatlar = useCollectionData<Tebligat>(COLLECTIONS.tebligatlar, [], enabled, ofisId);
  const beyannameler = useCollectionData<Beyanname>(COLLECTIONS.beyannameler, [], enabled, ofisId);
  const raporlar = useCollectionData<Rapor>(COLLECTIONS.raporlar, [], enabled, ofisId);
  const bildirimler = useCollectionData<Bildirim>(COLLECTIONS.bildirimler, [], enabled, ofisId);
  const tahsilatlar = useCollectionData<Tahsilat>(COLLECTIONS.tahsilatlar, [], enabled, ofisId);
  const tahakkuklar = useCollectionData<Tahakkuk>(COLLECTIONS.tahakkuklar, [], enabled, ofisId);
  const odemeler = useCollectionData<Odeme>(COLLECTIONS.odemeler, [], enabled, ofisId);
  const bankaEkstreleri = useCollectionData<BankaEkstresi>(COLLECTIONS.bankaEkstreleri, [], enabled, ofisId);
  const resmiGazeteOzetleri = useCollectionData<ResmiGazeteOzeti>(COLLECTIONS.resmiGazeteOzetleri, [], enabled, ofisId);
  const gibSyncLogs = useCollectionData<GibSyncLog>(COLLECTIONS.gibSyncLogs, [], enabled, ofisId);
  const kdv2 = useCollectionData<KDV2Hesaplama>(COLLECTIONS.kdv2, [], enabled, ofisId);
  const gonderimler = useCollectionData<GonderimKaydi>(COLLECTIONS.gonderimler, [], enabled, ofisId);
  const belgeler = useCollectionData<Belge>(COLLECTIONS.belgeler, [], enabled, ofisId);
  const auditLogs = useCollectionData<AuditLog>(COLLECTIONS.auditLogs, [], enabled && isStaff, ofisId);
  const gibEntegrasyonAyarlari = useCollectionData<GibEntegrasyonAyari>(COLLECTIONS.gibEntegrasyonAyarlari, [], enabled && isStaff, ofisId);
  const lucaEntegrasyonAyarlari = useCollectionData<LucaEntegrasyonAyari>(COLLECTIONS.lucaEntegrasyonAyarlari, [], enabled && isStaff, ofisId);
  const whatsappEntegrasyonAyarlari = useCollectionData<WhatsAppEntegrasyonAyari>(COLLECTIONS.whatsappEntegrasyonAyarlari, [], enabled && isStaff, ofisId);
  const bankaEntegrasyonAyarlari = useCollectionData<BankaEntegrasyonAyari>(COLLECTIONS.bankaEntegrasyonAyarlari, [], enabled && isStaff, ofisId);
  const emailEntegrasyonAyarlari = useCollectionData<EmailEntegrasyonAyari>(COLLECTIONS.emailEntegrasyonAyarlari, [], enabled && isStaff, ofisId);
  const entegrasyonLoglari = useCollectionData<EntegrasyonLog>(COLLECTIONS.entegrasyonLoglari, [], enabled && isStaff, ofisId);
  const notlar = useCollectionData<Not>(COLLECTIONS.notlar, [], enabled && isStaff, ofisId);
  const gibSozlesmeleri = useCollectionData<GibSozlesme>(COLLECTIONS.gibSozlesmeleri, [], enabled && isStaff, ofisId);

  const normalizedBeyannameler = beyannameler.data;
  const normalizedTahakkuklar = useMemo(
    () => mergeDerivedVergiTahakkuklari(tahakkuklar.data, normalizedBeyannameler),
    [tahakkuklar.data, normalizedBeyannameler]
  );

  return {
    ofisler: ofisler.data,
    musteriler: musteriler.data,
    mukellefiyetProfilleri: mukellefiyetProfilleri.data,
    yukumlulukler: yukumlulukler.data,
    gorevler: gorevler.data,
    tebligatlar: tebligatlar.data,
    beyannameler: normalizedBeyannameler,
    raporlar: raporlar.data,
    bildirimler: bildirimler.data,
    tahsilatlar: tahsilatlar.data,
    tahakkuklar: normalizedTahakkuklar,
    odemeler: odemeler.data,
    davetler: davetler.data,
    bankaEkstreleri: bankaEkstreleri.data,
    resmiGazeteOzetleri: resmiGazeteOzetleri.data,
    gibSyncLogs: gibSyncLogs.data,
    kdv2: kdv2.data,
    kullanicilar: kullanicilar.data,
    gonderimler: gonderimler.data,
    belgeler: belgeler.data,
    auditLogs: auditLogs.data,
    gibEntegrasyonAyarlari: gibEntegrasyonAyarlari.data,
    lucaEntegrasyonAyarlari: lucaEntegrasyonAyarlari.data,
    whatsappEntegrasyonAyarlari: whatsappEntegrasyonAyarlari.data,
    bankaEntegrasyonAyarlari: bankaEntegrasyonAyarlari.data,
    emailEntegrasyonAyarlari: emailEntegrasyonAyarlari.data,
    entegrasyonLoglari: entegrasyonLoglari.data,
    notlar: notlar.data,
    gibSozlesmeleri: gibSozlesmeleri.data,
    source: musteriler.source,
    loading:
      musteriler.loading ||
      mukellefiyetProfilleri.loading ||
      yukumlulukler.loading ||
      ofisler.loading ||
      gorevler.loading ||
      tebligatlar.loading ||
      beyannameler.loading ||
      raporlar.loading ||
      bildirimler.loading ||
      tahsilatlar.loading ||
      tahakkuklar.loading ||
      odemeler.loading ||
      davetler.loading ||
      bankaEkstreleri.loading ||
      resmiGazeteOzetleri.loading ||
      gibSyncLogs.loading ||
      kdv2.loading ||
      kullanicilar.loading ||
      gonderimler.loading ||
      belgeler.loading ||
      auditLogs.loading ||
      gibEntegrasyonAyarlari.loading ||
      lucaEntegrasyonAyarlari.loading ||
      whatsappEntegrasyonAyarlari.loading ||
      bankaEntegrasyonAyarlari.loading ||
      emailEntegrasyonAyarlari.loading ||
      entegrasyonLoglari.loading,
  };
}
