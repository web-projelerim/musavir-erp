"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Eye, EyeOff, RefreshCw, ChevronDown, Mail, Phone, CreditCard } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { SecretInput } from "@/components/ui/SecretInput";
import { useToast } from "@/lib/context/ToastContext";
import { useAuth } from "@/lib/context/AuthContext";
import { parseFirestoreError } from "@/lib/utils/firebaseErrors";
import { isFirebaseConfigured } from "@/lib/firebase/client";
import { VERGI_DAIRESI_GRUPLARI } from "@/lib/constants/vergiDaireleri";
import { NACE_KODLARI } from "@/lib/data/nace";
import { toDateInputValue } from "@/lib/utils/format";
import { createMusteri, updateMusteri } from "@/lib/firebase/repositories";
import { authHeaders } from "@/lib/firebase/client";
import { POS_TURU_ETIKETLERI, ISTISNA_ETIKETLERI } from "@/lib/types";
import type { Musteri, User, PosTuru, MusteriIstisna } from "@/lib/types";

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
  { key: "muhsgk", label: "MuhSGK (Aylık)" },
  { key: "muhsgk3", label: "MuhSGK (3 Aylık)" },
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
  { value: "yuklu_aylik", label: "Yüklü — Aylık" },
  { value: "yuklu_3aylik", label: "Yüklü — 3 Aylık" },
  { value: "yuklu", label: "Yüklü (eski)" },
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
  nacKodlari: [] as { kod: string; aciklama: string; anaFaaliyet: boolean }[],
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
  sgkSicilNo: "",
  // Kurum bilgileri sekmesi
  kurumVergiDairesi: "",
  vergiDairesiKodu: "",
  sgkKullaniciAdi: "",
  sgkSifresi: "",
  gibKullaniciAdi: "",
  gibSifresi: "",
  ebildirgKullaniciAdi: "",
  ebildirgSifresi: "",
  edevletKullaniciAdi: "",
  edevletSifresi: "",
  // POS / Teknokent / İstisnalar
  posTuru: [] as PosTuru[],
  teknokentMukellef: false,
  teknokentAdi: "",
  teknokentBaslangic: "",
  istisnalar: [] as MusteriIstisna[],
  istisnaNotu: "",
};

type Tab = "mukellef" | "kurum" | "bankaci" | "kullanici";

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 mb-3">
      <span className="h-4 w-1.5 rounded-full bg-blue-500 shrink-0" />
      <span className="text-sm font-semibold text-slate-800 whitespace-nowrap">{children}</span>
      <span className="flex-1 h-px bg-gradient-to-r from-slate-200 to-transparent" />
    </div>
  );
}

function Segment({
  options,
  value,
  onChange,
}: {
  options: { v: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
      {options.map((o) => (
        <button
          key={o.v}
          type="button"
          onClick={() => onChange(o.v)}
          className={`px-3.5 py-1.5 rounded-md text-sm font-medium transition-colors ${
            value === o.v ? "bg-white text-blue-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
          }`}
        >
          {o.label}
        </button>
      ))}
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
  const aktif = value === "mukellef";
  return (
    <div className="relative inline-block w-full">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`appearance-none w-full rounded-lg pl-2.5 pr-7 py-1.5 text-xs font-semibold cursor-pointer border outline-none transition-colors ${
          aktif
            ? "bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100"
            : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100"
        }`}
      >
        {VERGI_TURU_SECENEKLER.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown
        className={`absolute right-1.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 pointer-events-none ${
          aktif ? "text-emerald-600" : "text-slate-400"
        }`}
      />
    </div>
  );
}

export function YeniMusteriModal({ open, onClose, onSuccess, musteri, kullanicilar = [] }: Props) {
  const toast = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [activeTab, setActiveTab] = useState<Tab>("mukellef");
  const [showSifre, setShowSifre] = useState(false);
  const [naceInput, setNaceInput] = useState("");

  const isEdit = Boolean(musteri);

  const sorumluOptions = useMemo(() => {
    return kullanicilar
      .filter((u) => u.aktif && u.rol === "musavir")
      .map((u) => ({
        value: u.id,
        label: `${u.ad} ${u.soyad} (Müşavir)`,
      }));
  }, [kullanicilar]);

  // Form RESET sadece modal açılır açılmaz (open: false→true) çalışmalı.
  // Aksi halde kullanicilar/musteri firestore subscription her güncellendiğinde
  // useEffect tetiklenir, kullanıcı yazdığı veriler ezilir (bug #4).
  const wasOpen = useRef(false);
  useEffect(() => {
    if (!open) {
      wasOpen.current = false;
      return;
    }
    if (wasOpen.current) return; // zaten açıktı; reset etme
    wasOpen.current = true;

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
        eDefterGecis: toDateInputValue(musteri.eDefterGecis),
        naceKodu: musteri.naceKodu ?? "",
        nacKodlari:
          musteri.nacKodlari && musteri.nacKodlari.length > 0
            ? musteri.nacKodlari
            : musteri.naceKodu
            ? [
                {
                  kod: musteri.naceKodu.split("–")[0].trim(),
                  aciklama: musteri.naceKodu.split("–").slice(1).join("–").trim(),
                  anaFaaliyet: true,
                },
              ]
            : [],
        mudurGorevBitisTarihi: toDateInputValue(musteri.mudurGorevBitisTarihi),
        maliMuhur1Sn: musteri.maliMuhurler?.[0]?.sn ?? "",
        maliMuhur1Bitis: toDateInputValue(musteri.maliMuhurler?.[0]?.bitisTarihi),
        maliMuhur2Sn: musteri.maliMuhurler?.[1]?.sn ?? "",
        maliMuhur2Bitis: toDateInputValue(musteri.maliMuhurler?.[1]?.bitisTarihi),
        maliMuhur3Sn: musteri.maliMuhurler?.[2]?.sn ?? "",
        maliMuhur3Bitis: toDateInputValue(musteri.maliMuhurler?.[2]?.bitisTarihi),
        panelGirisAktif: musteri.panelGirisAktif ?? true,
        ikiAdimliDogrulama: musteri.ikiAdimliDogrulama ?? false,
        ikiAdimliYontem: musteri.ikiAdimliYontem ?? "sms",
        dogumTarihi: toDateInputValue(musteri.dogumTarihi),
        acilisTarihi: toDateInputValue(musteri.acilisTarihi ?? musteri.kurulusTarihi),
        kapanisTarihi: toDateInputValue(musteri.kapanisTarihi),
        not: musteri.aciklama ?? "",
        girisMailGonder: musteri.girisMailGonder ?? true,
        sorumluPersonelId: eslesen?.id ?? musteri.sorumluPersonelId ?? "",
        varsayilanHizmetUcreti: musteri.varsayilanHizmetUcreti?.toString() ?? "",
        adres: musteri.adres ?? "",
        sifre: "",
        eTuys: "",
        sgkSicilNo: musteri.sgkSicilNo ?? "",
        // Kurum bilgileri (şifreler güvenlik için input'a yüklenmez; boş bırakırsa mevcut korunur)
        kurumVergiDairesi: musteri.kurumVergiDairesi ?? "",
        vergiDairesiKodu: musteri.vergiDairesiKodu ?? "",
        sgkKullaniciAdi: musteri.sgkKullaniciAdi ?? "",
        sgkSifresi: "",
        ebildirgKullaniciAdi: musteri.ebildirgKullaniciAdi ?? "",
        ebildirgSifresi: "",
        edevletKullaniciAdi: musteri.edevletKullaniciAdi ?? "",
        edevletSifresi: "",
        gibKullaniciAdi: musteri.gibIvdKullaniciAdi ?? "",
        gibSifresi: "",
        posTuru: musteri.posTuru ?? [],
        teknokentMukellef: musteri.teknokentMukellef ?? false,
        teknokentAdi: musteri.teknokentAdi ?? "",
        teknokentBaslangic: toDateInputValue(musteri.teknokentBaslangic),
        istisnalar: musteri.istisnalar ?? [],
        istisnaNotu: musteri.istisnaNotu ?? "",
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

  const togglePosTuru = (t: PosTuru) =>
    setForm((prev) => ({
      ...prev,
      posTuru: prev.posTuru.includes(t) ? prev.posTuru.filter((x) => x !== t) : [...prev.posTuru, t],
    }));

  const toggleIstisna = (t: MusteriIstisna) =>
    setForm((prev) => ({
      ...prev,
      istisnalar: prev.istisnalar.includes(t)
        ? prev.istisnalar.filter((x) => x !== t)
        : [...prev.istisnalar, t],
    }));

  // NACE: girilen metinden kod ekle ("62.01 – Bilgisayar programlama" veya sadece "62.01")
  const naceEkle = () => {
    const ham = naceInput.trim();
    if (!ham) return;
    const kod = ham.split("–")[0].split("-")[0].trim();
    const eslesen = NACE_KODLARI.find((n) => n.kod === kod);
    const aciklama = eslesen?.aciklama ?? ham.split("–").slice(1).join("–").trim();
    if (!kod) return;
    setForm((prev) => {
      if (prev.nacKodlari.some((n) => n.kod === kod)) return prev; // mükerrer engelle
      const ilk = prev.nacKodlari.length === 0;
      return {
        ...prev,
        nacKodlari: [...prev.nacKodlari, { kod, aciklama, anaFaaliyet: ilk }],
      };
    });
    setNaceInput("");
  };

  const naceSil = (kod: string) =>
    setForm((prev) => {
      const kalan = prev.nacKodlari.filter((n) => n.kod !== kod);
      // Silinen ana faaliyet ise ilk kalan kodu ana faaliyet yap
      if (kalan.length > 0 && !kalan.some((n) => n.anaFaaliyet)) kalan[0].anaFaaliyet = true;
      return { ...prev, nacKodlari: kalan };
    });

  const naceAnaFaaliyetYap = (kod: string) =>
    setForm((prev) => ({
      ...prev,
      nacKodlari: prev.nacKodlari.map((n) => ({ ...n, anaFaaliyet: n.kod === kod })),
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

      // Kurum kimlik bilgilerini sunucuda AES-256-GCM ile şifrele (plaintext Firestore'a yazılmaz)
      let encryptedCreds: Record<string, string> = {};
      const credPlain = {
        sgkSifresi: form.sgkSifresi,
        ebildirgSifresi: form.ebildirgSifresi,
        edevletSifresi: form.edevletSifresi,
        gibSifresi: form.gibSifresi,
      };
      const hasAnyCred = Object.values(credPlain).some((v) => v && v.trim());
      if (hasAnyCred) {
        try {
          const res = await fetch("/api/secrets/encrypt", {
            method: "POST",
            headers: { ...await authHeaders(), "content-type": "application/json" },
            body: JSON.stringify({ fields: credPlain }),
          });
          if (res.ok) {
            const data = await res.json();
            encryptedCreds = data.encrypted ?? {};
          } else {
            const err = await res.json().catch(() => ({}));
            console.error("[Mükellef] Credential şifreleme başarısız:", err);
            toast.warning("Şifreler şifrelenemedi", "SECRET_KEY env değişkenini kontrol edin; şifreler kaydedilmedi");
          }
        } catch (err) {
          console.error("[Mükellef] Credential şifreleme istisnası:", err);
          toast.warning("Şifreler şifrelenemedi", "Bağlantı hatası; şifreler kaydedilmedi");
        }
      }

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
        naceKodu: (() => {
          const ana = form.nacKodlari.find((n) => n.anaFaaliyet) ?? form.nacKodlari[0];
          return ana ? `${ana.kod} – ${ana.aciklama}`.trim() : form.naceKodu || undefined;
        })(),
        nacKodlari: form.nacKodlari.length > 0 ? form.nacKodlari : undefined,
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
        // Kurum bilgileri — şifreler şifreli formatta saklanır (plaintext asla Firestore'a girmez)
        kurumVergiDairesi: form.kurumVergiDairesi || undefined,
        vergiDairesiKodu: form.vergiDairesiKodu || undefined,
        sgkKullaniciAdi: form.sgkKullaniciAdi || undefined,
        sgkSifresi: encryptedCreds.sgkSifresi || undefined,
        ebildirgKullaniciAdi: form.ebildirgKullaniciAdi || undefined,
        ebildirgSifresi: encryptedCreds.ebildirgSifresi || undefined,
        edevletKullaniciAdi: form.edevletKullaniciAdi || undefined,
        edevletSifresi: encryptedCreds.edevletSifresi || undefined,
        gibIvdKullaniciAdi: form.gibKullaniciAdi || undefined,
        // GİB tebligat sync bu alanı okur — gibSifresi'ne yazmak mükellefi sync dışında bırakıyordu
        gibEncryptedIvdSifre: encryptedCreds.gibSifresi || undefined,
        // POS / Teknokent / İstisnalar
        posTuru: form.posTuru.length > 0 ? form.posTuru : undefined,
        teknokentMukellef: form.teknokentMukellef || undefined,
        teknokentAdi: form.teknokentAdi || undefined,
        teknokentBaslangic: form.teknokentBaslangic || undefined,
        istisnalar: form.istisnalar.length > 0 ? form.istisnalar : undefined,
        istisnaNotu: form.istisnaNotu || undefined,
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
            sgkSicilNo: form.sgkSicilNo || undefined,
            ...extendedFields,
          });
        } else {
          await createMusteri({
            ofisId: user?.ofisId,
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
            sgkSicilNo: form.sgkSicilNo || undefined,
            ...extendedFields,
          });
        }
      } else {
        await new Promise((r) => setTimeout(r, 800));
      }

      toast.success(
        isEdit ? "Mükellef güncellendi" : "Mükellef oluşturuldu",
        `${form.firmaAdi} başarıyla ${isEdit ? "güncellendi" : "sisteme eklendi"}`
      );
      onClose();
      onSuccess?.();
    } catch (error) {
      console.error(error);
      toast.error("Mükellef kaydedilemedi", parseFirestoreError(error));
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                <input
                  list="vergi-dairesi-list"
                  value={form.vergiDairesi}
                  onChange={(e) => set("vergiDairesi", e.target.value)}
                  placeholder="İl veya vergi dairesi adı yazın (ör: Ankara, Bornova, Maltepe)..."
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {/* value="İl - Daire" formatı kullanıcı il yazınca filtrelemeye olanak verir */}
                <datalist id="vergi-dairesi-list">
                  {VERGI_DAIRESI_GRUPLARI.flatMap(({ grup, daireler }) =>
                    daireler.map((d) => (
                      <option key={`${grup}-${d}`} value={`${grup} - ${d}`} />
                    ))
                  )}
                  <option value="Diğer" />
                </datalist>
              </div>
              <Input
                label="SGK İşyeri Sicil No"
                value={form.sgkSicilNo}
                onChange={(e) => set("sgkSicilNo", e.target.value)}
                placeholder="SGK sicil numarası (e-Bildirge sync için)"
              />
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
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
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
              <div className="flex items-center gap-2.5 mb-3">
                <span className="h-4 w-1.5 rounded-full bg-blue-500 shrink-0" />
                <span className="text-sm font-semibold text-slate-800 whitespace-nowrap">Grup Seçimi</span>
                <span className="flex-1 h-px bg-gradient-to-r from-slate-200 to-transparent" />
                <button type="button" className="text-xs text-blue-600 hover:underline shrink-0">
                  + Yeni Grup
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {GRUPLAR.map((g) => {
                  const secili = form.gruplar.includes(g);
                  return (
                    <button
                      key={g}
                      type="button"
                      onClick={() => toggleGrup(g)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                        secili
                          ? "bg-blue-50 text-blue-700 border-blue-300"
                          : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      {g}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* E-Defter */}
            <div>
              <SectionHeader>E-Defter</SectionHeader>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">E-Defter</label>
                  <div className="relative">
                    <select
                      value={form.eDefter}
                      onChange={(e) => set("eDefter", e.target.value)}
                      className={`appearance-none w-full rounded-lg pl-3 pr-8 py-2 text-sm font-medium cursor-pointer border outline-none min-h-[44px] transition-colors focus:ring-2 focus:ring-blue-500 ${
                        form.eDefter === "sorumlu_degil"
                          ? "bg-slate-50 text-slate-500 border-slate-200"
                          : "bg-emerald-50 text-emerald-700 border-emerald-300"
                      }`}
                    >
                      {EDEFTER_SECENEKLER.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                    <ChevronDown className={`absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none ${form.eDefter === "sorumlu_degil" ? "text-slate-400" : "text-emerald-600"}`} />
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <SectionHeader>Nace Kodları</SectionHeader>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Faaliyet Kodu Ekle{" "}
                  <span className="font-normal text-slate-400">(birden fazla eklenebilir)</span>
                </label>
                {/* Arama destekli NACE combobox + Ekle */}
                <div className="flex gap-2">
                  <input
                    list="nace-list"
                    value={naceInput}
                    onChange={(e) => setNaceInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        naceEkle();
                      }
                    }}
                    placeholder="Kod veya faaliyet adı yazın (ör: 62.01 veya yazılım)"
                    className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <Button type="button" variant="outline" onClick={naceEkle} className="shrink-0">
                    Ekle
                  </Button>
                </div>
                <datalist id="nace-list">
                  {NACE_KODLARI.map((n) => (
                    <option key={n.kod} value={`${n.kod} – ${n.aciklama}`} />
                  ))}
                </datalist>
                {/* Eklenen kodlar listesi */}
                {form.nacKodlari.length > 0 && (
                  <ul className="mt-2 space-y-1.5">
                    {form.nacKodlari.map((n) => (
                      <li
                        key={n.kod}
                        className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs ${
                          n.anaFaaliyet ? "border-emerald-300 bg-emerald-50" : "border-slate-200 bg-white"
                        }`}
                      >
                        <span className="font-mono font-semibold text-slate-700 shrink-0">{n.kod}</span>
                        <span className="flex-1 min-w-0 truncate text-slate-500">{n.aciklama}</span>
                        <label className="flex items-center gap-1 shrink-0 cursor-pointer" title="Ana faaliyet">
                          <input
                            type="radio"
                            name="anaFaaliyet"
                            checked={n.anaFaaliyet}
                            onChange={() => naceAnaFaaliyetYap(n.kod)}
                            className="h-3.5 w-3.5 text-emerald-600 focus:ring-emerald-500"
                          />
                          <span className={n.anaFaaliyet ? "text-emerald-700 font-medium" : "text-slate-400"}>Ana</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => naceSil(n.kod)}
                          className="shrink-0 text-slate-400 hover:text-red-600"
                          title="Kaldır"
                        >
                          ✕
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
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

            {/* POS Türü */}
            <div>
              <SectionHeader>POS Türü</SectionHeader>
              <div className="flex flex-wrap gap-2">
                {POS_TURU_ETIKETLERI.map((p) => {
                  const secili = form.posTuru.includes(p.value);
                  return (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => togglePosTuru(p.value)}
                      title={p.aciklama}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                        secili
                          ? "bg-blue-50 text-blue-700 border-blue-300"
                          : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
              <p className="mt-1.5 text-xs text-slate-400">
                Fiziksel POS Z raporu ve sanal POS kredi kartı satışları &quot;POS / Z Raporu&quot; sayfasında takip edilir.
              </p>
            </div>

            {/* Teknokent */}
            <div>
              <SectionHeader>Teknokent Mükellefiyeti</SectionHeader>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                <div>
                  <p className="text-xs font-medium text-slate-600 mb-2">Teknokent Mükellefi mi?</p>
                  <Segment
                    value={form.teknokentMukellef ? "e" : "h"}
                    onChange={(v) => set("teknokentMukellef", v === "e")}
                    options={[{ v: "e", label: "Evet" }, { v: "h", label: "Hayır" }]}
                  />
                </div>
                <Input
                  label="Teknokent Adı"
                  value={form.teknokentAdi}
                  onChange={(e) => set("teknokentAdi", e.target.value)}
                  placeholder="ör: ODTÜ Teknokent"
                  disabled={!form.teknokentMukellef}
                />
                <Input
                  label="Başlangıç Tarihi"
                  type="date"
                  value={form.teknokentBaslangic}
                  onChange={(e) => set("teknokentBaslangic", e.target.value)}
                  disabled={!form.teknokentMukellef}
                />
              </div>
            </div>

            {/* Vergisel İstisnalar */}
            <div>
              <SectionHeader>Vergisel İstisnalar / Teşvikler</SectionHeader>
              <div className="flex flex-wrap gap-2">
                {ISTISNA_ETIKETLERI.map((i) => {
                  const secili = form.istisnalar.includes(i.value);
                  return (
                    <button
                      key={i.value}
                      type="button"
                      onClick={() => toggleIstisna(i.value)}
                      title={i.aciklama}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                        secili
                          ? "bg-amber-50 text-amber-700 border-amber-300"
                          : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      {i.label}
                    </button>
                  );
                })}
              </div>
              {form.istisnalar.length > 0 && (
                <div className="mt-2.5">
                  <label className="block text-xs font-medium text-slate-600 mb-1">İstisna Notu</label>
                  <input
                    type="text"
                    value={form.istisnaNotu}
                    onChange={(e) => set("istisnaNotu", e.target.value)}
                    placeholder="İstisna ile ilgili açıklama (ör: genç girişimci başlangıç yılı)"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}
              <p className="mt-1.5 text-xs text-slate-400">
                İstisna işaretli mükellefler için beyanname ekranlarında uyarı rozeti gösterilir.
              </p>
            </div>

            {/* Mali Mühür */}
            <div>
              <SectionHeader>Mali Mühür</SectionHeader>
              <div className="space-y-2">
                {([1, 2, 3] as const).map((n) => (
                  <div key={n} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs font-medium text-slate-600 mb-2">Paneline Giriş Yapabilsin Mi?</p>
                  <Segment
                    value={form.panelGirisAktif ? "e" : "h"}
                    onChange={(v) => set("panelGirisAktif", v === "e")}
                    options={[{ v: "e", label: "Evet" }, { v: "h", label: "Hayır" }]}
                  />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-600 mb-2">İki Adımlı Doğrulama Durumu</p>
                  <Segment
                    value={form.ikiAdimliDogrulama ? "a" : "p"}
                    onChange={(v) => set("ikiAdimliDogrulama", v === "a")}
                    options={[{ v: "a", label: "Aktif" }, { v: "p", label: "Pasif" }]}
                  />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-600 mb-2">İki Adımlı Doğrulama Yöntemi</p>
                  <Segment
                    value={form.ikiAdimliYontem}
                    onChange={(v) => set("ikiAdimliYontem", v)}
                    options={[{ v: "email", label: "E-Mail" }, { v: "sms", label: "SMS" }]}
                  />
                </div>
              </div>
            </div>

            {/* Diğer Bilgiler */}
            <div>
              <SectionHeader>Diğer Bilgiler</SectionHeader>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
          <div className="space-y-5">
            <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-2.5 text-sm text-amber-800">
              🔒 Şifreler AES-256-GCM ile şifrelenerek saklanır. Düzenleme modunda şifre alanları boş gelir;
              yeni şifre girmezseniz mevcut şifre korunur. <strong>SECRET_KEY env değişkeni</strong> tanımlı olmalı.
            </div>

            {/* Vergi Dairesi */}
            <div>
              <SectionHeader>Vergi Dairesi & Mükellefiyet</SectionHeader>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Bağlı Olduğu Vergi Dairesi (Adı)</label>
                  <input
                    list="vergi-dairesi-list"
                    value={form.kurumVergiDairesi}
                    onChange={(e) => set("kurumVergiDairesi", e.target.value)}
                    placeholder="İl veya vergi dairesi adı yazın (ör: Ankara, Bornova)..."
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <Input
                  label="Vergi Dairesi Kodu"
                  value={form.vergiDairesiKodu}
                  onChange={(e) => set("vergiDairesiKodu", e.target.value)}
                  placeholder="ör: 006020"
                />
              </div>
            </div>

            {/* GİB / e-Beyanname */}
            <div>
              <SectionHeader>GİB / e-Beyanname Girişi</SectionHeader>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="GİB Kullanıcı Kodu"
                  value={form.gibKullaniciAdi}
                  onChange={(e) => set("gibKullaniciAdi", e.target.value)}
                  placeholder="İVD kullanıcı kodu"
                />
                <SecretInput
                  label="GİB Şifre"
                  value={form.gibSifresi}
                  onChange={(v) => set("gibSifresi", v)}
                  placeholder="İVD şifresi"
                />
              </div>
            </div>

            {/* SGK / e-Bildirge */}
            <div>
              <SectionHeader>SGK / e-Bildirge Girişi</SectionHeader>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="SGK Kullanıcı Adı"
                  value={form.sgkKullaniciAdi}
                  onChange={(e) => set("sgkKullaniciAdi", e.target.value)}
                  placeholder="SGK işveren kullanıcı kodu"
                />
                <SecretInput
                  label="SGK Şifre"
                  value={form.sgkSifresi}
                  onChange={(v) => set("sgkSifresi", v)}
                  placeholder="SGK şifresi"
                />
                <Input
                  label="e-Bildirge Kullanıcı Adı"
                  value={form.ebildirgKullaniciAdi}
                  onChange={(e) => set("ebildirgKullaniciAdi", e.target.value)}
                  placeholder="(SGK ile aynıysa boş bırakın)"
                />
                <SecretInput
                  label="e-Bildirge Şifre"
                  value={form.ebildirgSifresi}
                  onChange={(v) => set("ebildirgSifresi", v)}
                />
              </div>
            </div>

            {/* e-Devlet */}
            <div>
              <SectionHeader>e-Devlet (Opsiyonel)</SectionHeader>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="e-Devlet TC No"
                  value={form.edevletKullaniciAdi}
                  onChange={(e) => set("edevletKullaniciAdi", e.target.value)}
                  placeholder="TC kimlik no"
                />
                <SecretInput
                  label="e-Devlet Şifre"
                  value={form.edevletSifresi}
                  onChange={(v) => set("edevletSifresi", v)}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <Button type="button" variant="secondary" onClick={onClose}>İptal</Button>
              <Button type="submit" loading={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                Kaydet
              </Button>
            </div>
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
