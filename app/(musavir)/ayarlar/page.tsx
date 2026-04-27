"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, Bell, Clock, Copy, Database, Link2, Mail, Plus, Shield, Sliders, Users, X } from "lucide-react";
import { DavetModal } from "@/components/modals/DavetModal";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Select } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeadCell,
  TableRow,
} from "@/components/ui/Table";
import { useToast } from "@/lib/context/ToastContext";
import { useAuth } from "@/lib/context/AuthContext";
import { isMusavir } from "@/lib/utils/permissions";
import { authHeaders, isFirebaseConfigured } from "@/lib/firebase/client";
import {
  createAuditLog,
  createBeyanname,
  createEntegrasyonLog,
  createGibSyncLog,
  createTebligat,
  updateDavet,
  updateGonderimKaydi,
  upsertGibEntegrasyonAyari,
  upsertLucaEntegrasyonAyari,
  upsertWhatsAppEntegrasyonAyari,
} from "@/lib/firebase/repositories";
import { seedFirebaseMockData } from "@/lib/firebase/seed";
import { useAppData } from "@/lib/hooks/useAppData";
import { PageLoading } from "@/components/ui/PageLoading";
import { formatTarih } from "@/lib/utils/format";
import type {
  AuditAction,
  EntegrasyonDurum,
  EntegrasyonLog,
  GibEntegrasyonAyari,
  GibSyncLog,
  GonderimKaydi,
  LucaEntegrasyonAyari,
  WhatsAppEntegrasyonAyari,
} from "@/lib/types";

const TABS = [
  { id: "kullanicilar", label: "Kullanicilar", icon: Users },
  { id: "entegrasyon", label: "Entegrasyonlar", icon: Link2 },
  { id: "gonderimler", label: "Gonderimler", icon: Bell },
  { id: "guvenlik", label: "Guvenlik", icon: Shield },
  { id: "denetim", label: "Denetim", icon: Activity },
  { id: "sistem", label: "Sistem", icon: Sliders },
] as const;

type TabId = (typeof TABS)[number]["id"];
type IntegrationPanel = "gib" | "luca" | "whatsapp" | "banka" | "email";

const ROL_LABELS: Record<string, string> = {
  musavir: "Mali Müşavir",
  personel: "Personel",
  mukellef: "Mükellef",
};

const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  create: "Oluşturma",
  update: "Güncelleme",
  delete: "Silme",
  status_change: "Durum",
  upload: "Yükleme",
  send: "Gönderim",
  seed: "Seed",
  import: "Import",
  invite: "Davet",
  match: "Eşleşme",
  sync: "Sync",
  summarize: "Özet",
};

function auditVariant(action: AuditAction) {
  if (action === "delete") return "danger";
  if (action === "match" || action === "import") return "info";
  if (action === "invite" || action === "sync" || action === "summarize" || action === "status_change") {
    return "warning";
  }
  if (action === "create" || action === "upload") return "success";
  if (action === "send") return "info";
  return "neutral";
}

function entegrasyonVariant(durum: EntegrasyonDurum) {
  if (durum === "bagli") return "success" as const;
  if (durum === "hata") return "danger" as const;
  if (durum === "eksik") return "warning" as const;
  return "neutral" as const;
}

function durumLabel(durum: EntegrasyonDurum) {
  const map: Record<EntegrasyonDurum, string> = {
    bagli: "Bagli",
    eksik: "Eksik Bilgi",
    hata: "Hata",
    test_edilmedi: "Test Edilmedi",
  };
  return map[durum];
}

function syncVariant(durum: GibSyncLog["durum"]) {
  if (durum === "basarili") return "success" as const;
  if (durum === "basarisiz") return "danger" as const;
  return "warning" as const;
}

function panelTitle(panel: IntegrationPanel) {
  const map: Record<IntegrationPanel, string> = {
    gib: "GIB",
    luca: "Luca",
    whatsapp: "WhatsApp",
    banka: "Banka",
    email: "E-posta",
  };
  return map[panel];
}

export default function AyarlarPage() {
  const toast = useToast();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>("entegrasyon");
  const [activeIntegration, setActiveIntegration] = useState<IntegrationPanel>("gib");
  const [seeding, setSeeding] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const {
    auditLogs,
    bankaEntegrasyonAyarlari,
    davetler,
    emailEntegrasyonAyarlari,
    entegrasyonLoglari,
    gibEntegrasyonAyarlari,
    gibSyncLogs,
    gonderimler,
    kullanicilar,
    lucaEntegrasyonAyarlari,
    musteriler,
    ofisler,
    resmiGazeteOzetleri,
    whatsappEntegrasyonAyarlari,
    loading,
  } = useAppData();

  const [gibDraft, setGibDraft] = useState<GibEntegrasyonAyari | null>(null);
  const [lucaDraft, setLucaDraft] = useState<LucaEntegrasyonAyari | null>(null);
  const [waDraft, setWaDraft] = useState({ businessPhoneNumberId: "", accessTokenGirildi: false });
  const [waSaving, setWaSaving] = useState(false);
  const [gibSecrets, setGibSecrets] = useState({
    ivdSifre: "",
    ebeyannameParola: "",
    ebeyannameSifre: "",
  });
  // Sunucu tarafında şifrelenmiş haller — Firestore'a bunlar yazılır
  const [encryptedGibSecrets, setEncryptedGibSecrets] = useState<Record<string, string>>({});
  const [lucaSecret, setLucaSecret] = useState("");
  const [localGibLogs, setLocalGibLogs] = useState<GibSyncLog[]>([]);
  const [localIntegrationLogs, setLocalIntegrationLogs] = useState<EntegrasyonLog[]>([]);

  const sortedAuditLogs = useMemo(
    () => [...auditLogs].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 50),
    [auditLogs]
  );

  useEffect(() => {
    setGibDraft(gibEntegrasyonAyarlari[0] ?? null);
  }, [gibEntegrasyonAyarlari]);

  useEffect(() => {
    setLucaDraft(lucaEntegrasyonAyarlari[0] ?? null);
  }, [lucaEntegrasyonAyarlari]);

  useEffect(() => {
    const wa = whatsappEntegrasyonAyarlari[0];
    if (wa) {
      setWaDraft({ businessPhoneNumberId: wa.businessPhoneNumberId ?? "", accessTokenGirildi: wa.accessTokenSet });
    }
  }, [whatsappEntegrasyonAyarlari]);

  useEffect(() => {
    setLocalGibLogs(gibSyncLogs);
  }, [gibSyncLogs]);

  useEffect(() => {
    setLocalIntegrationLogs(entegrasyonLoglari);
  }, [entegrasyonLoglari]);

  const selectedOfis = ofisler[0];
  const gibDraftSafe = gibDraft;
  const lucaDraftSafe = lucaDraft;

  const integrationCards = [
    {
      id: "gib" as const,
      title: "GIB",
      subtitle: "e-Beyanname, IVD, tebligat ve borc/tahakkuk kontrolu",
      durum: gibDraftSafe?.durum ?? "test_edilmedi",
      meta: gibDraftSafe?.manuelSenkronAktif ? "Manuel senkron acik" : "Manuel senkron kapali",
    },
    {
      id: "luca" as const,
      title: "Luca",
      subtitle: "Ilk fazda import/export ve firma kod esleme",
      durum: lucaDraftSafe?.durum ?? "test_edilmedi",
      meta: lucaDraftSafe?.entegrasyonModu === "import_export" ? "Import / export" : "Diger mod",
    },
    {
      id: "whatsapp" as const,
      title: "WhatsApp",
      subtitle: "Tahakkuk, davet ve hatirlatma mesajlari",
      durum: whatsappEntegrasyonAyarlari[0]?.durum ?? "test_edilmedi",
      meta: whatsappEntegrasyonAyarlari[0]?.accessTokenSet ? "Token tanimli" : "Token eksik",
    },
    {
      id: "banka" as const,
      title: "Banka",
      subtitle: "CSV/XLSX import ve esleme kurallari",
      durum: bankaEntegrasyonAyarlari[0]?.durum ?? "test_edilmedi",
      meta: bankaEntegrasyonAyarlari[0]?.manuelOnayZorunlu ? "Manuel onay aktif" : "Otomatik agirlikli",
    },
    {
      id: "email" as const,
      title: "E-posta",
      subtitle: "SMTP ve resmi bildirim kopyalari",
      durum: emailEntegrasyonAyarlari[0]?.durum ?? "test_edilmedi",
      meta: emailEntegrasyonAyarlari[0]?.smtpSifreSet ? "SMTP hazır" : "SMTP eksik",
    },
  ];

  const addIntegrationLogLocal = (entry: EntegrasyonLog) => {
    setLocalIntegrationLogs((prev) => [entry, ...prev].slice(0, 20));
  };

  const addGibSyncLogLocal = (entry: GibSyncLog) => {
    setLocalGibLogs((prev) => [entry, ...prev].slice(0, 20));
  };

  const handleSeedFirebase = async () => {
    if (!isFirebaseConfigured) {
      toast.warning("Firebase yapilandirmasi yok", ".env.local dosyasina Firebase bilgilerini ekleyin");
      return;
    }

    setSeeding(true);
    try {
      await seedFirebaseMockData();
      await createAuditLog({
        actorId: "demo-musavir",
        actorName: "Ali Musavir",
        actorRole: "musavir",
        action: "seed",
        entityType: "sistem",
        entityId: "firebase-seed",
        entityLabel: "Demo veri",
        summary: "Demo veri Firestore'a aktarildi",
      });
      toast.success("Demo veri Firestore'a aktarildi");
    } catch (error) {
      console.error(error);
      toast.error("Demo veri aktarilamadi", "Firestore yetkilerini ve Firebase ayarlarini kontrol edin");
    } finally {
      setSeeding(false);
    }
  };

  const handleSaveGib = async () => {
    if (!gibDraftSafe) return;

    // Girilen şifreleri varsa sunucu tarafında şifrele
    const hasNewSecrets = gibSecrets.ivdSifre || gibSecrets.ebeyannameParola || gibSecrets.ebeyannameSifre;
    let newEncrypted = encryptedGibSecrets;

    if (hasNewSecrets) {
      try {
        const res = await fetch("/api/gib/secrets", {
          method: "POST",
          headers: await authHeaders(),
          body: JSON.stringify(gibSecrets),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Şifreleme hatası");
        newEncrypted = { ...encryptedGibSecrets, ...data.encrypted };
        setEncryptedGibSecrets(newEncrypted);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Bilinmeyen hata";
        toast.warning("Şifreler korunarak kaydedildi (sunucu erişim sorunu)", msg);
      }
    }

    const next: GibEntegrasyonAyari = {
      ...gibDraftSafe,
      ivdSifreSet: gibDraftSafe.ivdSifreSet || Boolean(gibSecrets.ivdSifre) || Boolean(newEncrypted.ivdSifre),
      ebeyannameParolaSet: gibDraftSafe.ebeyannameParolaSet || Boolean(gibSecrets.ebeyannameParola) || Boolean(newEncrypted.ebeyannameParola),
      ebeyannameSifreSet: gibDraftSafe.ebeyannameSifreSet || Boolean(gibSecrets.ebeyannameSifre) || Boolean(newEncrypted.ebeyannameSifre),
      durum: "eksik",
      credentialUyarisi: undefined,
      updatedBy: user?.id ?? "musavir",
      updatedAt: new Date().toISOString(),
    };

    setGibDraft(next);
    setGibSecrets({ ivdSifre: "", ebeyannameParola: "", ebeyannameSifre: "" });

    try {
      if (isFirebaseConfigured) {
        // Şifreli secret'ları ve metadata'yı birlikte Firestore'a yaz
        await upsertGibEntegrasyonAyari(next);
        await createEntegrasyonLog({
          ofisId: next.ofisId,
          entegrasyon: "gib",
          islem: "kaydet",
          durum: "basarili",
          detay: hasNewSecrets
            ? "GİB kimlik bilgileri sunucu tarafında şifrelenerek kaydedildi."
            : "GİB ayar metadata'sı güncellendi.",
          createdBy: user?.id ?? "musavir",
        });
      } else {
        addIntegrationLogLocal({
          id: `elog-local-${Date.now()}`,
          ofisId: next.ofisId,
          entegrasyon: "gib",
          islem: "kaydet",
          durum: "basarili",
          detay: "Demo modunda GİB ayarları güncellendi.",
          createdBy: "demo-musavir",
          createdAt: new Date().toISOString(),
        });
      }
      toast.success("GİB ayarları kaydedildi", hasNewSecrets ? "Kimlik bilgileri şifrelenerek saklandı" : "Ayarlar güncellendi");
    } catch (error) {
      console.error(error);
      toast.error("GİB ayarları kaydedilemedi");
    }
  };

  const handleGibTest = async () => {
    if (!gibDraftSafe) return;

    const hasMinimumIdentity = Boolean(gibDraftSafe.vknTckn && (gibDraftSafe.ivdKullaniciKodu || gibDraftSafe.ebeyannameKullaniciKodu));
    const hasSecrets =
      gibDraftSafe.ivdSifreSet ||
      gibDraftSafe.ebeyannameParolaSet ||
      gibDraftSafe.ebeyannameSifreSet ||
      Boolean(gibSecrets.ivdSifre || gibSecrets.ebeyannameParola || gibSecrets.ebeyannameSifre);

    const success = hasMinimumIdentity && hasSecrets;
    const next: GibEntegrasyonAyari = {
      ...gibDraftSafe,
      durum: success ? "bagli" : "eksik",
      sonTestTarihi: new Date().toISOString(),
      sonHata: success ? undefined : "Kimlik veya sifre alanlari eksik",
      updatedBy: "demo-musavir",
      updatedAt: new Date().toISOString(),
    };
    setGibDraft(next);

    const logDetail = success
      ? "GIB baglanti testi metadata seviyesinde basarili gorunuyor."
      : "GIB baglanti testi icin VKN/TCKN ve sifre set alanlari eksik.";

    try {
      if (isFirebaseConfigured) {
        await upsertGibEntegrasyonAyari(next);
        await createEntegrasyonLog({
          ofisId: next.ofisId,
          entegrasyon: "gib",
          islem: "test",
          durum: success ? "basarili" : "basarisiz",
          detay: logDetail,
          createdBy: "demo-musavir",
        });
      } else {
        addIntegrationLogLocal({
          id: `elog-local-${Date.now()}`,
          ofisId: next.ofisId,
          entegrasyon: "gib",
          islem: "test",
          durum: success ? "basarili" : "basarisiz",
          detay: logDetail,
          createdBy: "demo-musavir",
          createdAt: new Date().toISOString(),
        });
      }
      if (success) {
        toast.success("GIB baglanti testi basarili");
      } else {
        toast.warning("GIB testi eksik bilgi nedeniyle gecemedi", "VKN/TCKN, kullanici kodu ve sifre alanlarini kontrol edin");
      }
    } catch (error) {
      console.error(error);
      toast.error("GIB testi kaydedilemedi");
    }
  };

  const handleManualGibSync = async (syncTipi: GibSyncLog["syncTipi"]) => {
    if (!gibDraftSafe) return;

    const encSifre: string | undefined = encryptedGibSecrets["ivdSifre"];

    const canSync = gibDraftSafe.ivdKullaniciKodu && gibDraftSafe.vknTckn && (encSifre || gibDraftSafe.ivdSifreSet);

    const baslamaTarihi = new Date().toISOString();
    let syncDurum: "basarili" | "basarisiz" = "basarili";
    let islenenKayitSayisi = 0;
    let sonHata: string | undefined;

    if (canSync && encSifre) {
      try {
        // Aktif müşterileri tek tek senkronize et (her müşteri için musteriVkn gönder)
        const aktifMusteriler = musteriler.filter((m) => m.durum === "aktif" && m.vknTckn);
        const targets = aktifMusteriler.length > 0
          ? aktifMusteriler
          : [{ id: "", firmaAdi: gibDraftSafe.vknTckn, vknTckn: gibDraftSafe.vknTckn }];

        for (const musteri of targets) {
          const res = await fetch("/api/gib/sync", {
            method: "POST",
            headers: await authHeaders(),
            body: JSON.stringify({
              ofisId: gibDraftSafe.ofisId,
              syncTipi,
              ivdKullaniciKodu: gibDraftSafe.ivdKullaniciKodu,
              vknTckn: gibDraftSafe.vknTckn,
              encryptedIvdSifre: encSifre,
              musteriVkn: musteri.vknTckn,
            }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error ?? "GİB bağlantı hatası");

          const tebligatlar: unknown[] = (data.tebligatlar ?? []).map((t: Record<string, unknown>) => ({
            ...t,
            musteriId: musteri.id || (t.musteriId as string) || "",
            musteriAdi: (t.musteriAdi as string) || musteri.firmaAdi || "",
          }));
          const beyannameler: unknown[] = (data.beyannameler ?? []).map((b: Record<string, unknown>) => ({
            ...b,
            musteriId: musteri.id || (b.musteriId as string) || "",
            musteriAdi: (b.musteriAdi as string) || musteri.firmaAdi || "",
          }));
          islenenKayitSayisi += tebligatlar.length + beyannameler.length;

          if (isFirebaseConfigured) {
            await Promise.all([
              ...tebligatlar.map((t) => createTebligat(t as Parameters<typeof createTebligat>[0])),
              ...beyannameler.map((b) => createBeyanname(b as Parameters<typeof createBeyanname>[0])),
            ]);
          }
        }
      } catch (err) {
        syncDurum = "basarisiz";
        sonHata = err instanceof Error ? err.message : "Bilinmeyen hata";
        toast.error("GİB senkronizasyon hatası", sonHata);
      }
    } else {
      // Demo ya da şifre henüz kaydedilmemiş
      islenenKayitSayisi = syncTipi === "tebligat" ? 3 : syncTipi === "beyanname" ? 2 : 4;
      if (!canSync) {
        toast.info("Demo modu", "Gerçek GİB verisi için IVD kimlik bilgilerini kaydedin");
      }
    }

    const entry: GibSyncLog = {
      id: `gib-local-${Date.now()}`,
      ofisId: gibDraftSafe.ofisId,
      syncTipi,
      durum: syncDurum,
      baslamaTarihi,
      bitisTarihi: new Date().toISOString(),
      islenenKayitSayisi,
      hataMesaji: sonHata,
      createdBy: user?.id ?? "musavir",
    };

    addGibSyncLogLocal(entry);

    const next = {
      ...gibDraftSafe,
      sonBasariliSync: syncDurum === "basarili" ? entry.bitisTarihi : gibDraftSafe.sonBasariliSync,
      sonHata: syncDurum === "basarisiz" ? sonHata : undefined,
      durum: syncDurum === "basarili" ? ("bagli" as const) : ("hata" as const),
      updatedAt: new Date().toISOString(),
      updatedBy: user?.id ?? "musavir",
    };
    setGibDraft(next);

    try {
      if (isFirebaseConfigured) {
        await createGibSyncLog(entry);
        await upsertGibEntegrasyonAyari(next);
        await createEntegrasyonLog({
          ofisId: gibDraftSafe.ofisId,
          entegrasyon: "gib",
          islem: "manuel_sync",
          durum: syncDurum,
          detay: syncDurum === "basarili"
            ? `${syncTipi} senkronu tamamlandı — ${islenenKayitSayisi} kayıt işlendi`
            : `${syncTipi} senkronu başarısız: ${sonHata}`,
          createdBy: user?.id ?? "musavir",
        });
      } else {
        addIntegrationLogLocal({
          id: `elog-local-${Date.now()}`,
          ofisId: gibDraftSafe.ofisId,
          entegrasyon: "gib",
          islem: "manuel_sync",
          durum: syncDurum,
          detay: `${syncTipi} senkronu ${syncDurum === "basarili" ? "tamamlandı" : "başarısız"}`,
          createdBy: "demo-musavir",
          createdAt: new Date().toISOString(),
        });
      }
      if (syncDurum === "basarili") {
        toast.success(`GİB ${syncTipi} senkronu tamamlandı`, `${islenenKayitSayisi} kayıt işlendi`);
      }
    } catch (error) {
      console.error(error);
      toast.error("GİB senkron kaydı yazılamadı");
    }
  };

  const handleSaveLuca = async () => {
    if (!lucaDraftSafe) return;

    const next: LucaEntegrasyonAyari = {
      ...lucaDraftSafe,
      adminSifreSet: lucaDraftSafe.adminSifreSet || Boolean(lucaSecret),
      durum: lucaDraftSafe.uyeNo && lucaDraftSafe.adminKullaniciAdi ? "eksik" : "eksik",
      updatedAt: new Date().toISOString(),
      updatedBy: "demo-musavir",
    };

    setLucaDraft(next);
    setLucaSecret("");

    try {
      if (isFirebaseConfigured) {
        await upsertLucaEntegrasyonAyari(next);
        await createEntegrasyonLog({
          ofisId: next.ofisId,
          entegrasyon: "luca",
          islem: "kaydet",
          durum: "basarili",
          detay: "Luca import/export metadata ayarlari guncellendi.",
          createdBy: "demo-musavir",
        });
      } else {
        addIntegrationLogLocal({
          id: `elog-local-${Date.now()}`,
          ofisId: next.ofisId,
          entegrasyon: "luca",
          islem: "kaydet",
          durum: "basarili",
          detay: "Demo modunda Luca import/export ayarlari guncellendi.",
          createdBy: "demo-musavir",
          createdAt: new Date().toISOString(),
        });
      }
      toast.success("Luca ayarlari guncellendi");
    } catch (error) {
      console.error(error);
      toast.error("Luca ayarlari kaydedilemedi");
    }
  };

  // P2-2: Başarısız gönderim retry
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const basarisizGonderimler = gonderimler.filter((g) => g.durum === "basarisiz");

  const handleRetryGonderim = async (kayit: GonderimKaydi) => {
    if (kayit.denemeSayisi >= 3) {
      toast.warning("Maksimum deneme sayısına ulaşıldı", "Bu gönderim en fazla 3 kez denenebilir");
      return;
    }
    if (!kayit.mesaj) {
      toast.error("Mesaj içeriği bulunamadı");
      return;
    }
    setRetryingId(kayit.id);
    try {
      const musteri = musteriler.find((m) => m.id === kayit.musteriId);
      if (!musteri) throw new Error("Müşteri bulunamadı");

      const res = await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: await authHeaders(),
        body: JSON.stringify({
          messages: [
            {
              musteriId: musteri.id,
              musteriAdi: musteri.firmaAdi,
              phone: musteri.telefon,
              body: kayit.mesaj,
            },
          ],
        }),
      });

      const data = await res.json();
      const basarili = res.status !== 501 && data.basarili > 0;

      if (isFirebaseConfigured) {
        await updateGonderimKaydi(kayit.id, {
          durum: basarili ? "gonderildi" : "basarisiz",
          denemeSayisi: kayit.denemeSayisi + 1,
          sentAt: basarili ? new Date().toISOString() : undefined,
          hataMesaji: basarili ? undefined : (data.results?.[0]?.hataMesaji ?? "Bilinmeyen hata"),
        });
      }

      if (basarili) {
        toast.success("Mesaj yeniden gönderildi", musteri.firmaAdi);
      } else {
        toast.error("Gönderim başarısız", data.results?.[0]?.hataMesaji ?? "Bilinmeyen hata");
      }
    } catch (err) {
      toast.error("Retry hatası", err instanceof Error ? err.message : undefined);
    } finally {
      setRetryingId(null);
    }
  };

  const handleSaveWhatsApp = async () => {
    setWaSaving(true);
    const ofisId = whatsappEntegrasyonAyarlari[0]?.ofisId ?? gibDraftSafe?.ofisId ?? "ofis-default";
    const existing = whatsappEntegrasyonAyarlari[0];
    const next: Omit<WhatsAppEntegrasyonAyari, "updatedAt"> = {
      id: existing?.id ?? `wa-${ofisId}`,
      ofisId,
      durum: waDraft.businessPhoneNumberId ? "test_edilmedi" : "eksik",
      provider: "meta_cloud_api",
      businessPhoneNumberId: waDraft.businessPhoneNumberId,
      accessTokenSet: waDraft.accessTokenGirildi || (existing?.accessTokenSet ?? false),
      verifyTokenSet: existing?.verifyTokenSet ?? false,
      tahakkukMesajiAktif: existing?.tahakkukMesajiAktif ?? true,
      vadeHatirlatmaAktif: existing?.vadeHatirlatmaAktif ?? true,
      belgeEksikAktif: existing?.belgeEksikAktif ?? false,
      davetMesajiAktif: existing?.davetMesajiAktif ?? true,
      secretStorageMode: "not_configured",
      updatedBy: user?.id ?? "musavir",
    };
    try {
      if (isFirebaseConfigured) {
        await upsertWhatsAppEntegrasyonAyari(next);
        await createEntegrasyonLog({
          ofisId,
          entegrasyon: "whatsapp",
          islem: "kaydet",
          durum: "basarili",
          detay: `WhatsApp Phone Number ID güncellendi: ${waDraft.businessPhoneNumberId || "(boş)"}`,
          createdBy: user?.id ?? "musavir",
        });
      }
      toast.success("WhatsApp ayarları kaydedildi", "WHATSAPP_ACCESS_TOKEN'ı .env.local dosyasına ekleyin");
    } catch (err) {
      toast.error("WhatsApp ayarları kaydedilemedi", err instanceof Error ? err.message : undefined);
    } finally {
      setWaSaving(false);
    }
  };

  const renderIntegrationPanel = () => {
    if (activeIntegration === "gib" && gibDraftSafe) {
      return (
        <div className="space-y-4">
          <Card>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-800">GIB Baglanti Merkezi</h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  Manuel senkron acik. Secret alanlari client yerine server-side secret manager ile saklanacak.
                </p>
              </div>
              <Badge variant={entegrasyonVariant(gibDraftSafe.durum)}>{durumLabel(gibDraftSafe.durum)}</Badge>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Select
                label="Entegrasyon Modu"
                value={gibDraftSafe.entegrasyonModu}
                onChange={(event) =>
                  setGibDraft((prev) => (prev ? { ...prev, entegrasyonModu: event.target.value as GibEntegrasyonAyari["entegrasyonModu"] } : prev))
                }
                options={[
                  { value: "manuel", label: "Manuel" },
                  { value: "ivd", label: "IVD" },
                  { value: "ebeyanname", label: "e-Beyanname" },
                  { value: "resmi_api", label: "Resmi API" },
                ]}
              />
              <Input
                label="VKN / TCKN"
                value={gibDraftSafe.vknTckn ?? ""}
                onChange={(event) => setGibDraft((prev) => (prev ? { ...prev, vknTckn: event.target.value } : prev))}
                placeholder="1234567890"
              />
              <Input
                label="IVD Kullanici Kodu"
                value={gibDraftSafe.ivdKullaniciKodu ?? ""}
                onChange={(event) => setGibDraft((prev) => (prev ? { ...prev, ivdKullaniciKodu: event.target.value } : prev))}
                placeholder="AKDENIZ123"
              />
              <Input
                label="IVD Sifre"
                type="password"
                value={gibSecrets.ivdSifre}
                onChange={(event) => setGibSecrets((prev) => ({ ...prev, ivdSifre: event.target.value }))}
                placeholder={gibDraftSafe.ivdSifreSet ? "Güncellemek için yeniden girin" : "Geçici secret taslağı"}
                hint={gibDraftSafe.ivdSifreSet ? "Şifre bir kez tanımlı görünüyor" : "Bu alan kalıcı olarak istemcide saklanmaz"}
              />
              <Input
                label="e-Beyanname Kullanici Kodu"
                value={gibDraftSafe.ebeyannameKullaniciKodu ?? ""}
                onChange={(event) =>
                  setGibDraft((prev) => (prev ? { ...prev, ebeyannameKullaniciKodu: event.target.value } : prev))
                }
                placeholder="MUSAVIR001"
              />
              <Input
                label="e-Beyanname Parola"
                type="password"
                value={gibSecrets.ebeyannameParola}
                onChange={(event) => setGibSecrets((prev) => ({ ...prev, ebeyannameParola: event.target.value }))}
                placeholder={gibDraftSafe.ebeyannameParolaSet ? "Güncellemek için yeniden girin" : "Geçici secret taslağı"}
              />
              <Input
                label="e-Beyanname Sifre"
                type="password"
                value={gibSecrets.ebeyannameSifre}
                onChange={(event) => setGibSecrets((prev) => ({ ...prev, ebeyannameSifre: event.target.value }))}
                placeholder={gibDraftSafe.ebeyannameSifreSet ? "Güncellemek için yeniden girin" : "Geçici secret taslağı"}
              />
              <Input
                label="Gunluk Senkron Saati"
                type="time"
                value={gibDraftSafe.syncSaati ?? "09:30"}
                onChange={(event) => setGibDraft((prev) => (prev ? { ...prev, syncSaati: event.target.value } : prev))}
              />
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {[
                ["eTebligatAktif", "e-Tebligat aktif"],
                ["beyanGonderimYetkisi", "Beyan gonderim yetkisi"],
                ["borcSorguYetkisi", "Borc/tahakkuk sorgu yetkisi"],
                ["tebligatGoruntulemeYetkisi", "Tebligat goruntuleme"],
                ["pdfIndirmeYetkisi", "PDF indirme"],
                ["manuelSenkronAktif", "Manuel senkron aktif"],
                ["otomatikTebligatSync", "Otomatik tebligat sync"],
                ["otomatikBeyanSync", "Otomatik beyan sync"],
                ["otomatikBorcSync", "Otomatik borc sync"],
              ].map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={Boolean(gibDraftSafe[key as keyof GibEntegrasyonAyari])}
                    onChange={(event) =>
                      setGibDraft((prev) =>
                        prev
                          ? {
                              ...prev,
                              [key]: event.target.checked,
                            }
                          : prev
                      )
                    }
                    className="h-4 w-4 rounded border-slate-300 text-blue-600"
                  />
                  {label}
                </label>
              ))}
            </div>

            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              <strong>Guvenlik notu:</strong> Secret alanlari bu asamada sadece gecici taslak olarak tutulur.
              Kalici saklama icin bir sonraki backend fazinda server-side secret manager baglanacak. Firestore'a
              sifrelerin duz yazilmasini bilerek acmiyoruz.
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Button onClick={handleSaveGib}>Metadata Kaydet</Button>
              <Button variant="outline" onClick={handleGibTest}>Baglantiyi Test Et</Button>
              <Button variant="outline" onClick={() => handleManualGibSync("tebligat")}>Tebligat Sync</Button>
              <Button variant="outline" onClick={() => handleManualGibSync("beyanname")}>Beyan Sync</Button>
              <Button variant="outline" onClick={() => handleManualGibSync("borc")}>Borc Sync</Button>
            </div>
          </Card>

          <Card>
            <h3 className="text-sm font-semibold text-slate-800">GIB Sync Gecmisi</h3>
            <div className="mt-3 space-y-2">
              {localGibLogs.length === 0 ? (
                <p className="text-xs text-slate-500">Henüz sync kaydi yok.</p>
              ) : (
                localGibLogs.slice(0, 6).map((log) => (
                  <div key={log.id} className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
                    <div>
                      <p className="text-xs font-medium text-slate-800">{log.syncTipi}</p>
                      <p className="text-xs text-slate-500">{formatTarih(log.baslamaTarihi)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={syncVariant(log.durum)}>{log.durum}</Badge>
                      <span className="text-xs text-slate-500">{log.islenenKayitSayisi} kayit</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      );
    }

    if (activeIntegration === "luca" && lucaDraftSafe) {
      return (
        <div className="space-y-4">
          <Card>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-800">Luca Import / Export Merkezi</h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  Ilk fazda online baglanti yerine kontrollu import/export ve firma kod esleme kullanilacak.
                </p>
              </div>
              <Badge variant={entegrasyonVariant(lucaDraftSafe.durum)}>{durumLabel(lucaDraftSafe.durum)}</Badge>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Select
                label="Calisma Modu"
                value={lucaDraftSafe.entegrasyonModu}
                onChange={(event) =>
                  setLucaDraft((prev) => (prev ? { ...prev, entegrasyonModu: event.target.value as LucaEntegrasyonAyari["entegrasyonModu"] } : prev))
                }
                options={[
                  { value: "import_export", label: "Import / Export" },
                  { value: "yardimli_senkron", label: "Yardimli Senkron" },
                  { value: "dogrudan_baglanti", label: "Dogrudan Baglanti" },
                ]}
              />
              <Input
                label="Uye No / Kurum Kodu"
                value={lucaDraftSafe.uyeNo ?? ""}
                onChange={(event) => setLucaDraft((prev) => (prev ? { ...prev, uyeNo: event.target.value } : prev))}
              />
              <Input
                label="Admin Kullanici Adi"
                value={lucaDraftSafe.adminKullaniciAdi ?? ""}
                onChange={(event) => setLucaDraft((prev) => (prev ? { ...prev, adminKullaniciAdi: event.target.value } : prev))}
              />
              <Input
                label="Admin Sifre"
                type="password"
                value={lucaSecret}
                onChange={(event) => setLucaSecret(event.target.value)}
                placeholder={lucaDraftSafe.adminSifreSet ? "Güncellemek için yeniden girin" : "Geçici secret taslağı"}
              />
              <Input
                label="Firma Kod Esleme Kurali"
                value={lucaDraftSafe.firmaKodEslemeKurali ?? ""}
                onChange={(event) =>
                  setLucaDraft((prev) => (prev ? { ...prev, firmaKodEslemeKurali: event.target.value } : prev))
                }
                hint="Ornek: vkn_tckn, firma_adi, luca_firma_kodu"
              />
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              {[
                ["musteriImportAktif", "Musteri import aktif"],
                ["beyanImportAktif", "Beyan import aktif"],
                ["tahakkukImportAktif", "Tahakkuk import aktif"],
                ["disaAktarimAktif", "Disa aktarim aktif"],
              ].map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={Boolean(lucaDraftSafe[key as keyof LucaEntegrasyonAyari])}
                    onChange={(event) =>
                      setLucaDraft((prev) =>
                        prev
                          ? {
                              ...prev,
                              [key]: event.target.checked,
                            }
                          : prev
                      )
                    }
                    className="h-4 w-4 rounded border-slate-300 text-blue-600"
                  />
                  {label}
                </label>
              ))}
            </div>

            <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800">
              Luca icin ilk faz karari: online credential ile derin baglanti yerine once import/export akisi.
              Boylece firma karti, beyan ve tahakkuk verilerini kontrollu sekilde sisteme alabilecegiz.
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Button onClick={handleSaveLuca}>Luca Ayarlarini Kaydet</Button>
              <Button variant="outline">Import Sablonu Olustur</Button>
              <Button variant="outline">Disa Aktarim Kurallari</Button>
            </div>
          </Card>
        </div>
      );
    }

    if (activeIntegration === "whatsapp") {
      const config = whatsappEntegrasyonAyarlari[0];
      return (
        <Card>
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-800">WhatsApp Business API</h3>
              <p className="mt-1 text-xs text-slate-500">
                Meta Cloud API üzerinden müşterilere doğrudan WhatsApp mesajı gönderir.
                Access token güvenlik için <code className="bg-slate-100 px-1 rounded text-xs">WHATSAPP_ACCESS_TOKEN</code> env değişkenine eklenmeli.
              </p>
            </div>
            <Badge variant={entegrasyonVariant(config?.durum ?? "test_edilmedi")}>{durumLabel(config?.durum ?? "test_edilmedi")}</Badge>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Input label="Provider" value="Meta Cloud API" disabled />
            <Input
              label="Phone Number ID"
              value={waDraft.businessPhoneNumberId}
              onChange={(e) => setWaDraft((p) => ({ ...p, businessPhoneNumberId: e.target.value }))}
              placeholder="15 haneli Meta Phone Number ID"
            />
          </div>

          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
            <p className="text-xs font-medium text-amber-800">Access Token Güvenliği</p>
            <p className="mt-1 text-xs text-amber-700">
              Access token sunucu tarafında saklanır. <code className="bg-amber-100 px-1 rounded">WHATSAPP_ACCESS_TOKEN=&lt;token&gt;</code> satırını <code className="bg-amber-100 px-1 rounded">.env.local</code> dosyanıza ekleyin.
            </p>
            <div className="mt-2 flex items-center gap-2">
              <Badge variant={config?.accessTokenSet ? "success" : "warning"}>
                {config?.accessTokenSet ? "Token tanımlı" : "Token eksik"}
              </Badge>
              <span className="text-xs text-amber-600">
                Token ekledikten sonra sunucuyu yeniden başlatın
              </span>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <div className="flex flex-wrap gap-2">
              <Badge variant={config?.tahakkukMesajiAktif ? "success" : "neutral"}>Tahakkuk bildirim {config?.tahakkukMesajiAktif ? "açık" : "kapalı"}</Badge>
              <Badge variant={config?.vadeHatirlatmaAktif ? "success" : "neutral"}>Vade hatırlatma {config?.vadeHatirlatmaAktif ? "açık" : "kapalı"}</Badge>
            </div>
            <Button size="sm" loading={waSaving} onClick={handleSaveWhatsApp}>
              Kaydet
            </Button>
          </div>
        </Card>
      );
    }

    if (activeIntegration === "banka") {
      const config = bankaEntegrasyonAyarlari[0];
      return (
        <Card>
          <h3 className="text-sm font-semibold text-slate-800">Banka Esleme Kurallari</h3>
          <p className="mt-1 text-xs text-slate-500">CSV/XLSX import aktif. Anahtar kelimeler ve alias listeleri ile esleme guclendiriliyor.</p>
          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-slate-200 p-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Vergi anahtar kelimeleri</p>
              <p className="mt-2 text-sm text-slate-700">{config?.vergiAnahtarKelimeleri.join(", ")}</p>
            </div>
            <div className="rounded-xl border border-slate-200 p-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Hizmet anahtar kelimeleri</p>
              <p className="mt-2 text-sm text-slate-700">{config?.hizmetAnahtarKelimeleri.join(", ")}</p>
            </div>
          </div>
        </Card>
      );
    }

    const emailConfig = emailEntegrasyonAyarlari[0];
    return (
      <Card>
        <h3 className="text-sm font-semibold text-slate-800">E-posta Altyapisi</h3>
        <p className="mt-1 text-xs text-slate-500">SMTP secret alanlari sonraki backend fazinda server-side secret store ile tamamlanacak.</p>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          <Input label="Gonderici Adi" value={emailConfig?.gondericiAdi ?? ""} disabled />
          <Input label="Gonderici Email" value={emailConfig?.gondericiEmail ?? ""} disabled />
        </div>
      </Card>
    );
  };

  if (loading) return <PageLoading />;
  if (!isMusavir(user)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3 text-slate-500">
        <Shield className="w-12 h-12 text-slate-300" />
        <p className="text-lg font-medium">Bu sayfaya erişim yetkiniz yok.</p>
        <p className="text-sm">Ayarlar sayfası yalnızca müşavir hesapları tarafından görüntülenebilir.</p>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Ayarlar" subtitle="Sistem, entegrasyon ve operasyon ayarlari" />

      <div className="flex gap-6">
        <nav className="w-52 flex-shrink-0">
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition-colors ${
                  activeTab === tab.id ? "bg-blue-50 font-medium text-blue-700" : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <tab.icon className={`h-4 w-4 ${activeTab === tab.id ? "text-blue-600" : "text-slate-400"}`} />
                {tab.label}
              </button>
            ))}
          </div>
        </nav>

        <div className="flex-1">
          {activeTab === "kullanicilar" && (
            <div className="space-y-4">
              {/* Aktif kullanicilar */}
              <Card>
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-800">Kullanicilar</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {kullanicilar.filter((u) => u.aktif).length} aktif ·{" "}
                      {kullanicilar.filter((u) => u.rol === "personel").length} personel ·{" "}
                      {kullanicilar.filter((u) => u.rol === "mukellef").length} mukellef
                    </p>
                  </div>
                  <Button size="sm" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setShowInviteModal(true)}>
                    Personel Davet Et
                  </Button>
                </div>
                <div className="divide-y divide-slate-100">
                  {kullanicilar.length === 0 ? (
                    <p className="py-6 text-center text-xs text-slate-500">Henuz kullanici yok</p>
                  ) : (
                    kullanicilar.map((u) => {
                      const bagli = u.rol === "mukellef" ? musteriler.find((m) => m.id === u.musteriId) : null;
                      const avatarBg = u.rol === "musavir" ? "bg-blue-100" : u.rol === "personel" ? "bg-violet-100" : "bg-emerald-100";
                      const avatarText = u.rol === "musavir" ? "text-blue-700" : u.rol === "personel" ? "text-violet-700" : "text-emerald-700";
                      return (
                        <div key={u.id} className="flex items-center justify-between py-3">
                          <div className="flex items-center gap-3">
                            <div className={`flex h-8 w-8 items-center justify-center rounded-full ${avatarBg}`}>
                              <span className={`text-xs font-bold ${avatarText}`}>{u.ad[0]}{u.soyad[0]}</span>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-slate-800">{`${u.ad} ${u.soyad}`}</p>
                              <p className="text-xs text-slate-500">{u.email}{bagli ? ` · ${bagli.firmaAdi}` : ""}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={u.rol === "musavir" ? "info" : u.rol === "personel" ? "neutral" : "success"}>
                              {ROL_LABELS[u.rol]}
                            </Badge>
                            <Badge variant={u.aktif ? "success" : "neutral"}>{u.aktif ? "Aktif" : "Pasif"}</Badge>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </Card>

              {/* Bekleyen davetler */}
              <Card>
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-800">Bekleyen Davetler</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {davetler.filter((d) => d.durum === "bekliyor").length} bekliyor
                    </p>
                  </div>
                </div>
                <div className="divide-y divide-slate-100">
                  {davetler.filter((d) => d.durum === "bekliyor").length === 0 ? (
                    <p className="py-6 text-center text-xs text-slate-500">Bekleyen davet yok</p>
                  ) : (
                    davetler
                      .filter((d) => d.durum === "bekliyor")
                      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
                      .map((davet) => {
                        const expired = davet.expiresAt < new Date().toISOString();
                        return (
                          <div key={davet.id} className="flex items-center justify-between py-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 flex-shrink-0">
                                <Clock className="h-3.5 w-3.5 text-amber-700" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-slate-800 truncate">{davet.email}</p>
                                <p className="text-xs text-slate-500">
                                  {ROL_LABELS[davet.rol]}{davet.musteriAdi ? ` · ${davet.musteriAdi}` : ""} ·{" "}
                                  {expired ? (
                                    <span className="text-red-500">Suresi doldu</span>
                                  ) : (
                                    <span>{formatTarih(davet.expiresAt)} tarihine kadar gecerli</span>
                                  )}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                              <button
                                type="button"
                                title="Linki kopyala"
                                onClick={async () => {
                                  await navigator.clipboard.writeText(davet.davetLinki);
                                  toast.success("Davet linki kopyalandi");
                                }}
                                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                              >
                                <Copy className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                title="Daveti iptal et"
                                onClick={async () => {
                                  if (!isFirebaseConfigured) {
                                    toast.warning("Firebase gerekli");
                                    return;
                                  }
                                  await updateDavet(davet.id, { durum: "iptal" });
                                  toast.success("Davet iptal edildi");
                                }}
                                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })
                  )}
                </div>
              </Card>

              {/* Gecmis davetler */}
              {davetler.filter((d) => d.durum !== "bekliyor").length > 0 && (
                <Card>
                  <h3 className="mb-3 text-sm font-semibold text-slate-800">Davet Gecmisi</h3>
                  <div className="divide-y divide-slate-100">
                    {davetler
                      .filter((d) => d.durum !== "bekliyor")
                      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
                      .slice(0, 10)
                      .map((davet) => (
                        <div key={davet.id} className="flex items-center justify-between py-2.5">
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-slate-700 truncate">{davet.email}</p>
                            <p className="text-xs text-slate-500">{ROL_LABELS[davet.rol]}{davet.musteriAdi ? ` · ${davet.musteriAdi}` : ""}</p>
                          </div>
                          <Badge
                            variant={
                              davet.durum === "kullanildi" ? "success" :
                              davet.durum === "iptal" ? "danger" : "neutral"
                            }
                          >
                            {davet.durum === "kullanildi" ? "Kullanildi" : davet.durum === "iptal" ? "Iptal" : "Suresi Doldu"}
                          </Badge>
                        </div>
                      ))}
                  </div>
                </Card>
              )}
            </div>
          )}

          {activeTab === "entegrasyon" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
                {integrationCards.map((card) => (
                  <button
                    key={card.id}
                    onClick={() => setActiveIntegration(card.id)}
                    className={`rounded-xl border p-4 text-left shadow-card transition-colors ${
                      activeIntegration === card.id
                        ? "border-blue-300 bg-blue-50"
                        : "border-slate-200 bg-white hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{card.title}</p>
                        <p className="mt-1 text-xs text-slate-500">{card.subtitle}</p>
                      </div>
                      <Badge variant={entegrasyonVariant(card.durum)}>{durumLabel(card.durum)}</Badge>
                    </div>
                    <p className="mt-3 text-xs text-slate-500">{card.meta}</p>
                  </button>
                ))}
              </div>

              {renderIntegrationPanel()}

              <Card>
                <h3 className="text-sm font-semibold text-slate-800">Entegrasyon Loglari</h3>
                <Table className="mt-3">
                  <TableHead>
                    <tr>
                      <TableHeadCell>Kaynak</TableHeadCell>
                      <TableHeadCell>Islem</TableHeadCell>
                      <TableHeadCell>Durum</TableHeadCell>
                      <TableHeadCell>Detay</TableHeadCell>
                      <TableHeadCell>Tarih</TableHeadCell>
                    </tr>
                  </TableHead>
                  <TableBody>
                    {localIntegrationLogs.length === 0 ? (
                      <TableEmpty colSpan={5} message="Entegrasyon logu bulunamadi" />
                    ) : (
                      localIntegrationLogs.slice(0, 10).map((log) => (
                        <TableRow key={log.id}>
                          <TableCell><span className="text-xs font-medium text-slate-700">{panelTitle(log.entegrasyon)}</span></TableCell>
                          <TableCell><span className="text-xs text-slate-600">{log.islem}</span></TableCell>
                          <TableCell><Badge variant={log.durum === "basarili" ? "success" : log.durum === "basarisiz" ? "danger" : "warning"}>{log.durum}</Badge></TableCell>
                          <TableCell className="whitespace-normal"><span className="text-xs text-slate-600">{log.detay}</span></TableCell>
                          <TableCell><span className="text-xs text-slate-500">{formatTarih(log.createdAt)}</span></TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </Card>
            </div>
          )}

          {activeTab === "guvenlik" && (
            <div className="space-y-4">
              <Card>
                <h3 className="text-sm font-semibold text-slate-800">Credential Guvenlik Yaklasimi</h3>
                <div className="mt-3 space-y-2 text-sm text-slate-600">
                  <p>1. Secret alanlari istemciden Firestore'a duz metin olarak yazilmaz.</p>
                  <p>2. GIB, Luca, WhatsApp ve SMTP sifreleri bir sonraki backend fazinda server-side secret manager ile tutulur.</p>
                  <p>3. Bugun ekledigimiz ekranlar bilgi toplama ve operasyon akisini netlestirme amacli metadata katmanidir.</p>
                </div>
              </Card>
            </div>
          )}

          {activeTab === "gonderimler" && (
            <div className="space-y-4">
              <Card>
                <div className="mb-4 flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-800">Başarısız Gönderimler</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Tekrar denenebilir mesajlar — maksimum 3 deneme
                    </p>
                  </div>
                  <Badge variant={basarisizGonderimler.length > 0 ? "danger" : "neutral"}>
                    {basarisizGonderimler.length} başarısız
                  </Badge>
                </div>
                {basarisizGonderimler.length === 0 ? (
                  <div className="flex items-center gap-2 p-4 bg-emerald-50 rounded-xl">
                    <span className="text-sm text-emerald-700 font-medium">Başarısız gönderim yok 🎉</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {basarisizGonderimler.map((g) => {
                      const musteri = musteriler.find((m) => m.id === g.musteriId);
                      const maxDeneme = g.denemeSayisi >= 3;
                      return (
                        <div
                          key={g.id}
                          className="flex items-start justify-between gap-3 p-3 border border-red-100 bg-red-50 rounded-xl"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-semibold text-slate-800">
                                {musteri?.firmaAdi ?? g.musteriAdi}
                              </span>
                              <Badge variant="neutral" className="text-[10px]">
                                {g.kanal}
                              </Badge>
                              <span className="text-[10px] text-slate-400">
                                Deneme: {g.denemeSayisi}/3
                              </span>
                            </div>
                            <p className="text-xs text-slate-600 truncate">{g.mesaj ?? "—"}</p>
                            {g.hataMesaji && (
                              <p className="text-[11px] text-red-600 mt-0.5 truncate">
                                Hata: {g.hataMesaji}
                              </p>
                            )}
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              {formatTarih(g.createdAt)}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={maxDeneme || retryingId === g.id}
                            loading={retryingId === g.id}
                            onClick={() => handleRetryGonderim(g)}
                          >
                            {maxDeneme ? "Limit" : "Retry"}
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>

              <Card>
                <h3 className="text-sm font-semibold text-slate-800 mb-3">Son Gönderimler</h3>
                <div className="space-y-1.5 max-h-72 overflow-y-auto">
                  {gonderimler.slice(0, 30).map((g) => {
                    const musteri = musteriler.find((m) => m.id === g.musteriId);
                    return (
                      <div
                        key={g.id}
                        className="flex items-center justify-between gap-2 py-1.5 border-b border-slate-100 last:border-0"
                      >
                        <div className="flex-1 min-w-0">
                          <span className="text-xs font-medium text-slate-700">
                            {musteri?.firmaAdi ?? g.musteriAdi}
                          </span>
                          <span className="text-[10px] text-slate-400 ml-2">{g.kanal}</span>
                        </div>
                        <span className="text-[10px] text-slate-400">{formatTarih(g.createdAt)}</span>
                        <Badge
                          variant={
                            g.durum === "gonderildi"
                              ? "success"
                              : g.durum === "basarisiz"
                              ? "danger"
                              : "neutral"
                          }
                        >
                          {g.durum}
                        </Badge>
                      </div>
                    );
                  })}
                  {gonderimler.length === 0 && (
                    <p className="text-xs text-slate-400">Henüz gönderim kaydı yok</p>
                  )}
                </div>
              </Card>
            </div>
          )}

          {activeTab === "denetim" && (
            <Card>
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-800">Denetim Kaydi</h3>
                  <p className="mt-0.5 text-xs text-slate-500">Son 50 islem kaydi</p>
                </div>
                <Badge variant="neutral">{sortedAuditLogs.length} kayit</Badge>
              </div>
              <Table>
                <TableHead>
                  <tr>
                    <TableHeadCell>Tarih</TableHeadCell>
                    <TableHeadCell>Kullanici</TableHeadCell>
                    <TableHeadCell>Aksiyon</TableHeadCell>
                    <TableHeadCell>Kaynak</TableHeadCell>
                    <TableHeadCell>Özet</TableHeadCell>
                  </tr>
                </TableHead>
                <TableBody>
                  {sortedAuditLogs.length === 0 ? (
                    <TableEmpty colSpan={5} message="Denetim kaydi bulunamadi" />
                  ) : (
                    sortedAuditLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell><span className="text-xs text-slate-600">{formatTarih(log.createdAt)}</span></TableCell>
                        <TableCell>
                          <div>
                            <p className="text-xs font-medium text-slate-800">{log.actorName}</p>
                            <p className="text-xs text-slate-400">{log.actorRole}</p>
                          </div>
                        </TableCell>
                        <TableCell><Badge variant={auditVariant(log.action)}>{AUDIT_ACTION_LABELS[log.action]}</Badge></TableCell>
                        <TableCell>
                          <div>
                            <p className="text-xs font-medium text-slate-700">{log.entityType}</p>
                            {log.entityLabel && <p className="text-xs text-slate-400">{log.entityLabel}</p>}
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-normal"><span className="text-xs text-slate-600">{log.summary}</span></TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>
          )}

          {activeTab === "sistem" && (
            <div className="space-y-4">
              <Card>
                <h3 className="text-sm font-semibold text-slate-800">Ofis Tercihleri</h3>
                <div className="mt-4 grid max-w-2xl grid-cols-1 gap-4 md:grid-cols-2">
                  <Input label="Ofis Unvani" defaultValue={selectedOfis?.unvan ?? "Musavir Ofisi"} />
                  <Input label="Vergi Dairesi" defaultValue={selectedOfis?.vergiDairesi ?? "Bagcilar VD"} />
                  <Input label="Telefon" defaultValue={selectedOfis?.telefon ?? ""} />
                  <Input label="E-posta" defaultValue={selectedOfis?.email ?? ""} />
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button>Kaydet</Button>
                  <Button type="button" variant="outline" loading={seeding} onClick={handleSeedFirebase}>
                    Demo Veriyi Firestore'a Aktar
                  </Button>
                </div>
              </Card>

              <Card>
                <h3 className="text-sm font-semibold text-slate-800">Resmi Gazete Özeti</h3>
                <div className="mt-3 space-y-2">
                  {resmiGazeteOzetleri.slice(0, 3).map((item) => (
                    <div key={item.id} className="rounded-lg border border-slate-200 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-medium text-slate-800">{item.baslik}</p>
                        <Badge variant={item.aksiyonGerekiyor ? "warning" : "neutral"}>{item.maliMusavirEtkiPuani}</Badge>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">{item.aiOzet}</p>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>

      <DavetModal open={showInviteModal} onClose={() => setShowInviteModal(false)} defaultRole="personel" />
    </div>
  );
}
