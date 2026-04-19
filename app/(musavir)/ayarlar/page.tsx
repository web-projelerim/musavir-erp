"use client";

import { useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/lib/context/ToastContext";
import { GIB, gibMockMu } from "@/lib/integrations/gib";
import { Luca, lucaMockMu } from "@/lib/integrations/luca";
import {
  Users, Bell, Link2, Shield, Sliders, Plus,
  CheckCircle2, XCircle, RefreshCw, AlertCircle, Save,
} from "lucide-react";

const TABS = [
  { id: "kullanicilar", label: "Kullanıcılar", icon: Users },
  { id: "bildirimler",  label: "Bildirimler",  icon: Bell  },
  { id: "entegrasyon",  label: "Entegrasyonlar", icon: Link2 },
  { id: "guvenlik",     label: "Güvenlik",     icon: Shield },
  { id: "sistem",       label: "Sistem",       icon: Sliders },
];

const MOCK_KULLANICILAR = [
  { id: "u1", ad: "Ali Müşavir",   email: "ali@musavir.com",   rol: "musavir",  aktif: true },
  { id: "u2", ad: "Selin Kaya",    email: "selin@musavir.com", rol: "personel", aktif: true },
  { id: "u3", ad: "Murat Çelik",   email: "murat@musavir.com", rol: "personel", aktif: true },
  { id: "u4", ad: "Zeynep Yıldız", email: "zeynep@musavir.com",rol: "personel", aktif: false },
];

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: 12, fontWeight: 600, color: "#111827", marginBottom: 16 }}>{children}</p>
  );
}

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button onClick={onChange}
      className="relative rounded-full transition-colors flex-shrink-0"
      style={{ width: 36, height: 20, background: checked ? "#2563eb" : "#e5e7eb" }}>
      <span className="absolute rounded-full bg-white transition-transform"
        style={{ width: 16, height: 16, top: 2, left: checked ? 18 : 2, transition: "left 150ms" }} />
    </button>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 11, fontWeight: 500, color: "#374151", marginBottom: 5 }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function TextInput({ value, onChange, placeholder, type = "text" }: {
  value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string;
}) {
  return (
    <input type={type} value={value} onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{ width: "100%", padding: "8px 10px", fontSize: 12, color: "#374151",
        background: "#fff", border: "1px solid #e5e7eb", borderRadius: 6, outline: "none" }}
      onFocus={(e) => e.target.style.borderColor = "#3b82f6"}
      onBlur={(e) => e.target.style.borderColor = "#e5e7eb"}
    />
  );
}

function Section({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-md p-5" style={{ border: "1px solid #e5e7eb" }}>
      {children}
    </div>
  );
}

// ─── Entegrasyon alt bileşeni ─────────────────────────────────
interface IntegrationCardProps {
  title: string;
  desc: string;
  isMock: boolean;
  children?: React.ReactNode;
  onTest: () => Promise<void>;
  onSave: () => void;
}

function IntegrationCard({ title, desc, isMock, children, onTest, onSave }: IntegrationCardProps) {
  const [testing, setTesting] = useState(false);
  const [status, setStatus] = useState<"idle" | "ok" | "fail">("idle");
  const toast = useToast();

  const test = async () => {
    setTesting(true);
    setStatus("idle");
    try {
      await onTest();
      setStatus("ok");
      toast.success(`${title} bağlantısı başarılı!`);
    } catch (e: unknown) {
      setStatus("fail");
      toast.error(`${title} bağlantı hatası: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setTesting(false);
    }
  };

  return (
    <Section>
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <p style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{title}</p>
          <p style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>{desc}</p>
        </div>
        <div className="flex items-center gap-2">
          {status === "ok"   && <CheckCircle2 style={{ width: 16, height: 16, color: "#16a34a" }} />}
          {status === "fail" && <XCircle style={{ width: 16, height: 16, color: "#dc2626" }} />}
          {isMock && <Badge variant="warning">Test Modu</Badge>}
          {!isMock && status === "idle" && <Badge variant="success" dot>Yapılandırıldı</Badge>}
        </div>
      </div>

      {isMock && (
        <div className="mb-4 flex items-start gap-2 rounded px-3 py-2.5"
          style={{ background: "#fef9c3", border: "1px solid #fde047", fontSize: 11, color: "#713f12" }}>
          <AlertCircle style={{ width: 13, height: 13, flexShrink: 0, marginTop: 1 }} />
          <span>API anahtarları <code style={{ fontFamily: "monospace" }}>.env.local</code> dosyasına girilmediği için şu an <strong>test modunda</strong> çalışıyor. Gerçek entegrasyon için aşağıdaki bilgileri doldurun.</span>
        </div>
      )}

      <div className="space-y-3">
        {children}
      </div>

      <div className="flex items-center gap-2 mt-4" style={{ paddingTop: 12, borderTop: "1px solid #f3f4f6" }}>
        <Button size="sm" variant="outline" loading={testing}
          icon={<RefreshCw style={{ width: 11, height: 11 }} />}
          onClick={test}>
          Bağlantıyı Test Et
        </Button>
        <Button size="sm" icon={<Save style={{ width: 11, height: 11 }} />} onClick={() => {
          onSave();
          toast.success("Ayarlar kaydedildi.");
        }}>
          Kaydet
        </Button>
      </div>
    </Section>
  );
}

export default function AyarlarPage() {
  const [activeTab, setActiveTab] = useState("kullanicilar");
  const toast = useToast();

  // GİB state
  const [gibApiKey, setGibApiKey] = useState("");
  const [gibBaseUrl, setGibBaseUrl] = useState("https://ebeyanname.gib.gov.tr/api/v1");

  // Luca state
  const [lucaApiKey, setLucaApiKey] = useState("");
  const [lucaBaseUrl, setLucaBaseUrl] = useState("https://api.luca.com.tr/v1");
  const [lucaCompanyCode, setLucaCompanyCode] = useState("");

  // Bildirimler state
  const [notifs, setNotifs] = useState({
    beyanname: true,
    tebligat: true,
    gorev: true,
    rapor: true,
    tahsilat: false,
    risk: true,
  });

  return (
    <div>
      <PageHeader title="Ayarlar" subtitle="Sistem, kullanıcı ve entegrasyon yapılandırması" />

      <div className="flex gap-5">
        {/* Left nav */}
        <nav className="flex-shrink-0" style={{ width: 180 }}>
          <div className="bg-white rounded-md overflow-hidden" style={{ border: "1px solid #e5e7eb" }}>
            {TABS.map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors"
                  style={{ background: active ? "#eff6ff" : undefined,
                    borderLeft: active ? "2px solid #2563eb" : "2px solid transparent",
                    fontSize: 12, fontWeight: active ? 500 : 400,
                    color: active ? "#1d4ed8" : "#6b7280" }}>
                  <tab.icon style={{ width: 13, height: 13, flexShrink: 0,
                    color: active ? "#2563eb" : "#9ca3af" }} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Content */}
        <div className="flex-1 space-y-4 min-w-0">

          {/* Kullanıcılar */}
          {activeTab === "kullanicilar" && (
            <>
              <Section>
                <div className="flex items-center justify-between mb-4">
                  <SectionTitle>Kullanıcılar</SectionTitle>
                  <Button size="sm" icon={<Plus style={{ width: 11, height: 11 }} />}>
                    Kullanıcı Ekle
                  </Button>
                </div>
                <div>
                  {MOCK_KULLANICILAR.map((u, i) => (
                    <div key={u.id} className="flex items-center justify-between py-3"
                      style={{ borderBottom: i < MOCK_KULLANICILAR.length - 1 ? "1px solid #f9fafb" : "none" }}>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center rounded-full font-semibold flex-shrink-0"
                          style={{ width: 30, height: 30, background: "#eff6ff",
                            color: "#1d4ed8", fontSize: 11 }}>
                          {u.ad.split(" ").map((n) => n[0]).join("")}
                        </div>
                        <div>
                          <p style={{ fontSize: 12, fontWeight: 500, color: "#374151" }}>{u.ad}</p>
                          <p style={{ fontSize: 11, color: "#9ca3af" }}>{u.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={u.rol === "musavir" ? "info" : "neutral"}>
                          {u.rol === "musavir" ? "Müşavir" : "Personel"}
                        </Badge>
                        <Badge variant={u.aktif ? "success" : "neutral"}>
                          {u.aktif ? "Aktif" : "Pasif"}
                        </Badge>
                        <Button variant="ghost" size="sm">Düzenle</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </Section>

              <Section>
                <SectionTitle>Rol Yetkileri</SectionTitle>
                <div className="overflow-x-auto">
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                        <th style={{ textAlign: "left", padding: "6px 8px", color: "#6b7280", fontWeight: 500 }}>Yetki</th>
                        {["Müşavir", "Personel", "Mükellef"].map((r) => (
                          <th key={r} style={{ textAlign: "center", padding: "6px 8px", color: "#6b7280", fontWeight: 500 }}>{r}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        ["Tüm müşterileri gör",       true, false, false],
                        ["Müşteri oluştur/düzenle",    true, false, false],
                        ["Görev oluştur/ata",          true, true,  false],
                        ["Rapor üret ve gönder",       true, true,  false],
                        ["Toplu WhatsApp gönderimi",   true, false, false],
                        ["Kendi müşterilerini görür",  true, true,  false],
                        ["Mükellef portali erişimi",   false,false, true ],
                        ["Sistem ayarlarını yönet",    true, false, false],
                      ].map(([label, m, p, mk]) => (
                        <tr key={String(label)} style={{ borderBottom: "1px solid #f9fafb" }}>
                          <td style={{ padding: "7px 8px", color: "#374151" }}>{label}</td>
                          {[m, p, mk].map((v, i) => (
                            <td key={i} style={{ textAlign: "center", padding: "7px 8px" }}>
                              {v
                                ? <CheckCircle2 style={{ width: 13, height: 13, color: "#16a34a", display: "inline" }} />
                                : <span style={{ color: "#d1d5db", fontSize: 14 }}>—</span>
                              }
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Section>
            </>
          )}

          {/* Bildirimler */}
          {activeTab === "bildirimler" && (
            <Section>
              <SectionTitle>Bildirim Tercihleri</SectionTitle>
              <div>
                {([
                  { key: "beyanname", label: "Yaklaşan beyanname hatırlatması", desc: "Son tarihten 5 gün önce uyarı" },
                  { key: "tebligat",  label: "Yeni tebligat bildirimi",          desc: "GİB'den yeni tebligat alındığında" },
                  { key: "gorev",     label: "Görev atama bildirimi",            desc: "Yeni görev atandığında" },
                  { key: "rapor",     label: "Rapor hazırlandı",                 desc: "Rapor üretimi tamamlandığında" },
                  { key: "tahsilat",  label: "Tahsilat hatırlatması",            desc: "Vade günü yaklaştığında" },
                  { key: "risk",      label: "Risk skoru artışı",                desc: "Müşteri riski arttığında" },
                ] as { key: keyof typeof notifs; label: string; desc: string }[]).map(({ key, label, desc }, i, arr) => (
                  <div key={key} className="flex items-center justify-between py-3"
                    style={{ borderBottom: i < arr.length - 1 ? "1px solid #f9fafb" : "none" }}>
                    <div>
                      <p style={{ fontSize: 12, fontWeight: 500, color: "#374151" }}>{label}</p>
                      <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>{desc}</p>
                    </div>
                    <ToggleSwitch checked={notifs[key]}
                      onChange={() => setNotifs((p) => ({ ...p, [key]: !p[key] }))} />
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 16, paddingTop: 12, borderTop: "1px solid #f3f4f6" }}>
                <Button size="sm" onClick={() => toast.success("Bildirim tercihleri kaydedildi.")}>
                  Kaydet
                </Button>
              </div>
            </Section>
          )}

          {/* Entegrasyonlar */}
          {activeTab === "entegrasyon" && (
            <>
              <IntegrationCard
                title="GİB — Gelir İdaresi Başkanlığı"
                desc="E-tebligat, beyanname durumu ve vergi borcu sorgulama"
                isMock={gibMockMu()}
                onTest={async () => {
                  await GIB.mukellefSorgula("1234567890");
                }}
                onSave={() => {}}
              >
                <FormField label="API Base URL">
                  <TextInput value={gibBaseUrl} onChange={setGibBaseUrl}
                    placeholder="https://ebeyanname.gib.gov.tr/api/v1" />
                </FormField>
                <FormField label="API Anahtarı">
                  <TextInput value={gibApiKey} onChange={setGibApiKey}
                    type="password" placeholder="GIB_API_KEY" />
                </FormField>
                <div className="text-xs rounded px-3 py-2"
                  style={{ background: "#f8fafc", border: "1px solid #e5e7eb", color: "#6b7280" }}>
                  <strong style={{ color: "#374151" }}>Mevcut GİB servisleri:</strong>{" "}
                  Mükellef sorgulama · Beyanname geçmişi · Tebligat listesi · Vergi borcu sorgulama · PDF indirme
                </div>
              </IntegrationCard>

              <IntegrationCard
                title="Luca — Logo Muhasebe"
                desc="Müşteri listesi, hesap hareketleri, gelir-gider ve KDV2 matrahı"
                isMock={lucaMockMu()}
                onTest={async () => {
                  await Luca.musteriKodlariniGetir();
                }}
                onSave={() => {}}
              >
                <FormField label="API Base URL">
                  <TextInput value={lucaBaseUrl} onChange={setLucaBaseUrl}
                    placeholder="https://api.luca.com.tr/v1" />
                </FormField>
                <FormField label="API Anahtarı">
                  <TextInput value={lucaApiKey} onChange={setLucaApiKey}
                    type="password" placeholder="LUCA_API_KEY" />
                </FormField>
                <FormField label="Şirket Kodu">
                  <TextInput value={lucaCompanyCode} onChange={setLucaCompanyCode}
                    placeholder="LUCA_COMPANY_CODE" />
                </FormField>
                <div className="text-xs rounded px-3 py-2"
                  style={{ background: "#f8fafc", border: "1px solid #e5e7eb", color: "#6b7280" }}>
                  <strong style={{ color: "#374151" }}>Mevcut Luca servisleri:</strong>{" "}
                  Müşteri kodları · Hesap hareketleri · Gelir-gider özeti · Fatura listesi · Mizan · KDV2 matrahı
                </div>
              </IntegrationCard>

              <Section>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>WhatsApp Business API</p>
                    <p style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>
                      Toplu rapor gönderimi ve müşteri bildirimleri
                    </p>
                    <Badge variant="neutral" className="mt-2">Yakında</Badge>
                  </div>
                  <Button size="sm" variant="outline" disabled>Yapılandır</Button>
                </div>
              </Section>
            </>
          )}

          {/* Güvenlik */}
          {activeTab === "guvenlik" && (
            <div className="space-y-4">
              <Section>
                <SectionTitle>Şifre Değiştir</SectionTitle>
                <div className="space-y-3" style={{ maxWidth: 320 }}>
                  <FormField label="Mevcut Şifre">
                    <TextInput value="" onChange={() => {}} type="password" placeholder="••••••••" />
                  </FormField>
                  <FormField label="Yeni Şifre">
                    <TextInput value="" onChange={() => {}} type="password" placeholder="••••••••" />
                  </FormField>
                  <FormField label="Şifre Tekrar">
                    <TextInput value="" onChange={() => {}} type="password" placeholder="••••••••" />
                  </FormField>
                  <Button size="sm" onClick={() => toast.success("Şifre güncellendi.")}>
                    Şifreyi Güncelle
                  </Button>
                </div>
              </Section>
              <Section>
                <SectionTitle>Oturum Güvenliği</SectionTitle>
                <div>
                  {[
                    ["Oturum zaman aşımı", "30 dakika"],
                    ["İki faktörlü doğrulama", "Devre dışı"],
                    ["Son giriş", "14 Temmuz 2024, 09:30"],
                    ["Firebase Auth", "Aktif"],
                  ].map(([label, value], i) => (
                    <div key={String(label)} className="flex items-center justify-between py-2.5"
                      style={{ borderBottom: i < 3 ? "1px solid #f9fafb" : "none" }}>
                      <span style={{ fontSize: 12, color: "#6b7280" }}>{label}</span>
                      <span style={{ fontSize: 12, fontWeight: 500, color: "#374151" }}>{value}</span>
                    </div>
                  ))}
                </div>
              </Section>
            </div>
          )}

          {/* Sistem */}
          {activeTab === "sistem" && (
            <Section>
              <SectionTitle>Genel Tercihler</SectionTitle>
              <div className="space-y-3" style={{ maxWidth: 360 }}>
                <FormField label="Ofis Adı">
                  <TextInput value="Müşavir Ofisi A.Ş." onChange={() => {}} />
                </FormField>
                <FormField label="Vergi Dairesi">
                  <TextInput value="Bağcılar VD" onChange={() => {}} />
                </FormField>
                <FormField label="Zaman Dilimi">
                  <select style={{ width: "100%", padding: "8px 10px", fontSize: 12,
                    border: "1px solid #e5e7eb", borderRadius: 6, outline: "none",
                    background: "#fff", color: "#374151" }}>
                    <option>Türkiye (UTC+3)</option>
                  </select>
                </FormField>
                <FormField label="Varsayılan Beyanname Hatırlatma Süresi">
                  <select style={{ width: "100%", padding: "8px 10px", fontSize: 12,
                    border: "1px solid #e5e7eb", borderRadius: 6, outline: "none",
                    background: "#fff", color: "#374151" }}>
                    <option>5 gün önce</option>
                    <option>7 gün önce</option>
                    <option>10 gün önce</option>
                  </select>
                </FormField>
                <Button size="sm" onClick={() => toast.success("Sistem tercihleri kaydedildi.")}>
                  Kaydet
                </Button>
              </div>
            </Section>
          )}
        </div>
      </div>
    </div>
  );
}
