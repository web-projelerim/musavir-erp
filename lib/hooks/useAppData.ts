"use client";

import { useMemo } from "react";
import { COLLECTIONS } from "@/lib/firebase/firestore";
import { mergeDerivedVergiTahakkuklari } from "@/lib/domain/tahakkuk";
import { useCollectionData } from "@/lib/hooks/useCollectionData";
import { isFirebaseConfigured } from "@/lib/firebase/client";
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
} from "@/lib/types";

export function useAppData() {
  const { user, loading: authLoading } = useAuth();
  const enabled = !isFirebaseConfigured || (!authLoading && !!user);
  const ofisId = user?.ofisId;

  const ofisler = useCollectionData<Ofis>(COLLECTIONS.ofisler, [], enabled);
  const kullanicilar = useCollectionData<User>(COLLECTIONS.kullanicilar, [], enabled, ofisId);
  const davetler = useCollectionData<Davet>(COLLECTIONS.davetler, [], enabled, ofisId);
  const musteriler = useCollectionData<Musteri>(COLLECTIONS.musteriler, [], enabled, ofisId);
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
  const auditLogs = useCollectionData<AuditLog>(COLLECTIONS.auditLogs, [], enabled, ofisId);
  const gibEntegrasyonAyarlari = useCollectionData<GibEntegrasyonAyari>(COLLECTIONS.gibEntegrasyonAyarlari, [], enabled, ofisId);
  const lucaEntegrasyonAyarlari = useCollectionData<LucaEntegrasyonAyari>(COLLECTIONS.lucaEntegrasyonAyarlari, [], enabled, ofisId);
  const whatsappEntegrasyonAyarlari = useCollectionData<WhatsAppEntegrasyonAyari>(COLLECTIONS.whatsappEntegrasyonAyarlari, [], enabled, ofisId);
  const bankaEntegrasyonAyarlari = useCollectionData<BankaEntegrasyonAyari>(COLLECTIONS.bankaEntegrasyonAyarlari, [], enabled, ofisId);
  const emailEntegrasyonAyarlari = useCollectionData<EmailEntegrasyonAyari>(COLLECTIONS.emailEntegrasyonAyarlari, [], enabled, ofisId);
  const entegrasyonLoglari = useCollectionData<EntegrasyonLog>(COLLECTIONS.entegrasyonLoglari, [], enabled, ofisId);
  const notlar = useCollectionData<Not>(COLLECTIONS.notlar, [], enabled, ofisId);

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
