"use client";

import { useEffect, useMemo, useState } from "react";
import { Eye, EyeOff, RefreshCw, ChevronDown, Mail, Phone, CreditCard } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/lib/context/ToastContext";
import { parseFirestoreError } from "@/lib/utils/firebaseErrors";
import { isFirebaseConfigured } from "@/lib/firebase/client";
import { createMusteri, updateMusteri } from "@/lib/firebase/repositories";
import type { Musteri, User } from "@/lib/types";

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  musteri?: Musteri;
  kullanicilar?: User[];
}

const VERGI_TURLERI = [
  { key: "kdv1", label: "KDV1" },
  { key: "kdv2", label: "KDV2" },
  { key: "kdv4", label: "KDV4" },
  { key: "ba", label: "BA" },
  { key: "bs", label: "BS" },
  { key: "gecici", label: "Geçici" },
  { key: "damga", label: "Damga" },
  { key: "kurumlar", label: "Kurumlar" },
  { key: "gelir", label: "Gelir" },
  { key: "gelir1001e", label: "Gelir1001E" },
  { key: "muhsgk", label: "MuhSGK" },
  { key: "muhsgk2", label: "MuhSGK2" },
  { key: "poset", label: "Poşet" },
  { key: "turizm", label: "Turizm" },
  { key: "otv1", label: "ÖTV 1" },
  { key: "otv3a", label: "ÖTV 3A" },
  { key: "otv4", label: "ÖTV 4" },
  { key: "basit", label: "Basit" },
  { key: "noter", label: "Noter" },
  { key: "oiv", label: "ÖİV" },
  { key: "konaklama", label: "Konaklama" },
];

const VERGI_TURU_SECENEKLER = [
  { value: "sorumlu_degil", label: "Sorumlu Değil" },
  { value: "mukellef", label: "Mükellef" },
];

const EDEFTER_SECENEKLER = [
  { value: "sorumlu_degil", label: "Sorumlu Değil" },
  { value: "yuklu", label: "Yüklü" },
];

const GRUPLAR = ["Basit Usul", "Bilanço", "İşletme", "Serbest Meslek", "Sermaye Şirketi"];

const ETUYS_SECENEKLER = [
  { value: "", label: "Seçiniz" },
  { value: "yok", label: "Yok" },
  { value: "var", label: "Var" },
];

function generatePassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  const arr = new Uint8Array(8);
  crypto.getRandomValues(arr);
  return "A1" + Array.from(arr).map((b) => chars[b % chars.length]).join("");
}

const EMPTY_FORM = {
  firmaAdi: "",
  yetkiliAd: "",
  vknTckn: "",
  sahissaVergiNo: "",
  vergiDairesi: "",
  sifre: "",
  eposta1: "", eposta1Ad: "",
  eposta2: "", eposta2Ad: "",
  eposta3: "", eposta3Ad: "",
  gsm1: "", gsm1Ad: "",
  gsm2: "", gsm2Ad: "",
  gsm3: "", gsm3Ad: "",
  vergiTurleri: {} as Record<string, string>,
  gruplar: [] as string[],
  eDefter: "sorumlu_degil",
  eDefterGecis: "",
  naceKodu: "",
  mudurGorevBitisTarihi: "",
  maliMuhur1Sn: "", maliMuhur1Bitis: "",
  maliMuhur2Sn: "", maliMuhur2Bitis: "",
  maliMuhur3Sn: "", maliMuhur3Bitis: "",
  panelGirisAktif: true,
  ikiAdimliDogrulama: false,
  ikiAdimliYontem: "sms",
  dogumTarihi: "",
  acilisTarihi: "",
  kapanisTarihi: "",
  eTuys: "",
  not: "",
  girisMailGonder: true,
  sorumluPersonelId: "",
  varsayilanHizmetUcreti: "",
  adres: "",
};

type Tab = "mukellef" | "kurum" | "bankaci" | "kullanici";

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-sky-100 border border-sky-200 rounded-lg px-3 py-2 mb-3">
      <span className="text-sky-800 font-semibold text-sm">{children}</span>
    </div>
  );
}

function VergiSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="relative inline-block w-full">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`appearance-none w-full text-white rounded-lg pl-3 pr-7 py-1.5 text-xs font-medium cursor-pointer border-none outline-none ${
          value === "mukellef" ? "bg-emerald-500" : "bg-rose-500"
        }`}
      >
        {VERGI_TURU_SECENEKLER.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white pointer-events-none" />
    </div>
  );
}

export function YeniMusteriModal({ open, onClose, onSuccess, musteri, kullanicilar = [] }: Props) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [activeTab, setActiveTab] = useState<Tab>("mukellef");
  const [showSifre, setShowSifre] = useState(false);

  const isEdit = Boolean(musteri);

  const sorumluOptions = useMemo(() => {
    return kullanicilar
      .filter((u) => u.aktif && (u.rol === "musavir" || u.rol === "personel"))
      .map((u) => ({
        value: u.id,
        label: `${u.ad} ${u.soyad}${u.rol === "musavir" ? " (Müşavir)" : ""}`,
      }));
  }, [kullanicilar]);

  useEffect(() => {
    if (!open) return;
    if (musteri) {
      const eslesen = kullanicilar.find(
        (u) => u.id === musteri.sorumluPersonelId || `${u.ad} ${u.soyad}` === musteri.sorumluPersonel
      );
      setForm({
        ...EMPTY_FORM,
        firmaAdi: musteri.firmaAdi,
        yetkiliAd: musteri.yetkiliAd,
        vknTckn: musteri.vknTckn,
        sahissaVergiNo: musteri.sahissaVergiNo ?? "",
        vergiDairesi: musteri.vergiDairesi ?? "",
        eposta1: musteri.eposta1 ?? musteri.email ?? "",
        eposta1Ad: musteri.eposta1Ad ?? "",
        eposta2: musteri.eposta2 ?? "",
        eposta2Ad: musteri.eposta2Ad ?? "",
        eposta3: musteri.eposta3 ?? "",
        eposta3Ad: musteri.eposta3Ad ?? "",
        gsm1: musteri.gsm1 ?? musteri.telefon ?? "",
        gsm1Ad: musteri.gsm1Ad ?? "",
        gsm2: musteri.gsm2 ?? "",
        gsm2Ad: musteri.gsm2Ad ?? "",
        gsm3: musteri.gsm3 ?? "",
        gsm3Ad: musteri.gsm3Ad ?? "",
        vergiTurleri: musteri.vergiTurleri ?? {},
        gruplar: musteri.gruplar ?? [],
        eDefter: musteri.eDefter ?? "sorumlu_degil",
        eDefterGecis: musteri.eDefterGecis ?? "",
        naceKodu: musteri.naceKodu ?? "",
        mudurGorevBitisTarihi: musteri.mudurGorevBitisTarihi ?? "",
        maliMuhur1Sn: musteri.maliMuhurler?.[0]?.sn ?? "",
        maliMuhur1Bitis: musteri.maliMuhurler?.[0]?.bitisTarihi ?? "",
        maliMuhur2Sn: musteri.maliMuhurler?.[1]?.sn ?? "",
        maliMuhur2Bitis: musteri.maliMuhurler?.[1]?.bitisTarihi ?? "",
        maliMuhur3Sn: musteri.maliMuhurler?.[2]?.sn ?? "",
        maliMuhur3Bitis: musteri.maliMuhurler?.[2]?.bitisTarihi ?? "",
        panelGirisAktif: musteri.panelGirisAktif ?? true,
        ikiAdimliDogrulama: musteri.ikiAdimliDogrulama ?? false,
        ikiAdimliYontem: musteri.ikiAdimliYontem ?? "sms",
        dogumTarihi: musteri.dogumTarihi ?? "",
        acilisTarihi: musteri.acilisTarihi ?? musteri.kurulusTarihi ?? "",
        kapanisTarihi: musteri.kapanisTarihi ?? "",
        not: musteri.aciklama ?? "",
        girisMailGonder: musteri.girisMailGonder ?? true,
        sorumluPersonelId: eslesen?.id ?? musteri.sorumluPersonelId ?? "",
        varsayilanHizmetUcreti: musteri.varsayilanHizmetUcreti?.toString() ?? "",
        adres: musteri.adres ?? "",
        sifre: "",
        eTuys: "",
      });
    } else {
      const ilkMusavir = kullanicilar.find((u) => u.aktif && u.rol === "musavir");
      setForm({ ...EMPTY_FORM, sorumluPersonelId: ilkMusavir?.id ?? "" });
    }
    setActiveTab("mukellef");
  }, [musteri, open, kullanicilar]);

  const set = <K extends keyof typeof EMPTY_FORM>(field: K, value: (typeof EMPTY_FORM)[K]) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const updateVergiTuru = (key: string, value: string) =>
    setForm((prev) => ({ ...prev, vergiTurleri: { ...prev.vergiTurleri, [key]: value } }));

  const toggleGrup = (grup: string) =>
    setForm((prev) => ({
      ...prev,
      gruplar: prev.gruplar.includes(grup)
        ? prev.gruplar.filter((g) => g !== grup)
        : [...prev.gruplar, grup],
    }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.firmaAdi || !form.vknTckn) {
      toast.error("Ünvan ve TC/Vergi No zorunludur");
      return;
    }
    if (form.vknTckn.replace(/\D/g, "").length < 10) {
      toast.error("VKN/TCKN 10 veya 11 haneli olmalıdır");
      return;
    }
    setLoading(true);
    try {
      const secilenKullanici = kullanicilar.find((u) => u.id === form.sorumluPersonelId);
      const sorumluPersonelAdi = secilenKullanici
        ? `${secilenKullanici.ad} ${secilenKullanici.soyad}`
        : musteri?.sorumluPersonel ?? "";

      const maliMuhurler = [
        { sn: form.maliMuhur1Sn, bitisTarihi: form.maliMuhur1Bitis },
        { sn: form.maliMuhur2Sn, bitisTarihi: form.maliMuhur2Bitis },
        { sn: form.maliMuhur3Sn, bitisTarihi: form.maliMuhur3Bitis },
      ].filter((m) => m.sn || m.bitisTarihi);

      const ucret = form.varsayilanHizmetUcreti
        ? Number(form.varsayilanHizmetUcreti.replace(",", "."))
        : undefined;

      const extendedFields = {
        sahissaVergiNo: form.sahissaVergiNo || undefined,
        aciklama: form.not || undefined,
        eposta1: form.eposta1 || undefined, eposta1Ad: form.eposta1Ad || undefined,
        eposta2: form.eposta2 || undefined, eposta2Ad: form.eposta2Ad || undefined,
        eposta3: form.eposta3 || undefined, eposta3Ad: form.eposta3Ad || undefined,
        gsm1: form.gsm1 || undefined, gsm1Ad: form.gsm1Ad || undefined,
        gsm2: form.gsm2 || undefined, gsm2Ad: form.gsm2Ad || undefined,
        gsm3: form.gsm3 || undefined, gsm3Ad: form.gsm3Ad || undefined,
        vergiTurleri: Object.keys(form.vergiTurleri).length > 0 ? form.vergiTurleri : undefined,
        gruplar: form.gruplar.length > 0 ? form.gruplar : undefined,
        eDefter: form.eDefter !== "sorumlu_degil" ? form.eDefter : undefined,
        eDefterGecis: form.eDefterGecis || undefined,
        naceKodu: form.naceKodu || undefined,
        mudurGorevBitisTarihi: form.mudurGorevBitisTarihi || undefined,
        maliMuhurler: maliMuhurler.length > 0 ? maliMuhurler : undefined,
        panelGirisAktif: form.panelGirisAktif,
        ikiAdimliDogrulama: form.ikiAdimliDogrulama,
        ikiAdimliYontem: form.ikiAdimliYontem,
        dogumTarihi: form.dogumTarihi || undefined,
        acilisTarihi: form.acilisTarihi || undefined,
        kapanisTarihi: form.kapanisTarihi || undefined,
        girisMailGonder: form.girisMailGonder,
        kurulusTarihi: form.acilisTarihi || undefined,
      };

      if (isFirebaseConfigured) {
        if (musteri) {
          await updateMusteri(musteri.id, {
            firmaAdi: form.firmaAdi,
            vknTckn: form.vknTckn.replace(/\D/g, ""),
            yetkiliAd: form.yetkiliAd,
            email: form.eposta1 || "",
            telefon: form.gsm1 || "",
            adres: form.adres,
            vergiDairesi: form.vergiDairesi || undefined,
            sorumluPersonel: sorumluPersonelAdi,
            sorumluPersonelId: form.sorumluPersonelId || undefined,
            varsayilanHizmetUcreti: Number.isFinite(ucret) ? ucret : undefined,
            kdvMukellef: (form.vergiTurleri["kdv1"] ?? "sorumlu_degil") !== "sorumlu_degil",
            muhtasarMukellef: (form.vergiTurleri["muhsgk"] ?? "sorumlu_degil") !== "sorumlu_degil",
            ...extendedFields,
          });
        } else {
          await createMusteri({
            firmaAdi: form.firmaAdi,
            vknTckn: form.vknTckn.replace(/\D/g, ""),
            yetkiliAd: form.yetkiliAd,
            email: form.eposta1 || "",
            telefon: form.gsm1 || "",
            adres: form.adres,
            vergiDairesi: form.vergiDairesi || undefined,
            sorumluPersonel: sorumluPersonelAdi,
            sorumluPersonelId: form.sorumluPersonelId || undefined,
            varsayilanHizmetUcreti: Number.isFinite(ucret) ? ucret : undefined,
            kdvMukellef: (form.vergiTurleri["kdv1"] ?? "sorumlu_degil") !== "sorumlu_degil",
            muhtasarMukellef: (form.vergiTurleri["muhsgk"] ?? "sorumlu_degil") !== "sorumlu_degil",
            ...extendedFields,
          });
        }
      } else {
        await new Promise((r) => setTimeout(r, 800));
      }

      toast.success(
        isEdit ? "Müşteri güncellendi" : "Müşteri oluşturuldu",
        `${form.firmaAdi} başarıyla ${isEdit ? "güncellendi" : "sisteme eklendi"}`
      );
      onClose();
      onSuccess?.();
    } catch (error) {
      console.error(error);
      toast.error("Müşteri kaydedilemedi", parseFirestoreError(error));
    } finally {
      setLoading(false);
    }
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: "mukellef", label: "Mükellef Bilgileri" },
    { key: "kurum", label: "Kurum Bilgileri" },
    { key: "bankaci", label: "Bankacılar" },
    { key: "kullanici", label: "Kullanıcılar" },
  ];

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? "Mükellef Düzenle" : "Mükellef Ekle"} size="xl">
      <form onSubmit={handleSubmit}>
        {/* Sekmeler */}
        <div className="flex border-b border-slate-200 -mt-2 mb-4">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setActiveTab(t.key)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === t.key
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Mükellef Bilgileri ── */}
        {activeTab === "mukellef" && (
          <div className="space-y-5">
            {/* Info banner */}
            <div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-2.5 text-sm text-blue-800">
              Giriş bilgileri mükellefin &quot;E-posta (1)&quot; alanına yazdığınız adrese eposta ile gönderilecektir.
            </div>

            {/* Kimlik */}
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Ünvan veya Ad Soyad"
                value={form.firmaAdi}
                onChange={(e) => set("firmaAdi", e.target.value)}
                required
              />
              <Input
                label="Yetkili Ad Soyad"
                value={form.yetkiliAd}
                onChange={(e) => set("yetkiliAd", e.target.value)}
              />
              <Input
                label="Şahıssa TC No, Şirketse Vergi No"
                value={form.vknTckn}
                onChange={(e) => set("vknTckn", e.target.value)}
                maxLength={11}
                required
              />
              {/* Şifre */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Şifre{" "}
                  <span className="font-normal text-slate-400 text-xs">(en az 6 karakter, en az 1 rakam ve 1 harf içermelidir)</span>
                </label>
                <div className="relative">
                  <input
                    type={showSifre ? "text" : "password"}
                    value={form.sifre}
                    onChange={(e) => set("sifre", e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 pr-20 text-sm text-slate-900 placeholder-slate-400 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <div className="absolute right-1 top-1/2 -translate-y-1/2 flex gap-0.5">
                    <button
                      type="button"
                      onClick={() => setShowSifre((v) => !v)}
                      className="p-1.5 text-slate-400 hover:text-slate-600 rounded"
                    >
                      {showSifre ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => set("sifre", generatePassword())}
                      className="p-1.5 text-slate-400 hover:text-slate-600 rounded"
                      title="Şifre oluştur"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>

              <Input
                label="Şahıssa Vergi No"
                value={form.sahissaVergiNo}
                onChange={(e) => set("sahissaVergiNo", e.target.value)}
              />
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Vergi Dairesi</label>
                <select
                  value={form.vergiDairesi}
                  onChange={(e) => set("vergiDairesi", e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Seçim Yapın</option>
                  <option value="Bağcılar">Bağcılar</option>
                  <option value="Kadıköy">Kadıköy</option>
                  <option value="Beşiktaş">Beşiktaş</option>
                  <option value="Fatih">Fatih</option>
                  <option value="Şişli">Şişli</option>
                  <option value="Üsküdar">Üsküdar</option>
                  <option value="Diğer">Diğer</option>
                </select>
              </div>
            </div>

            {/* İletişim Bilgileri */}
            <div>
              <SectionHeader>İletişim Bilgileri</SectionHeader>
              <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                {/* E-Posta kolonları */}
                <div className="space-y-3">
                  {([1, 2, 3] as const).map((n) => (
                    <div key={n}>
                      <p className="text-xs font-medium text-slate-600 mb-1">E-Posta ({n})</p>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 border border-slate-300 rounded-lg px-3 min-h-[40px]">
                          <Mail className="h-4 w-4 text-slate-400 shrink-0" />
                          <input
                            type="email"
                            placeholder="E-Posta"
                            value={form[`eposta${n}` as keyof typeof form] as string}
                            onChange={(e) => set(`eposta${n}` as keyof typeof EMPTY_FORM, e.target.value as never)}
                            className="flex-1 text-sm bg-transparent outline-none placeholder-slate-400 text-slate-900"
                          />
                        </div>
                        <div className="flex items-center gap-2 border border-slate-300 rounded-lg px-3 min-h-[40px]">
                          <span className="text-slate-400 text-base leading-none">👤</span>
                          <input
                            type="text"
                            placeholder="Ad Soyad"
                            value={form[`eposta${n}Ad` as keyof typeof form] as string}
                            onChange={(e) => set(`eposta${n}Ad` as keyof typeof EMPTY_FORM, e.target.value as never)}
                            className="flex-1 text-sm bg-transparent outline-none placeholder-slate-400 text-slate-900"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {/* GSM kolonları */}
                <div className="space-y-3">
                  {([1, 2, 3] as const).map((n) => (
                    <div key={n}>
                      <p className="text-xs font-medium text-slate-600 mb-1">GSM ({n})</p>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 border border-slate-300 rounded-lg px-3 min-h-[40px]">
                          <Phone className="h-4 w-4 text-slate-400 shrink-0" />
                          <input
                            type="tel"
                            placeholder="0555 xxx xx xx"
                            value={form[`gsm${n}` as keyof typeof form] as string}
                            onChange={(e) => set(`gsm${n}` as keyof typeof EMPTY_FORM, e.target.value as never)}
                            className="flex-1 text-sm bg-transparent outline-none placeholder-slate-400 text-slate-900"
                          />
                        </div>
                        <div className="flex items-center gap-2 border border-slate-300 rounded-lg px-3 min-h-[40px]">
                          <span className="text-slate-400 text-base leading-none">👤</span>
                          <input
                            type="text"
                            placeholder="Ad Soyad"
                            value={form[`gsm${n}Ad` as keyof typeof form] as string}
                            onChange={(e) => set(`gsm${n}Ad` as keyof typeof EMPTY_FORM, e.target.value as never)}
                            className="flex-1 text-sm bg-transparent outline-none placeholder-slate-400 text-slate-900"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Vergi Türleri */}
            <div>
              <SectionHeader>Vergi Türleri</SectionHeader>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {VERGI_TURLERI.map((vt) => (
                  <div key={vt.key} className="flex flex-col gap-1">
                    <span className="text-xs font-medium text-slate-600">{vt.label}</span>
                    <VergiSelect
                      value={form.vergiTurleri[vt.key] ?? "sorumlu_degil"}
                      onChange={(v) => updateVergiTuru(vt.key, v)}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Grup Seçimi */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <SectionHeader>Grup Seçimi</SectionHeader>
                <button type="button" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                  ✏️ Yeni Grup Ekle / Düzenle
                </button>
              </div>
              <div className="flex flex-wrap gap-4">
                {GRUPLAR.map((g) => (
                  <label key={g} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.gruplar.includes(g)}
                      onChange={() => toggleGrup(g)}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-slate-700">{g}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* E-Defter */}
            <div>
              <SectionHeader>E-Defter</SectionHeader>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">E-Defter</label>
                  <div className="relative">
                    <select
                      value={form.eDefter}
                      onChange={(e) => set("eDefter", e.target.value)}
                      className="appearance-none w-full bg-rose-500 text-white rounded-lg pl-3 pr-8 py-2 text-sm font-medium cursor-pointer border-none outline-none min-h-[44px]"
                    >
                      {EDEFTER_SECENEKLER.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-white pointer-events-none" />
                  </div>
                </div>
                <Input
                  label="E-Defter Geçiş Tarihi"
                  type="date"
                  value={form.eDefterGecis}
                  onChange={(e) => set("eDefterGecis", e.target.value)}
                />
              </div>
            </div>

            {/* Nace Kodu + Müdür Görev/Yetki Süresi */}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <SectionHeader>Nace Kodu</SectionHeader>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Nace Kodu</label>
                  <select
                    value={form.naceKodu}
                    onChange={(e) => set("naceKodu", e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Nace Kodu Seçilmedi</option>
                  </select>
                </div>
              </div>
              <div>
                <SectionHeader>Müdür Görev/Yetki Süresi</SectionHeader>
                <Input
                  label="Bitiş Tarihi"
                  type="date"
                  value={form.mudurGorevBitisTarihi}
                  onChange={(e) => set("mudurGorevBitisTarihi", e.target.value)}
                />
              </div>
            </div>

            {/* Mali Mühür */}
            <div>
              <SectionHeader>Mali Mühür</SectionHeader>
              <div className="space-y-2">
                {([1, 2, 3] as const).map((n) => (
                  <div key={n} className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-2 border border-slate-300 rounded-lg px-3 min-h-[44px]">
                      <CreditCard className="h-4 w-4 text-slate-400 shrink-0" />
                      <input
                        type="text"
                        placeholder="SN Numarası"
                        value={form[`maliMuhur${n}Sn` as keyof typeof form] as string}
                        onChange={(e) => set(`maliMuhur${n}Sn` as keyof typeof EMPTY_FORM, e.target.value as never)}
                        className="flex-1 text-sm bg-transparent outline-none placeholder-slate-400 text-slate-900"
                      />
                    </div>
                    <Input
                      label=""
                      type="date"
                      placeholder="gg.aa.yyyy"
                      value={form[`maliMuhur${n}Bitis` as keyof typeof form] as string}
                      onChange={(e) => set(`maliMuhur${n}Bitis` as keyof typeof EMPTY_FORM, e.target.value as never)}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Panel Giriş Ayarları */}
            <div>
              <SectionHeader>Panel Giriş Ayarları</SectionHeader>
              <div className="grid grid-cols-3 gap-6">
                <div>
                  <p className="text-xs font-medium text-slate-600 mb-2">Paneline Giriş Yapabilsin Mi?</p>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.panelGirisAktif}
                        onChange={(e) => set("panelGirisAktif", e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-slate-700">Evet</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!form.panelGirisAktif}
                        onChange={(e) => set("panelGirisAktif", !e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-slate-700">Hayır</span>
                    </label>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-600 mb-2">İki Adımlı Doğrulama Durumu</p>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.ikiAdimliDogrulama}
                        onChange={(e) => set("ikiAdimliDogrulama", e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-slate-700">Aktif</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!form.ikiAdimliDogrulama}
                        onChange={(e) => set("ikiAdimliDogrulama", !e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-slate-700">Pasif</span>
                    </label>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-600 mb-2">İki Adımlı Doğrulama Yöntemi</p>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.ikiAdimliYontem === "email"}
                        onChange={() => set("ikiAdimliYontem", "email")}
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-slate-700">E-Mail</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.ikiAdimliYontem === "sms"}
                        onChange={() => set("ikiAdimliYontem", "sms")}
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-slate-700">SMS</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Diğer Bilgiler */}
            <div>
              <SectionHeader>Diğer Bilgiler</SectionHeader>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Alt Mükellef{" "}
                    <span className="font-normal text-slate-400">(Seçili alt mükelleflerin paneline tek tuşla geçiş yapabilir)</span>
                  </label>
                  <select
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Alt Mükellefi Bulunmuyor</option>
                  </select>
                </div>
                <Input
                  label="Doğum Tarihi"
                  type="date"
                  value={form.dogumTarihi}
                  onChange={(e) => set("dogumTarihi", e.target.value)}
                />
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Sorumlu Yönetici(ler)</label>
                  <select
                    value={form.sorumluPersonelId}
                    onChange={(e) => set("sorumluPersonelId", e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">— Seçin —</option>
                    {sorumluOptions.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">e-TUYS</label>
                  <select
                    value={form.eTuys}
                    onChange={(e) => set("eTuys", e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {ETUYS_SECENEKLER.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <Input
                  label="Açılış Tarihi"
                  type="date"
                  value={form.acilisTarihi}
                  onChange={(e) => set("acilisTarihi", e.target.value)}
                />
                <Input
                  label="Kapanış Tarihi"
                  type="date"
                  value={form.kapanisTarihi}
                  onChange={(e) => set("kapanisTarihi", e.target.value)}
                />
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Beyanname Kontrol Listesi ve Beyanname İş Takibi sayfalarında açılış tarihinden önceki dönemler ve kapanış tarihinden sonraki dönemlerde sorumlu değil olarak görünür.
              </p>
              <div className="mt-3">
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Not</label>
                <textarea
                  rows={3}
                  value={form.not}
                  onChange={(e) => set("not", e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>
            </div>

            {/* Giriş mail + Kaydet */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.girisMailGonder}
                  onChange={(e) => set("girisMailGonder", e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-slate-700">
                  Giriş Bilgileri Mail Gönderilsin{" "}
                  <span className="text-slate-400 text-xs">(1. E-Posta alanındaki mail adresine gönderilir)</span>
                </span>
              </label>
              <div className="flex gap-2">
                <Button type="button" variant="secondary" onClick={onClose}>İptal</Button>
                <Button type="submit" loading={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  Kaydet
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ── Kurum Bilgileri ── */}
        {activeTab === "kurum" && (
          <div className="py-8 text-center text-slate-400 text-sm">
            Kurum bilgileri yakında eklenecek.
          </div>
        )}

        {/* ── Bankacılar ── */}
        {activeTab === "bankaci" && (
          <div className="py-8 text-center text-slate-400 text-sm">
            Bankacı bilgileri yakında eklenecek.
          </div>
        )}

        {/* ── Kullanıcılar ── */}
        {activeTab === "kullanici" && (
          <div className="py-8 text-center text-slate-400 text-sm">
            Kullanıcı bilgileri yakında eklenecek.
          </div>
        )}
      </form>
    </Modal>
  );
}
