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
import { authHeaders } from "@/lib/firebase/client";
import { syncClaimsFor } from "@/lib/firebase/syncClaims";
import { TUM_YETKILER, YETKI_LABELS } from "@/lib/domain/davet";
import { BILDIRIM_TIP_LABELS, TUM_BILDIRIM_TIPLERI } from "@/lib/domain/bildirim";
import {
  createAuditLog,
  createEntegrasyonLog,
  createGibSyncLog,
  updateDavet,
  updateKullanici,
  updateGonderimKaydi,
  upsertBeyannameFromGib,
  upsertGibEntegrasyonAyari,
  upsertLucaEntegrasyonAyari,
  upsertOfis,
  upsertTebligatFromGib,
  upsertWhatsAppEntegrasyonAyari,
} from "@/lib/firebase/repositories";
import { useAppData } from "@/lib/hooks/useAppData";
import { PageLoading } from "@/components/ui/PageLoading";
import { formatTarih } from "@/lib/utils/format";
import { VERGI_DAIRESI_GRUPLARI } from "@/lib/constants/vergiDaireleri";
import { FirebaseError } from "firebase/app";
import { parseFirestoreError, parseGibSyncError } from "@/lib/utils/firebaseErrors";
import type {
  AuditAction,
  BildirimTercihleri,
  BildirimTip,
  KullaniciYetki,
  EntegrasyonDurum,
  GibEntegrasyonAyari,
  GibSyncLog,
  GonderimKaydi,
  LucaEntegrasyonAyari,
  User,
  WhatsAppEntegrasyonAyari,
} from "@/lib/types";

const TABS = [
  { id: "kurum", label: "Kurum Bilgileri", icon: Database },
  { id: "kullanicilar", label: "Kullanıcılar", icon: Users },
  { id: "entegrasyon", label: "Entegrasyonlar", icon: Link2 },
  { id: "gonderimler", label: "Gönderimler", icon: Bell },
  { id: "guvenlik", label: "Güvenlik", icon: Shield },
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

const KANAL_LABEL: Record<string, string> = {
  whatsapp: "WhatsApp", email: "E-posta", panel: "Panel",
};

const SYNC_DURUM_LABEL: Record<string, string> = {
  basarili: "Başarılı",
  basarisiz: "Başarısız",
  bekliyor: "Bekliyor",
};

const SYNC_TIPI_LABEL: Record<string, string> = {
  tebligat: "Tebligat",
  beyanname: "Beyanname",
  tahakkuk: "Tahakkuk",
  borc: "Borç",
  mukellef: "Mükellef",
  pdf: "PDF",
  tumu: "Tümü",
};

const GONDERIM_DURUM_LABEL: Record<string, string> = {
  bekliyor: "Bekliyor",
  gonderildi: "Gönderildi",
  basarisiz: "Başarısız",
};

const ENTEGRASYON_LOG_DURUM_LABEL: Record<string, string> = {
  basarili: "Başarılı",
  basarisiz: "Başarısız",
  bekliyor: "Bekliyor",
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
    bagli: "Bağlı",
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
  const { user, changePassword, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>("kurum");
  const [activeIntegration, setActiveIntegration] = useState<IntegrationPanel>("gib");
  const [showInviteModal, setShowInviteModal] = useState(false);
  // Rol/durum değiştirme akışı (yalnızca müşavir)
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [yetkiEditUserId, setYetkiEditUserId] = useState<string | null>(null);
  const [yetkiDraft, setYetkiDraft] = useState<KullaniciYetki[]>([]);
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
  // Otomatik gönderim ayarları — varsayılan: hepsi onay-bekle (false), global açık
  const [waAuto, setWaAuto] = useState({
    global: true,
    tahakkuk: false,
    vade: false,
    belge: false,
    davet: false,
    beyanname: false,
    rapor: false,
  });
  const [waSaving, setWaSaving] = useState(false);
  const [gibSecrets, setGibSecrets] = useState({
    ivdSifre: "",
    ebeyannameParola: "",
    ebeyannameSifre: "",
  });
  // Sunucu tarafında şifrelenmiş haller — Firestore'a bunlar yazılır
  const [encryptedGibSecrets, setEncryptedGibSecrets] = useState<Record<string, string>>({});
  const [lucaSecret, setLucaSecret] = useState("");
  const [syncLoading, setSyncLoading] = useState(false);
  const [kurumForm, setKurumForm] = useState({ unvan: "", vergiDairesi: "", telefon: "", email: "", sgkKullaniciAdi: "", sgkSifresi: "" });
  const [kurumSaving, setKurumSaving] = useState(false);
  // Captcha modal state
  const [captchaModal, setCaptchaModal] = useState(false);
  const [captchaLoading, setCaptchaLoading] = useState(false);
  const [captchaImageBase64, setCaptchaImageBase64] = useState("");
  const [captchaImageID, setCaptchaImageID] = useState("");
  const [captchaSessionCookie, setCaptchaSessionCookie] = useState("");
  const [captchaDk, setCaptchaDk] = useState("");
  const [pendingSyncTipi, setPendingSyncTipi] = useState<GibSyncLog["syncTipi"] | null>(null);

  // Şifre değiştirme formu
  const [sifreDegistirme, setSifreDegistirme] = useState({
    mevcutSifre: "",
    yeniSifre: "",
    yeniSifreTekrar: "",
  });
  const [sifreDegistirmeLoading, setSifreDegistirmeLoading] = useState(false);
  const [sifreDegistirmeHata, setSifreDegistirmeHata] = useState<string | null>(null);

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
      setWaAuto({
        global: wa.otomatikGonderimGloballeAcik ?? true,
        tahakkuk: wa.tahakkukMesajiOtomatikGonder ?? false,
        vade: wa.vadeHatirlatmaOtomatikGonder ?? false,
        belge: wa.belgeEksikOtomatikGonder ?? false,
        davet: wa.davetMesajiOtomatikGonder ?? false,
        beyanname: wa.beyannameMesajiOtomatikGonder ?? false,
        rapor: wa.raporMesajiOtomatikGonder ?? false,
      });
    }
  }, [whatsappEntegrasyonAyarlari]);

  const selectedOfis = ofisler[0];

  useEffect(() => {
    if (!selectedOfis) return;
    setKurumForm({
      unvan: selectedOfis.unvan ?? "",
      vergiDairesi: selectedOfis.vergiDairesi ?? "",
      telefon: selectedOfis.telefon ?? "",
      email: selectedOfis.email ?? "",
      sgkKullaniciAdi: selectedOfis.sgkKullaniciAdi ?? "",
      sgkSifresi: selectedOfis.sgkSifresi ?? "",
    });
  }, [selectedOfis]);

  const handleSaveKurum = async () => {
    if (!selectedOfis) {
      toast.warning("Ofis verisi bulunamadı", "Sayfayı yenileyip tekrar deneyin");
      return;
    }
    setKurumSaving(true);
    try {
      let encryptedSgkSifre = selectedOfis.sgkEncryptedSifre;

      // SGK şifresi girildiyse şifrele
      if (kurumForm.sgkSifresi?.trim()) {
        try {
          const res = await fetch("/api/gib/secrets", {
            method: "POST",
            headers: await authHeaders(),
            body: JSON.stringify({ sgkSifre: kurumForm.sgkSifresi.trim() }),
          });
          const data = await res.json();
          if (res.ok && data.encrypted?.sgkSifre) {
            encryptedSgkSifre = data.encrypted.sgkSifre;
          }
        } catch {
          toast.warning("SGK şifresi şifrelenemedi", "Sunucu erişim sorunu");
        }
      }

      await upsertOfis({
        ...selectedOfis,
        unvan: kurumForm.unvan,
        vergiDairesi: kurumForm.vergiDairesi,
        telefon: kurumForm.telefon,
        email: kurumForm.email,
        sgkKullaniciAdi: kurumForm.sgkKullaniciAdi,
        // Plaintext şifreyi hiçbir zaman Firestore'a yazma
        sgkSifresi: undefined,
        sgkEncryptedSifre: encryptedSgkSifre,
      });
      setKurumForm((p) => ({ ...p, sgkSifresi: "" }));
      toast.success("Kurum bilgileri kaydedildi");
    } catch (err) {
      toast.error("Kurum bilgileri kaydedilemedi", parseFirestoreError(err));
    } finally {
      setKurumSaving(false);
    }
  };

  const [sgkSyncLoading, setSgkSyncLoading] = useState(false);

  const handleSgkSync = async () => {
    if (!selectedOfis?.sgkEncryptedSifre || !selectedOfis?.sgkKullaniciAdi) {
      toast.warning("SGK kimlik bilgileri eksik", "Lütfen SGK kullanıcı adı ve şifresini kaydedip tekrar deneyin");
      return;
    }
    const musteriListesi = musteriler.filter((m) => m.sgkSicilNo && m.durum === "aktif");
    if (musteriListesi.length === 0) {
      toast.warning("SGK sicil numarası olan aktif müşteri bulunamadı");
      return;
    }
    setSgkSyncLoading(true);
    let basarili = 0;
    let basarisiz = 0;
    for (const musteri of musteriListesi) {
      try {
        const res = await fetch("/api/sgk/sync", {
          method: "POST",
          headers: { ...(await authHeaders()), "Content-Type": "application/json" },
          body: JSON.stringify({
            ofisId: selectedOfis.id,
            musteriId: musteri.id,
            musteriAdi: musteri.firmaAdi,
            musteriVkn: musteri.vknTckn,
            sgkSicilNo: musteri.sgkSicilNo,
            encryptedSgkSifre: selectedOfis.sgkEncryptedSifre,
            sgkKullaniciAdi: selectedOfis.sgkKullaniciAdi,
          }),
        });
        if (res.ok) basarili++;
        else basarisiz++;
      } catch {
        basarisiz++;
      }
    }
    setSgkSyncLoading(false);
    if (basarisiz === 0) {
      toast.success("SGK senkronizasyonu tamamlandı", `${basarili} müşteri senkronize edildi`);
    } else {
      toast.warning(`SGK sync: ${basarili} başarılı, ${basarisiz} başarısız`);
    }
  };

  // gibDraft and lucaDraft may be null; all usage below checks for null before reading
  const gibDraftSafe = gibDraft;
  const lucaDraftSafe = lucaDraft;

  const integrationCards = [
    {
      id: "gib" as const,
      title: "GİB",
      subtitle: "e-Beyanname, IVD, tebligat ve borç/tahakkuk kontrolü",
      durum: gibDraftSafe?.durum ?? "test_edilmedi",
      meta: gibDraftSafe?.manuelSenkronAktif ? "Manuel senkron açık" : "Manuel senkron kapalı",
    },
    {
      id: "luca" as const,
      title: "Luca",
      subtitle: "İlk fazda import/export ve firma kod eşleme",
      durum: lucaDraftSafe?.durum ?? "test_edilmedi",
      meta: lucaDraftSafe?.entegrasyonModu === "import_export" ? "Import / export" : "Diğer mod",
    },
    {
      id: "whatsapp" as const,
      title: "WhatsApp",
      subtitle: "Tahakkuk, davet ve hatırlatma mesajları",
      durum: whatsappEntegrasyonAyarlari[0]?.durum ?? "test_edilmedi",
      meta: whatsappEntegrasyonAyarlari[0]?.accessTokenSet ? "Token tanımlı" : "Token eksik",
    },
    {
      id: "banka" as const,
      title: "Banka",
      subtitle: "CSV/XLSX import ve eşleme kuralları",
      durum: bankaEntegrasyonAyarlari[0]?.durum ?? "test_edilmedi",
      meta: bankaEntegrasyonAyarlari[0]?.manuelOnayZorunlu ? "Manuel onay aktif" : "Otomatik ağırlıklı",
    },
    {
      id: "email" as const,
      title: "E-posta",
      subtitle: "SMTP ve resmi bildirim kopyaları",
      durum: emailEntegrasyonAyarlari[0]?.durum ?? "test_edilmedi",
      meta: emailEntegrasyonAyarlari[0]?.smtpSifreSet ? "SMTP hazır" : "SMTP eksik",
    },
  ];

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
      // Şifreli IVD parolasını Firestore'a yaz — cron job okuyabilsin
      encryptedIvdSifre: newEncrypted.ivdSifre || gibDraftSafe.encryptedIvdSifre,
      durum: "eksik",
      credentialUyarisi: undefined,
      updatedBy: user?.id ?? "musavir",
      updatedAt: new Date().toISOString(),
    };

    setGibDraft(next);
    setGibSecrets({ ivdSifre: "", ebeyannameParola: "", ebeyannameSifre: "" });

    try {
      await upsertGibEntegrasyonAyari(next);
      await createEntegrasyonLog({
        ofisId: next.ofisId,
        entegrasyon: "gib",
        islem: "kaydet",
        durum: "basarili",
        detay: hasNewSecrets
          ? "GİB kimlik bilgileri sunucu tarafında şifrelenerek kaydedildi."
          : "GİB ayar metadata'sı güncellendi.",
        createdBy: user?.id ?? "",
      });
      toast.success("GİB ayarları kaydedildi", hasNewSecrets ? "Kimlik bilgileri şifrelenerek saklandı" : "Ayarlar güncellendi");
    } catch (error) {
      console.error(error);
      toast.error("GİB ayarları kaydedilemedi", parseFirestoreError(error));
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
      sonHata: success ? undefined : "Kimlik veya şifre alanları eksik",
      updatedBy: user?.id ?? "",
      updatedAt: new Date().toISOString(),
    };
    setGibDraft(next);

    const logDetail = success
      ? "GİB bağlantı testi metadata seviyesinde başarılı görünüyor."
      : "GİB bağlantı testi için VKN/TCKN ve şifre set alanları eksik.";

    try {
      await upsertGibEntegrasyonAyari(next);
      await createEntegrasyonLog({
        ofisId: next.ofisId,
        entegrasyon: "gib",
        islem: "test",
        durum: success ? "basarili" : "basarisiz",
        detay: logDetail,
        createdBy: user?.id ?? "",
      });
      if (success) {
        toast.success("GİB bağlantı testi başarılı");
      } else {
        toast.warning("GİB testi eksik bilgi nedeniyle geçemedi", "VKN/TCKN, kullanıcı kodu ve şifre alanlarını kontrol edin");
      }
    } catch (error) {
      console.error(error);
      toast.error("GİB testi kaydedilemedi", parseFirestoreError(error));
    }
  };

  /** Önce captcha çeker, modalı açar — kullanıcı kodu girdikten sonra executeGibSync çağrılır */
  const handleManualGibSync = async (syncTipi: GibSyncLog["syncTipi"]) => {
    setPendingSyncTipi(syncTipi);
    setCaptchaDk("");
    setCaptchaImageBase64("");
    setCaptchaImageID("");
    setCaptchaSessionCookie("");
    setCaptchaLoading(true);
    setCaptchaModal(true);
    try {
      const res = await fetch("/api/gib/captcha");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Captcha alınamadı");
      setCaptchaImageBase64(data.imageBase64);
      setCaptchaImageID(data.imageID);
      setCaptchaSessionCookie(data.sessionCookie ?? "");
    } catch (err) {
      toast.error("GİB captcha alınamadı", err instanceof Error ? err.message : undefined);
      setCaptchaModal(false);
    } finally {
      setCaptchaLoading(false);
    }
  };

  const executeGibSync = async (syncTipi: GibSyncLog["syncTipi"]) => {
    if (!gibDraftSafe) return;

    setSyncLoading(true);
    const baslamaTarihi = new Date().toISOString();
    let syncDurum: "basarili" | "basarisiz" = "basarili";
    let islenenKayitSayisi = 0;
    let sonHata: string | undefined;

    const encSifre = encryptedGibSecrets["ivdSifre"] || gibDraftSafe.encryptedIvdSifre;
    const ofisId = gibDraftSafe.ofisId;

    const aktifMusteriler = musteriler.filter((m) => m.durum === "aktif" && m.vknTckn);

    // Tebligat: müşterinin kendi GİB hesabıyla çekilir
    const tebligatHedefleri = aktifMusteriler.filter(
      (m) => m.gibIvdKullaniciAdi && m.gibEncryptedIvdSifre
    );

    // Beyanname / tahakkuk: ofis IVD hesabıyla çekilir (.env.local / Ayarlar > GİB)
    const ofisKimligiHazir = Boolean(gibDraftSafe.ivdKullaniciKodu && gibDraftSafe.vknTckn && encSifre);

    const yapilacakTebligat = syncTipi === "tebligat" || (syncTipi as string) === "tumu";
    const yapilacakBeyanname = syncTipi === "beyanname" || (syncTipi as string) === "tumu";
    const yapilacakTahakkuk = (syncTipi as string) === "tahakkuk" || (syncTipi as string) === "tumu";

    // Erken çıkış: gerekli kreden yoksa uyar
    if (yapilacakTebligat && tebligatHedefleri.length === 0 && !yapilacakBeyanname && !yapilacakTahakkuk) {
      toast.warning("GİB kredansiyeli bulunan müşteri yok", "Müşteri Excel importu sırasında GİB bilgilerini eşleştirin");
      setSyncLoading(false);
      return;
    }
    if ((yapilacakBeyanname || yapilacakTahakkuk) && !ofisKimligiHazir && !yapilacakTebligat) {
      toast.warning("Ofis GİB kimlik bilgileri eksik", "Ayarlar → GİB → IVD Kullanıcı Kodu ve Şifreyi tamamlayın");
      setSyncLoading(false);
      return;
    }

    try {
      // ─── Tüm GİB verileri tek bir bulk-sync çağrısıyla çekilir ───────────
      // GİB captcha tek-kullanımlık: birden fazla çağrıda aynı captcha kullanılamaz.
      // Bu nedenle tebligat + beyanname + tahakkuk tek login oturumunda işlenir.
      if (ofisKimligiHazir) {
        // syncTipi'yi tek bir bulk-sync endpoint çağrısına dönüştür
        let bulkTip: "beyanname" | "tahakkuk" | "tebligat" | "tumu";
        if (yapilacakTebligat && yapilacakBeyanname && yapilacakTahakkuk) {
          bulkTip = "tumu";
        } else if (yapilacakTebligat && yapilacakBeyanname) {
          // tumu yap, tahakkuk zaten tumu içinde
          bulkTip = "tumu";
        } else if (yapilacakTebligat) {
          bulkTip = "tebligat";
        } else if (yapilacakBeyanname && yapilacakTahakkuk) {
          bulkTip = "tumu";
        } else if (yapilacakBeyanname) {
          bulkTip = "beyanname";
        } else {
          bulkTip = "tahakkuk";
        }

        const res = await fetch("/api/gib/bulk-sync", {
          method: "POST",
          headers: await authHeaders(),
          body: JSON.stringify({
            ofisId,
            captchaDk,
            captchaImageID,
            captchaSessionCookie,
            syncTipi: bulkTip,
          }),
        });
        const data = await res.json();

        // Captcha yanlış girildi → modal'ı yenile, sync log yazma
        if (data.captchaGecersiz) {
          toast.warning("Güvenlik kodu hatalı", "Lütfen resimdeki kodu tekrar girin.");
          setSyncLoading(false);
          setCaptchaDk("");
          setCaptchaImageBase64("");
          setCaptchaImageID("");
          setCaptchaSessionCookie("");
          setCaptchaLoading(true);
          setCaptchaModal(true);
          try {
            const capRes = await fetch("/api/gib/captcha");
            const capData = await capRes.json();
            if (capRes.ok) {
              setCaptchaImageBase64(capData.imageBase64);
              setCaptchaImageID(capData.imageID);
              setCaptchaSessionCookie(capData.sessionCookie ?? "");
            }
          } finally {
            setCaptchaLoading(false);
          }
          return;
        }

        if (!res.ok) {
          throw new Error(data.error ?? "GİB bulk sync başarısız");
        }
        if (data.needsCaptcha) {
          throw new Error("GİB oturumu sona erdi — lütfen captcha'yı yeniden çözün");
        }
        islenenKayitSayisi += data.toplamKayit ?? 0;
        if ((data.hataSayisi ?? 0) > 0) {
          console.warn("[GİB Bulk Sync] Kısmi hatalar:", data.hatalar);
        }
      } else if (yapilacakTebligat || yapilacakBeyanname || yapilacakTahakkuk) {
        toast.warning("Ofis GİB kimlik bilgileri eksik", "Ayarlar → GİB → IVD Kullanıcı Kodu ve Şifreyi tamamlayın");
      }
    } catch (err) {
      syncDurum = "basarisiz";
      sonHata = err instanceof Error ? err.message : "Bilinmeyen hata";
      toast.error("GİB senkronizasyon hatası", parseGibSyncError(err));
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
      createdBy: user?.id ?? "",
    };

    const next = {
      ...gibDraftSafe,
      sonBasariliSync: syncDurum === "basarili" ? entry.bitisTarihi : gibDraftSafe.sonBasariliSync,
      sonHata: syncDurum === "basarisiz" ? sonHata : undefined,
      durum: syncDurum === "basarili" ? ("bagli" as const) : ("hata" as const),
      updatedAt: new Date().toISOString(),
      updatedBy: user?.id ?? "",
    };
    setGibDraft(next);

    try {
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
        createdBy: user?.id ?? "",
      });
      if (syncDurum === "basarili") {
        toast.success(`GİB ${syncTipi} senkronu tamamlandı`, `${islenenKayitSayisi} kayıt işlendi`);
      }
    } catch (error) {
      console.error(error);
      toast.warning("Senkron tamamlandı", "İşlem logu kaydedilemedi, ancak veriler güncellendi.");
    } finally {
      setSyncLoading(false);
    }
  };

  /** Captcha modalındaki "Senkronize Et" butonuna basıldığında çağrılır */
  const handleCaptchaConfirm = async () => {
    if (!pendingSyncTipi || !captchaDk.trim()) return;
    setCaptchaModal(false);
    await executeGibSync(pendingSyncTipi);
    setPendingSyncTipi(null);
  };

  /** Captcha modalında "Yenile" butonuna basıldığında yeni captcha çeker */
  const handleRefreshCaptcha = async () => {
    setCaptchaDk("");
    setCaptchaImageBase64("");
    setCaptchaImageID("");
    setCaptchaSessionCookie("");
    setCaptchaLoading(true);
    try {
      const res = await fetch("/api/gib/captcha");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Captcha alınamadı");
      setCaptchaImageBase64(data.imageBase64);
      setCaptchaImageID(data.imageID);
      setCaptchaSessionCookie(data.sessionCookie ?? "");
    } catch (err) {
      toast.error("GİB captcha alınamadı", err instanceof Error ? err.message : undefined);
    } finally {
      setCaptchaLoading(false);
    }
  };

  const handleSaveLuca = async () => {
    if (!lucaDraftSafe) return;

    const next: LucaEntegrasyonAyari = {
      ...lucaDraftSafe,
      adminSifreSet: lucaDraftSafe.adminSifreSet || Boolean(lucaSecret),
      durum: (lucaDraftSafe.uyeNo && lucaDraftSafe.adminKullaniciAdi ? "test_edilmedi" : "eksik") as LucaEntegrasyonAyari["durum"],
      updatedAt: new Date().toISOString(),
      updatedBy: user?.id ?? "",
    };

    setLucaDraft(next);
    setLucaSecret("");

    try {
      await upsertLucaEntegrasyonAyari(next);
      await createEntegrasyonLog({
        ofisId: next.ofisId,
        entegrasyon: "luca",
        islem: "kaydet",
        durum: "basarili",
        detay: "Luca import/export metadata ayarları güncellendi.",
        createdBy: user?.id ?? "",
      });
      toast.success("Luca ayarları güncellendi");
    } catch (error) {
      console.error(error);
      toast.error("Luca ayarları kaydedilemedi", parseFirestoreError(error));
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

      await updateGonderimKaydi(kayit.id, {
        durum: basarili ? "gonderildi" : "basarisiz",
        denemeSayisi: kayit.denemeSayisi + 1,
        sentAt: basarili ? new Date().toISOString() : undefined,
        hataMesaji: basarili ? undefined : (data.results?.[0]?.hataMesaji ?? "Bilinmeyen hata"),
      });

      if (basarili) {
        toast.success("Mesaj yeniden gönderildi", musteri.firmaAdi);
      } else {
        toast.error("Mesaj gönderilemedi", "Tekrar deneyin veya alıcının numarasını kontrol edin.");
      }
    } catch (err) {
      toast.error("Mesaj tekrar gönderilemedi", parseFirestoreError(err));
    } finally {
      setRetryingId(null);
    }
  };

  const handleSaveWhatsApp = async () => {
    setWaSaving(true);
    const ofisId = whatsappEntegrasyonAyarlari[0]?.ofisId ?? gibDraftSafe?.ofisId ?? "";
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
      beyannameMesajiAktif: existing?.beyannameMesajiAktif ?? true,
      raporMesajiAktif: existing?.raporMesajiAktif ?? true,
      // Otomatik gönderim / onay-bekle ayarları (waAuto state'ten gelir)
      tahakkukMesajiOtomatikGonder: waAuto.tahakkuk,
      vadeHatirlatmaOtomatikGonder: waAuto.vade,
      belgeEksikOtomatikGonder: waAuto.belge,
      davetMesajiOtomatikGonder: waAuto.davet,
      beyannameMesajiOtomatikGonder: waAuto.beyanname,
      raporMesajiOtomatikGonder: waAuto.rapor,
      otomatikGonderimGloballeAcik: waAuto.global,
      secretStorageMode: "not_configured",
      updatedBy: user?.id ?? "musavir",
    };
    try {
      await upsertWhatsAppEntegrasyonAyari(next);
      await createEntegrasyonLog({
        ofisId,
        entegrasyon: "whatsapp",
        islem: "kaydet",
        durum: "basarili",
        detay: `WhatsApp Phone Number ID güncellendi: ${waDraft.businessPhoneNumberId || "(boş)"}`,
        createdBy: user?.id ?? "",
      });
      toast.success("WhatsApp ayarları kaydedildi", "WHATSAPP_ACCESS_TOKEN'ı .env.local dosyasına ekleyin");
    } catch (err) {
      toast.error("WhatsApp ayarları kaydedilemedi", parseFirestoreError(err));
    } finally {
      setWaSaving(false);
    }
  };

  const handleSifreDegistir = async (e: React.FormEvent) => {
    e.preventDefault();
    setSifreDegistirmeHata(null);

    const { mevcutSifre, yeniSifre, yeniSifreTekrar } = sifreDegistirme;
    if (!mevcutSifre) {
      setSifreDegistirmeHata("Mevcut şifrenizi girin.");
      return;
    }
    if (yeniSifre.length < 6) {
      setSifreDegistirmeHata("Yeni şifre en az 6 karakter olmalıdır.");
      return;
    }
    if (yeniSifre !== yeniSifreTekrar) {
      setSifreDegistirmeHata("Yeni şifreler eşleşmiyor.");
      return;
    }
    if (yeniSifre === mevcutSifre) {
      setSifreDegistirmeHata("Yeni şifre mevcut şifreden farklı olmalıdır.");
      return;
    }

    setSifreDegistirmeLoading(true);
    try {
      await changePassword(mevcutSifre, yeniSifre);
      // Şifre başarıyla değiştirildi — önce UI'ı temizle, sonra audit log yaz
      toast.success("Şifre değiştirildi", "Yeni şifrenizle giriş yapabilirsiniz.");
      setSifreDegistirme({ mevcutSifre: "", yeniSifre: "", yeniSifreTekrar: "" });
      // Audit log hatası ana akışı bozmasın — ayrı try/catch
      createAuditLog({
        actorId: user?.id ?? "",
        actorName: user ? `${user.ad} ${user.soyad}`.trim() : "Bilinmeyen",
        actorRole: user?.rol ?? "musavir",
        action: "update" as AuditAction,
        entityType: "sistem",
        entityId: user?.id ?? "",
        entityLabel: user?.email,
        summary: "Şifre değiştirildi",
      }).catch((e) => console.warn("[Audit] Şifre log hatası:", e));
    } catch (err) {
      // Firebase hata kodunu .code üzerinden kontrol et — mesaj string'e göre daha stabil
      const kod = err instanceof FirebaseError ? err.code : "";
      if (kod === "auth/wrong-password" || kod === "auth/invalid-credential") {
        setSifreDegistirmeHata("Mevcut şifreniz hatalı.");
      } else if (kod === "auth/too-many-requests") {
        setSifreDegistirmeHata("Çok fazla başarısız deneme. Lütfen bir süre bekleyin.");
      } else if (kod === "auth/requires-recent-login") {
        setSifreDegistirmeHata("Güvenlik nedeniyle oturumu kapatıp tekrar giriş yapın, ardından tekrar deneyin.");
      } else {
        setSifreDegistirmeHata(err instanceof Error ? err.message : "Bilinmeyen hata");
      }
    } finally {
      setSifreDegistirmeLoading(false);
    }
  };

  // ─── Kullanıcı rol/durum yönetimi (yalnızca müşavir) ──────────────────────

  const handleRolDegistir = async (hedef: (typeof kullanicilar)[number], yeniRol: string) => {
    if (yeniRol === hedef.rol) return;
    // Kendi rolünü buradan değiştirmeyi engelle (yanlışlıkla yetki kaybı riski)
    if (hedef.id === user?.id) {
      toast.error("Kendi rolünüzü buradan değiştiremezsiniz.");
      return;
    }
    // Mükellefe düşürme: bağlı bir müşteri kaydı olmadan mükellef olamaz
    if (yeniRol === "mukellef" && !hedef.musteriId) {
      toast.error("Mükellef rolü için kullanıcının bir müşteriyle eşleştirilmiş olması gerekir.");
      return;
    }

    setSavingUserId(hedef.id);
    try {
      await updateKullanici(hedef.id, { rol: yeniRol as User["rol"] });

      // Custom claim'i senkronize et (kural/API hızlı yolu için)
      const sync = await syncClaimsFor(hedef.id);

      createAuditLog({
        actorId: user?.id ?? "",
        actorName: user ? `${user.ad} ${user.soyad}`.trim() : "Bilinmeyen",
        actorRole: user?.rol ?? "musavir",
        action: "update" as AuditAction,
        entityType: "sistem",
        entityId: hedef.id,
        entityLabel: hedef.email,
        summary: `Rol değiştirildi: ${ROL_LABELS[hedef.rol]} → ${ROL_LABELS[yeniRol]}`,
      }).catch((e) => console.warn("[Audit] Rol log hatası:", e));

      if (sync.ok) {
        toast.success(
          "Rol güncellendi",
          "Değişikliğin tam etkin olması için kullanıcının yeniden giriş yapması gerekebilir."
        );
      } else {
        toast.success(
          "Rol güncellendi",
          "Yetki senkronizasyonu tamamlanamadı; kullanıcı yeniden giriş yaptığında etkin olur."
        );
      }
    } catch (err) {
      toast.error("Rol değiştirilemedi", err instanceof Error ? err.message : undefined);
    } finally {
      setSavingUserId(null);
    }
  };

  const handleAktiflikDegistir = async (hedef: (typeof kullanicilar)[number]) => {
    if (hedef.id === user?.id) {
      toast.error("Kendi hesabınızı buradan pasifleştiremezsiniz.");
      return;
    }
    const yeniAktif = !hedef.aktif;
    setSavingUserId(hedef.id);
    try {
      await updateKullanici(hedef.id, { aktif: yeniAktif });
      createAuditLog({
        actorId: user?.id ?? "",
        actorName: user ? `${user.ad} ${user.soyad}`.trim() : "Bilinmeyen",
        actorRole: user?.rol ?? "musavir",
        action: "update" as AuditAction,
        entityType: "sistem",
        entityId: hedef.id,
        entityLabel: hedef.email,
        summary: yeniAktif ? "Kullanıcı aktifleştirildi" : "Kullanıcı pasifleştirildi",
      }).catch((e) => console.warn("[Audit] Aktiflik log hatası:", e));
      toast.success(yeniAktif ? "Kullanıcı aktifleştirildi" : "Kullanıcı pasifleştirildi");
    } catch (err) {
      toast.error("Durum değiştirilemedi", err instanceof Error ? err.message : undefined);
    } finally {
      setSavingUserId(null);
    }
  };

  const handleYetkiPanelAc = (hedef: (typeof kullanicilar)[number]) => {
    if (yetkiEditUserId === hedef.id) {
      setYetkiEditUserId(null);
      return;
    }
    setYetkiEditUserId(hedef.id);
    setYetkiDraft(hedef.yetkiler ?? []);
  };

  const handleYetkiKaydet = async (hedef: (typeof kullanicilar)[number]) => {
    setSavingUserId(hedef.id);
    try {
      await updateKullanici(hedef.id, { yetkiler: yetkiDraft });
      createAuditLog({
        actorId: user?.id ?? "",
        actorName: user ? `${user.ad} ${user.soyad}`.trim() : "Bilinmeyen",
        actorRole: user?.rol ?? "musavir",
        action: "update" as AuditAction,
        entityType: "sistem",
        entityId: hedef.id,
        entityLabel: hedef.email,
        summary: `Yetkiler güncellendi: ${yetkiDraft.length ? yetkiDraft.map((y) => YETKI_LABELS[y]).join(", ") : "(boş)"}`,
      }).catch((e) => console.warn("[Audit] Yetki log hatası:", e));
      toast.success(
        "Yetkiler güncellendi",
        "Değişiklik kullanıcının bir sonraki oturumunda etkin olur."
      );
      setYetkiEditUserId(null);
    } catch (err) {
      toast.error("Yetkiler kaydedilemedi", err instanceof Error ? err.message : undefined);
    } finally {
      setSavingUserId(null);
    }
  };

  // ─── Bildirim tercihleri (kullanıcı bazlı, kalıcı) ────────────────────────

  const [bildirimSaving, setBildirimSaving] = useState(false);
  // Context'teki user oturum boyunca sabit kalır; UI'ın anında yansıması için
  // tercihler lokal state'te tutulur (kaynak: user.bildirimTercihleri).
  const [bildirimTercihleri, setBildirimTercihleri] = useState<BildirimTercihleri>(
    user?.bildirimTercihleri ?? {}
  );
  useEffect(() => {
    setBildirimTercihleri(user?.bildirimTercihleri ?? {});
  }, [user?.bildirimTercihleri]);

  const handleBildirimTercihDegistir = async (tip: BildirimTip, acik: boolean) => {
    if (!user) return;
    setBildirimSaving(true);
    const onceki = bildirimTercihleri;
    const yeni = { ...bildirimTercihleri, [tip]: acik };
    setBildirimTercihleri(yeni); // optimistic
    try {
      await updateKullanici(user.id, { bildirimTercihleri: yeni });
      await refreshUser(); // TopBar zil filtresi anında güncellensin
      toast.success(
        acik ? "Bildirim açıldı" : "Bildirim kapatıldı",
        `${BILDIRIM_TIP_LABELS[tip]} tercihi kaydedildi.`
      );
    } catch (err) {
      setBildirimTercihleri(onceki); // geri al
      toast.error("Tercih kaydedilemedi", err instanceof Error ? err.message : undefined);
    } finally {
      setBildirimSaving(false);
    }
  };

  const renderIntegrationPanel = () => {
    if (activeIntegration === "gib" && gibDraftSafe) {
      const encSifre = encryptedGibSecrets["ivdSifre"] || gibDraftSafe.encryptedIvdSifre;
      const hazir = Boolean(gibDraftSafe.ivdKullaniciKodu && gibDraftSafe.vknTckn && encSifre);
      const aktifMusteriler = musteriler.filter((m) => m.durum === "aktif");

      return (
        <>
          <div className="space-y-4">
            <Card>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-800">GİB İnteraktif Vergi Dairesi (IVD)</h3>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Tebligat, beyanname ve borç verilerini GİB IVD sisteminden çeker. Şifre AES-256-GCM ile şifrelenerek saklanır.
                  </p>
                </div>
                <Badge variant={entegrasyonVariant(gibDraftSafe.durum)}>{durumLabel(gibDraftSafe.durum)}</Badge>
              </div>

              {/* Kimlik bilgileri */}
              <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
                <Input
                  label="VKN / TCKN"
                  value={gibDraftSafe.vknTckn ?? ""}
                  onChange={(e) => setGibDraft((prev) => prev ? { ...prev, vknTckn: e.target.value } : prev)}
                  placeholder="Müşavir ofisinin VKN veya TCKN"
                />
                <Input
                  label="IVD Kullanıcı Kodu"
                  value={gibDraftSafe.ivdKullaniciKodu ?? ""}
                  onChange={(e) => setGibDraft((prev) => prev ? { ...prev, ivdKullaniciKodu: e.target.value } : prev)}
                  placeholder="GİB kullanıcı adınız"
                />
                <Input
                  label="IVD Şifre"
                  type="password"
                  value={gibSecrets.ivdSifre}
                  onChange={(e) => setGibSecrets((prev) => ({ ...prev, ivdSifre: e.target.value }))}
                  placeholder={encSifre ? "Değiştirmek için yeniden girin" : "GİB şifreniz"}
                  hint={encSifre ? "✓ Şifre kayıtlı — sunucuda şifreli saklanıyor" : "Kaydedilmeden önce AES-256-GCM ile şifrelenir"}
                />
                <Input
                  label="Günlük Senkron Saati"
                  type="time"
                  value={gibDraftSafe.syncSaati ?? "09:30"}
                  onChange={(e) => setGibDraft((prev) => prev ? { ...prev, syncSaati: e.target.value } : prev)}
                />
              </div>

              {/* Kaydet + Test */}
              <div className="mt-4 flex flex-wrap gap-2">
                <Button onClick={handleSaveGib}>Kaydet</Button>
                <Button variant="outline" onClick={handleGibTest}>Bağlantıyı Test Et</Button>
              </div>
            </Card>

            {/* Manuel Senkron */}
            <Card>
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-800">Manuel Senkron</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Tebligat: müşteri GİB hesabı · Beyanname &amp; borç: ofis IVD hesabı
                    {aktifMusteriler.length > 0
                      ? ` · ${aktifMusteriler.length} aktif müşteri`
                      : " · Aktif müşteri yok"}
                  </p>
                </div>
                {!hazir && (
                  <Badge variant="warning">Kimlik bilgileri eksik</Badge>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {(
                  [
                    {
                      tipi: "tebligat" as const,
                      label: "Tebligatlar",
                      aciklama: "e-Tebligat listesi",
                      kimlik: "Müşteri hesabı",
                    },
                    {
                      tipi: "beyanname" as const,
                      label: "Beyannameler",
                      aciklama: "Verilen beyannameler",
                      kimlik: "Ofis hesabı",
                    },
                    {
                      tipi: "tahakkuk" as const,
                      label: "Borç / Tahakkuk",
                      aciklama: "Ödeme gereken vergi borçları",
                      kimlik: "Ofis hesabı",
                    },
                    {
                      tipi: "tumu" as const,
                      label: "Tümünü Çek",
                      aciklama: "Tebligat + beyanname + borç",
                      kimlik: "Her ikisi",
                    },
                  ] as const
                ).map(({ tipi, label, aciklama, kimlik }) => (
                  <button
                    key={tipi}
                    disabled={!hazir || syncLoading}
                    onClick={() => handleManualGibSync(tipi as GibSyncLog["syncTipi"])}
                    className={`flex flex-col gap-1 rounded-xl border p-3 text-left transition-colors ${
                      hazir && !syncLoading
                        ? "border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50"
                        : "border-slate-100 bg-slate-50 opacity-50 cursor-not-allowed"
                    }`}
                  >
                    <span className="text-sm font-semibold text-slate-800">{label}</span>
                    <span className="text-xs text-slate-500">{aciklama}</span>
                    <span className="text-[10px] text-slate-400 mt-0.5">{kimlik}</span>
                  </button>
                ))}
              </div>
            </Card>

            {/* Sync Geçmişi */}
            <Card>
              <h3 className="text-sm font-semibold text-slate-800 mb-3">Senkron Geçmişi</h3>
              {gibSyncLogs.length === 0 ? (
                <p className="text-xs text-slate-500">Henüz senkron kaydı yok.</p>
              ) : (
                <div className="space-y-2">
                  {gibSyncLogs.slice(0, 8).map((log) => (
                    <div key={log.id} className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
                      <div>
                        <p className="text-xs font-medium text-slate-800">{SYNC_TIPI_LABEL[log.syncTipi] ?? log.syncTipi}</p>
                        <p className="text-xs text-slate-500">{formatTarih(log.baslamaTarihi)}</p>
                        {log.hataMesaji && (
                          <p className="text-xs text-red-500 mt-0.5 truncate max-w-xs">{log.hataMesaji}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={syncVariant(log.durum)}>{SYNC_DURUM_LABEL[log.durum] ?? log.durum}</Badge>
                        <span className="text-xs text-slate-500">{log.islenenKayitSayisi} kayıt</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

        </>
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
                  İlk fazda online bağlantı yerine kontrollü import/export ve firma kod eşleme kullanılacak.
                </p>
              </div>
              <Badge variant={entegrasyonVariant(lucaDraftSafe.durum)}>{durumLabel(lucaDraftSafe.durum)}</Badge>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Select
                label="Çalışma Modu"
                value={lucaDraftSafe.entegrasyonModu}
                onChange={(event) =>
                  setLucaDraft((prev) => (prev ? { ...prev, entegrasyonModu: event.target.value as LucaEntegrasyonAyari["entegrasyonModu"] } : prev))
                }
                options={[
                  { value: "import_export", label: "Import / Export" },
                  { value: "yardimli_senkron", label: "Yardımlı Senkron" },
                  { value: "dogrudan_baglanti", label: "Doğrudan Bağlantı" },
                ]}
              />
              <Input
                label="Üye No / Kurum Kodu"
                value={lucaDraftSafe.uyeNo ?? ""}
                onChange={(event) => setLucaDraft((prev) => (prev ? { ...prev, uyeNo: event.target.value } : prev))}
              />
              <Input
                label="Admin Kullanıcı Adı"
                value={lucaDraftSafe.adminKullaniciAdi ?? ""}
                onChange={(event) => setLucaDraft((prev) => (prev ? { ...prev, adminKullaniciAdi: event.target.value } : prev))}
              />
              <Input
                label="Admin Şifre"
                type="password"
                value={lucaSecret}
                onChange={(event) => setLucaSecret(event.target.value)}
                placeholder={lucaDraftSafe.adminSifreSet ? "Güncellemek için yeniden girin" : "Geçici secret taslağı"}
              />
              <Input
                label="Firma Kod Eşleme Kuralı"
                value={lucaDraftSafe.firmaKodEslemeKurali ?? ""}
                onChange={(event) =>
                  setLucaDraft((prev) => (prev ? { ...prev, firmaKodEslemeKurali: event.target.value } : prev))
                }
                hint="Örnek: vkn_tckn, firma_adi, luca_firma_kodu"
              />
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              {[
                ["musteriImportAktif", "Müşteri import aktif"],
                ["beyanImportAktif", "Beyan import aktif"],
                ["tahakkukImportAktif", "Tahakkuk import aktif"],
                ["disaAktarimAktif", "Dışa aktarım aktif"],
              ].map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 cursor-pointer">
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
              Luca için ilk faz kararı: online credential ile derin bağlantı yerine önce import/export akışı.
              Böylece firma kartı, beyan ve tahakkuk verilerini kontrollü şekilde sisteme alabileceğiz.
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Button onClick={handleSaveLuca}>Luca Ayarlarını Kaydet</Button>
              <Button variant="outline">Import Şablonu Oluştur</Button>
              <Button variant="outline">Dışa Aktarım Kuralları</Button>
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

          {/* Mesaj türü bazında otomatik gönderim ayarları */}
          <div className="mt-5 rounded-xl border border-slate-200 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h4 className="text-sm font-semibold text-slate-800">Otomatik Gönderim Ayarları</h4>
                <p className="mt-0.5 text-xs text-slate-500">
                  Her mesaj türü için: <strong>Otomatik</strong> = sistem onayınız olmadan gönderir.
                  <strong> Onay Bekle</strong> = mesaj kuyruğa düşer, siz onaylayana kadar gitmez.
                </p>
              </div>
              <label className="flex items-center gap-2 cursor-pointer flex-shrink-0">
                <input
                  type="checkbox"
                  checked={waAuto.global}
                  onChange={(e) => setWaAuto((p) => ({ ...p, global: e.target.checked }))}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-xs font-medium text-slate-700">Otomatik gönderim açık</span>
              </label>
            </div>

            {!waAuto.global && (
              <div className="mt-3 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
                🛑 Global anahtar kapalı — hiçbir mesaj otomatik gitmez, hepsi onay bekleyenler kuyruğuna düşer.
              </div>
            )}

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                { key: "tahakkuk" as const, etiket: "Tahakkuk Bildirimi", aciklama: "Yeni tahakkuk oluşturulunca müşteriye bilgi mesajı" },
                { key: "vade" as const, etiket: "Vade Hatırlatma", aciklama: "Vade tarihinden 3 gün önce hatırlatma" },
                { key: "belge" as const, etiket: "Eksik Belge Bildirimi", aciklama: "Belge eksikse müşteriden talep mesajı" },
                { key: "davet" as const, etiket: "Mükellef Daveti", aciklama: "Yeni mükellefe panel davet mesajı" },
                { key: "beyanname" as const, etiket: "Beyanname Hatırlatma", aciklama: "Beyanname son tarihi yaklaştığında" },
                { key: "rapor" as const, etiket: "Rapor Gönderimi", aciklama: "Hazır rapor müşteriye sunulduğunda" },
              ].map((tur) => {
                const otomatik = waAuto[tur.key];
                const disabled = !waAuto.global;
                return (
                  <div
                    key={tur.key}
                    className={`rounded-lg border px-3 py-2.5 ${
                      disabled ? "border-slate-200 bg-slate-50 opacity-60" : otomatik ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-800">{tur.etiket}</p>
                        <p className="mt-0.5 text-[11px] text-slate-500 leading-snug">{tur.aciklama}</p>
                      </div>
                      <Badge variant={disabled ? "neutral" : otomatik ? "success" : "warning"}>
                        {disabled ? "Pasif" : otomatik ? "Otomatik" : "Onay Bekle"}
                      </Badge>
                    </div>
                    <div className="mt-2 flex gap-1">
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => setWaAuto((p) => ({ ...p, [tur.key]: true }))}
                        className={`flex-1 rounded px-2 py-1 text-[11px] font-medium border ${
                          otomatik && !disabled
                            ? "bg-emerald-600 text-white border-emerald-600"
                            : "bg-white text-slate-600 border-slate-300 hover:bg-slate-50"
                        } ${disabled ? "cursor-not-allowed" : ""}`}
                      >
                        Otomatik
                      </button>
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => setWaAuto((p) => ({ ...p, [tur.key]: false }))}
                        className={`flex-1 rounded px-2 py-1 text-[11px] font-medium border ${
                          !otomatik && !disabled
                            ? "bg-amber-500 text-white border-amber-500"
                            : "bg-white text-slate-600 border-slate-300 hover:bg-slate-50"
                        } ${disabled ? "cursor-not-allowed" : ""}`}
                      >
                        Onay Bekle
                      </button>
                    </div>
                  </div>
                );
              })}
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
          <h3 className="text-sm font-semibold text-slate-800">Banka Eşleme Kuralları</h3>
          <p className="mt-1 text-xs text-slate-500">CSV/XLSX import aktif. Anahtar kelimeler ve alias listeleri ile eşleme güçlendiriliyor.</p>
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
        <h3 className="text-sm font-semibold text-slate-800">E-posta Altyapısı</h3>
        <p className="mt-1 text-xs text-slate-500">SMTP secret alanları sonraki backend fazında server-side secret store ile tamamlanacak.</p>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          <Input label="Gönderici Adı" value={emailConfig?.gondericiAdi ?? ""} disabled />
          <Input label="Gönderici E-posta" value={emailConfig?.gondericiEmail ?? ""} disabled />
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
      <PageHeader title="Ayarlar" subtitle="Sistem, entegrasyon ve operasyon ayarları" />

      {/* Mobilde yatay scroll tab, masaüstünde yan sidebar */}
      <div className="flex flex-col gap-4 lg:flex-row lg:gap-6">
        <nav className="lg:w-52 lg:flex-shrink-0">
          {/* Masaüstü: dikey liste */}
          <div className="hidden lg:block overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setSifreDegistirmeHata(null); }}
                className={`flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition-colors ${
                  activeTab === tab.id ? "bg-blue-50 font-medium text-blue-700" : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <tab.icon className={`h-4 w-4 ${activeTab === tab.id ? "text-blue-600" : "text-slate-400"}`} />
                {tab.label}
              </button>
            ))}
          </div>
          {/* Mobil: yatay kaydırmalı tab şeridi */}
          <div className="lg:hidden -mx-4 border-b border-slate-200 overflow-x-auto scrollbar-none">
            <div className="flex px-4">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => { setActiveTab(tab.id); setSifreDegistirmeHata(null); }}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === tab.id ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500"
                  }`}
                >
                  <tab.icon className="h-3.5 w-3.5" />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </nav>

        <div className="flex-1 min-w-0">
          {activeTab === "kurum" && (
            <div className="space-y-4">
              <Card>
                <h3 className="text-sm font-semibold text-slate-800 mb-4">Genel Bilgiler</h3>
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <Input
                    label="Ofis / Firma Unvanı"
                    value={kurumForm.unvan}
                    onChange={(e) => setKurumForm((p) => ({ ...p, unvan: e.target.value }))}
                    placeholder="Mali Müşavirlik Ofisi"
                  />
                  <Input
                    label="Telefon"
                    value={kurumForm.telefon}
                    onChange={(e) => setKurumForm((p) => ({ ...p, telefon: e.target.value }))}
                    placeholder="0212 000 00 00"
                  />
                  <Input
                    label="E-posta"
                    type="email"
                    value={kurumForm.email}
                    onChange={(e) => setKurumForm((p) => ({ ...p, email: e.target.value }))}
                    placeholder="ofis@example.com"
                  />
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Vergi Dairesi</label>
                    <select
                      value={kurumForm.vergiDairesi}
                      onChange={(e) => setKurumForm((p) => ({ ...p, vergiDairesi: e.target.value }))}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Seçim Yapın</option>
                      {VERGI_DAIRESI_GRUPLARI.map(({ grup, daireler }) => (
                        <optgroup key={grup} label={grup}>
                          {daireler.map((d) => (
                            <option key={d} value={d}>{d}</option>
                          ))}
                        </optgroup>
                      ))}
                      <option value="Diğer">Diğer</option>
                    </select>
                  </div>
                </div>
              </Card>

              <Card>
                <div className="flex items-start justify-between mb-1">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-800">SGK Bilgileri</h3>
                    <p className="text-xs text-slate-500 mt-0.5">e-Bildirge giriş bilgileri — AES-256-GCM ile şifreli saklanır.</p>
                  </div>
                  {selectedOfis?.sgkEncryptedSifre && (
                    <Button
                      variant="outline"
                      size="sm"
                      loading={sgkSyncLoading}
                      onClick={handleSgkSync}
                    >
                      SGK Senkronize Et
                    </Button>
                  )}
                </div>
                {selectedOfis?.sgkEncryptedSifre && (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 mb-3 text-xs text-emerald-700">
                    ✓ SGK şifresi şifreli olarak kaydedilmiş
                  </div>
                )}
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <Input
                    label="SGK Kullanıcı Adı"
                    value={kurumForm.sgkKullaniciAdi}
                    onChange={(e) => setKurumForm((p) => ({ ...p, sgkKullaniciAdi: e.target.value }))}
                    placeholder="SGK kullanıcı adınız"
                  />
                  <Input
                    label="SGK Şifresi"
                    type="password"
                    value={kurumForm.sgkSifresi}
                    onChange={(e) => setKurumForm((p) => ({ ...p, sgkSifresi: e.target.value }))}
                    placeholder={selectedOfis?.sgkEncryptedSifre ? "Değiştirmek için yeni şifre girin" : "SGK şifreniz"}
                  />
                </div>
              </Card>

              <div className="flex justify-end">
                <Button onClick={handleSaveKurum} loading={kurumSaving}>Kaydet</Button>
              </div>
            </div>
          )}

          {activeTab === "kullanicilar" && (
            <div className="space-y-4">
              {/* Aktif kullanicilar */}
              <Card>
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-800">Kullanıcılar</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {kullanicilar.filter((u) => u.aktif).length} aktif ·{" "}
                      {kullanicilar.filter((u) => u.rol === "personel").length} personel ·{" "}
                      {kullanicilar.filter((u) => u.rol === "mukellef").length} mükellef
                    </p>
                  </div>
                  <Button size="sm" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setShowInviteModal(true)}>
                    Ekip Üyesi Davet Et
                  </Button>
                </div>
                <div className="divide-y divide-slate-100">
                  {kullanicilar.length === 0 ? (
                    <p className="py-6 text-center text-xs text-slate-500">Henüz kullanıcı yok</p>
                  ) : (
                    kullanicilar.map((u) => {
                      const bagli = u.rol === "mukellef" ? musteriler.find((m) => m.id === u.musteriId) : null;
                      const avatarBg = u.rol === "musavir" ? "bg-blue-100" : u.rol === "personel" ? "bg-violet-100" : "bg-emerald-100";
                      const avatarText = u.rol === "musavir" ? "text-blue-700" : u.rol === "personel" ? "text-violet-700" : "text-emerald-700";
                      return (
                        <div key={u.id} className="py-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`flex h-8 w-8 items-center justify-center rounded-full ${avatarBg}`}>
                              <span className={`text-xs font-bold ${avatarText}`}>{u.ad[0]}{u.soyad[0]}</span>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-slate-800">{`${u.ad} ${u.soyad}`}</p>
                              <p className="text-xs text-slate-500">
                                {u.email}
                                {bagli ? ` · ${bagli.firmaAdi}` : ""}
                                {u.rol === "musavir" && u.ruhsatNo ? ` · Ruhsat: ${u.ruhsatNo}` : ""}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {isMusavir(user) && u.id !== user?.id ? (
                              <>
                                <select
                                  value={u.rol}
                                  disabled={savingUserId === u.id}
                                  onChange={(e) => handleRolDegistir(u, e.target.value)}
                                  className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 focus:border-blue-400 focus:outline-none disabled:opacity-50"
                                  title="Rolü değiştir"
                                >
                                  <option value="musavir">Mali Müşavir</option>
                                  <option value="personel">Personel</option>
                                  <option value="mukellef" disabled={!u.musteriId}>
                                    Mükellef
                                  </option>
                                </select>
                                <button
                                  type="button"
                                  disabled={savingUserId === u.id}
                                  onClick={() => handleAktiflikDegistir(u)}
                                  title={u.aktif ? "Pasifleştir" : "Aktifleştir"}
                                  className={`rounded-lg px-2 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${
                                    u.aktif
                                      ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                      : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                                  }`}
                                >
                                  {u.aktif ? "Aktif" : "Pasif"}
                                </button>
                                {u.rol === "personel" && (
                                  <button
                                    type="button"
                                    disabled={savingUserId === u.id}
                                    onClick={() => handleYetkiPanelAc(u)}
                                    className={`rounded-lg px-2 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${
                                      yetkiEditUserId === u.id
                                        ? "bg-blue-100 text-blue-700"
                                        : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                                    }`}
                                  >
                                    Yetkiler{u.yetkiler?.length ? ` (${u.yetkiler.length})` : ""}
                                  </button>
                                )}
                              </>
                            ) : (
                              <>
                                <Badge variant={u.rol === "musavir" ? "info" : u.rol === "personel" ? "neutral" : "success"}>
                                  {ROL_LABELS[u.rol]}
                                </Badge>
                                <Badge variant={u.aktif ? "success" : "neutral"}>{u.aktif ? "Aktif" : "Pasif"}</Badge>
                              </>
                            )}
                          </div>
                        </div>
                        {yetkiEditUserId === u.id && (
                          <div className="mt-2 ml-11 rounded-xl border border-slate-200 bg-slate-50 p-3">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                              {TUM_YETKILER.map((y) => (
                                <label key={y} className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={yetkiDraft.includes(y)}
                                    onChange={(e) =>
                                      setYetkiDraft((prev) =>
                                        e.target.checked ? [...prev, y] : prev.filter((p) => p !== y)
                                      )
                                    }
                                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                  />
                                  {YETKI_LABELS[y]}
                                </label>
                              ))}
                            </div>
                            {yetkiDraft.includes("vkn_goruntule") && !u.yetkiler?.includes("vkn_goruntule") && (
                              <p className="mt-2 text-[11px] text-amber-700">
                                VKN/TCKN açık görüntüleme hassas bir yetkidir; yalnızca gerekli personele verin.
                              </p>
                            )}
                            <div className="mt-3 flex justify-end gap-2">
                              <Button variant="ghost" size="sm" onClick={() => setYetkiEditUserId(null)}>
                                Vazgeç
                              </Button>
                              <Button size="sm" loading={savingUserId === u.id} onClick={() => handleYetkiKaydet(u)}>
                                Kaydet
                              </Button>
                            </div>
                          </div>
                        )}
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
                                    <span className="text-red-500">Süresi doldu</span>
                                  ) : (
                                    <span>{formatTarih(davet.expiresAt)} tarihine kadar geçerli</span>
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
                                  toast.success("Davet linki kopyalandı");
                                }}
                                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                              >
                                <Copy className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                title="Daveti iptal et"
                                onClick={async () => {
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
                  <h3 className="mb-3 text-sm font-semibold text-slate-800">Davet Geçmişi</h3>
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
                            {davet.durum === "kullanildi" ? "Kullanıldı" : davet.durum === "iptal" ? "İptal" : "Süresi Doldu"}
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
                <h3 className="text-sm font-semibold text-slate-800">Entegrasyon Logları</h3>
                <Table className="mt-3">
                  <TableHead>
                    <tr>
                      <TableHeadCell>Kaynak</TableHeadCell>
                      <TableHeadCell>İşlem</TableHeadCell>
                      <TableHeadCell>Durum</TableHeadCell>
                      <TableHeadCell>Detay</TableHeadCell>
                      <TableHeadCell>Tarih</TableHeadCell>
                    </tr>
                  </TableHead>
                  <TableBody>
                    {entegrasyonLoglari.length === 0 ? (
                      <TableEmpty colSpan={5} message="Entegrasyon logu bulunamadı" />
                    ) : (
                      entegrasyonLoglari.slice(0, 10).map((log) => (
                        <TableRow key={log.id}>
                          <TableCell><span className="text-xs font-medium text-slate-700">{panelTitle(log.entegrasyon)}</span></TableCell>
                          <TableCell><span className="text-xs text-slate-600">{log.islem}</span></TableCell>
                          <TableCell><Badge variant={log.durum === "basarili" ? "success" : log.durum === "basarisiz" ? "danger" : "warning"}>{ENTEGRASYON_LOG_DURUM_LABEL[log.durum] ?? log.durum}</Badge></TableCell>
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
              {/* Bildirim Tercihleri — kullanıcı bazlı, Firestore'da kalıcı */}
              <Card>
                <div className="flex items-center gap-2 mb-1">
                  <Bell className="h-4 w-4 text-blue-600" />
                  <h3 className="text-sm font-semibold text-slate-800">Bildirim Tercihleri</h3>
                </div>
                <p className="text-xs text-slate-500 mb-4">
                  Panel içi bildirim zilinde hangi tür bildirimleri görmek istediğinizi seçin. Tercihler hesabınıza kaydedilir.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-xl">
                  {TUM_BILDIRIM_TIPLERI.map((tip) => {
                    const acik = bildirimTercihleri[tip] !== false;
                    return (
                      <label
                        key={tip}
                        className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors ${
                          acik ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-slate-50"
                        }`}
                      >
                        <span className="text-xs font-medium text-slate-700">{BILDIRIM_TIP_LABELS[tip]}</span>
                        <input
                          type="checkbox"
                          checked={acik}
                          disabled={bildirimSaving}
                          onChange={(e) => handleBildirimTercihDegistir(tip, e.target.checked)}
                          className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                        />
                      </label>
                    );
                  })}
                </div>
              </Card>

              {/* Şifre Değiştirme */}
              <Card>
                <div className="flex items-center gap-2 mb-4">
                  <Shield className="h-4 w-4 text-blue-600" />
                  <h3 className="text-sm font-semibold text-slate-800">Şifre Değiştir</h3>
                </div>
                <form onSubmit={handleSifreDegistir} className="space-y-4 max-w-sm">
                  <Input
                    label="Mevcut Şifre"
                    type="password"
                    autoComplete="current-password"
                    value={sifreDegistirme.mevcutSifre}
                    onChange={(e) => {
                      setSifreDegistirme((prev) => ({ ...prev, mevcutSifre: e.target.value }));
                      setSifreDegistirmeHata(null);
                    }}
                    disabled={sifreDegistirmeLoading}
                    required
                  />
                  <Input
                    label="Yeni Şifre"
                    type="password"
                    autoComplete="new-password"
                    value={sifreDegistirme.yeniSifre}
                    onChange={(e) => {
                      setSifreDegistirme((prev) => ({ ...prev, yeniSifre: e.target.value }));
                      setSifreDegistirmeHata(null);
                    }}
                    hint="En az 6 karakter"
                    disabled={sifreDegistirmeLoading}
                    required
                  />
                  <Input
                    label="Yeni Şifre (Tekrar)"
                    type="password"
                    autoComplete="new-password"
                    value={sifreDegistirme.yeniSifreTekrar}
                    onChange={(e) => {
                      setSifreDegistirme((prev) => ({ ...prev, yeniSifreTekrar: e.target.value }));
                      setSifreDegistirmeHata(null);
                    }}
                    disabled={sifreDegistirmeLoading}
                    required
                  />
                  {sifreDegistirmeHata && (
                    <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <span className="text-xs text-red-700">{sifreDegistirmeHata}</span>
                    </div>
                  )}
                  <Button
                    type="submit"
                    variant="primary"
                    loading={sifreDegistirmeLoading}
                    disabled={sifreDegistirmeLoading}
                    className="w-full sm:w-auto"
                  >
                    Şifreyi Güncelle
                  </Button>
                </form>
              </Card>

              {/* Güvenlik Notları */}
              <Card>
                <h3 className="text-sm font-semibold text-slate-800">Güvenlik Notları</h3>
                <div className="mt-3 space-y-2 text-sm text-slate-600">
                  <p>• Şifre değiştirmeden önce mevcut şifrenizle kimlik doğrulaması yapılır.</p>
                  <p>• Şifrenizi unuttuysanız çıkış yaparak &ldquo;Şifremi Unuttum&rdquo; bağlantısını kullanın.</p>
                  <p>• GİB, Luca ve WhatsApp entegrasyon şifreleri AES-256-GCM ile şifrelenerek saklanır — düz metin Firestore&apos;a yazılmaz.</p>
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
                                {KANAL_LABEL[g.kanal] ?? g.kanal}
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
                          <span className="text-[10px] text-slate-400 ml-2">{KANAL_LABEL[g.kanal] ?? g.kanal}</span>
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
                          {GONDERIM_DURUM_LABEL[g.durum] ?? g.durum}
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
                  <h3 className="text-sm font-semibold text-slate-800">Denetim Kaydı</h3>
                  <p className="mt-0.5 text-xs text-slate-500">Son 50 işlem kaydı</p>
                </div>
                <Badge variant="neutral">{sortedAuditLogs.length} kayıt</Badge>
              </div>
              <Table>
                <TableHead>
                  <tr>
                    <TableHeadCell>Tarih</TableHeadCell>
                    <TableHeadCell>Kullanıcı</TableHeadCell>
                    <TableHeadCell>Aksiyon</TableHeadCell>
                    <TableHeadCell>Kaynak</TableHeadCell>
                    <TableHeadCell>Özet</TableHeadCell>
                  </tr>
                </TableHead>
                <TableBody>
                  {sortedAuditLogs.length === 0 ? (
                    <TableEmpty colSpan={5} message="Denetim kaydı bulunamadı" />
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
                  <Input label="Ofis Ünvanı" defaultValue={selectedOfis?.unvan ?? "Müşavir Ofisi"} />
                  <Input label="Vergi Dairesi" defaultValue={selectedOfis?.vergiDairesi ?? "Bağcılar VD"} />
                  <Input label="Telefon" defaultValue={selectedOfis?.telefon ?? ""} />
                  <Input label="E-posta" defaultValue={selectedOfis?.email ?? ""} />
                </div>
                <div className="mt-4">
                  <Button>Kaydet</Button>
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

      {/* ─── GİB Captcha Modal ─────────────────────────────────────────── */}
      {captchaModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-800">GİB Güvenlik Doğrulaması</h2>
              <button
                onClick={() => { setCaptchaModal(false); setPendingSyncTipi(null); }}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              GİB IVD sistemine bağlanmak için aşağıdaki güvenlik kodunu girin.
            </p>

            {/* Captcha görseli */}
            <div className="flex flex-col items-center gap-3">
              {captchaLoading ? (
                <div className="w-48 h-16 bg-slate-100 rounded-lg flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : captchaImageBase64 ? (
                // eslint-disable-next-line @next/next/no-img-element -- base64 data URI captcha; next/image optimizasyonu gereksiz
                <img
                  src={`data:image/jpeg;base64,${captchaImageBase64}`}
                  alt="GİB güvenlik kodu"
                  className="rounded-lg border border-slate-200 h-16 object-contain"
                />
              ) : (
                <div className="w-48 h-16 bg-slate-100 rounded-lg flex items-center justify-center text-xs text-slate-400">
                  Captcha yüklenemedi
                </div>
              )}
              <button
                type="button"
                onClick={handleRefreshCaptcha}
                disabled={captchaLoading}
                className="text-xs text-blue-600 hover:text-blue-800 underline disabled:opacity-50"
              >
                Yenile
              </button>
            </div>

            {/* Kod girişi */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Güvenlik Kodu
              </label>
              <Input
                value={captchaDk}
                onChange={(e) => setCaptchaDk(e.target.value)}
                placeholder="Resimdeki kodu girin"
                onKeyDown={(e) => { if (e.key === "Enter") handleCaptchaConfirm(); }}
                autoFocus
              />
            </div>

            {/* Aksiyon butonları */}
            <div className="flex gap-2 pt-1">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => { setCaptchaModal(false); setPendingSyncTipi(null); }}
              >
                İptal
              </Button>
              <Button
                className="flex-1"
                disabled={!captchaDk.trim() || captchaLoading || syncLoading}
                loading={syncLoading}
                onClick={handleCaptchaConfirm}
              >
                Senkronize Et
              </Button>
            </div>
          </div>
        </div>
      )}

      <DavetModal open={showInviteModal} onClose={() => setShowInviteModal(false)} defaultRole="personel" />
    </div>
  );
}
