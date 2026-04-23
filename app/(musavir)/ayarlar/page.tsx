"use client";

import { useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Table, TableBody, TableCell, TableEmpty, TableHead, TableHeadCell, TableRow } from "@/components/ui/Table";
import { Activity, Users, Bell, Link2, Shield, Sliders, Plus } from "lucide-react";
import { DavetModal } from "@/components/modals/DavetModal";
import { useAppData } from "@/lib/hooks/useAppData";
import { useAuditLog } from "@/lib/hooks/useAuditLog";
import { useToast } from "@/lib/context/ToastContext";
import { isFirebaseConfigured } from "@/lib/firebase/client";
import { seedFirebaseMockData } from "@/lib/firebase/seed";
import { formatTarih } from "@/lib/utils/format";
import type { AuditAction } from "@/lib/types";

const TABS = [
  { id: "kullanicilar", label: "Kullanıcılar & Roller", icon: Users },
  { id: "bildirimler", label: "Bildirimler", icon: Bell },
  { id: "entegrasyon", label: "Entegrasyonlar", icon: Link2 },
  { id: "guvenlik", label: "Güvenlik", icon: Shield },
  { id: "denetim", label: "Denetim Kaydi", icon: Activity },
  { id: "sistem", label: "Sistem Tercihleri", icon: Sliders },
];

const ROL_LABELS: Record<string, string> = {
  musavir: "Mali Müşavir",
  personel: "Personel",
  mukellef: "Mükellef",
};

const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  create: "Olusturma",
  update: "Guncelleme",
  delete: "Silme",
  status_change: "Durum",
  upload: "Yukleme",
  send: "Gonderim",
  seed: "Seed",
  import: "Import",
  invite: "Davet",
  match: "Eslesme",
  sync: "Sync",
  summarize: "Ozet",
};

function auditVariant(action: AuditAction) {
  if (action === "delete") return "danger";
  if (action === "match" || action === "import") return "info";
  if (action === "invite" || action === "sync" || action === "summarize") return "warning";
  if (action === "status_change") return "warning";
  if (action === "create" || action === "upload") return "success";
  if (action === "send") return "info";
  return "neutral";
}

export default function AyarlarPage() {
  const toast = useToast();
  const logAudit = useAuditLog();
  const [activeTab, setActiveTab] = useState("kullanicilar");
  const { kullanicilar, auditLogs, gibSyncLogs, ofisler, resmiGazeteOzetleri } = useAppData();
  const [seeding, setSeeding] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const sortedAuditLogs = [...auditLogs]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 50);

  const handleSeedFirebase = async () => {
    if (!isFirebaseConfigured) {
      toast.warning("Firebase yapılandırması yok", ".env.local dosyasına Firebase bilgilerini ekleyin");
      return;
    }

    setSeeding(true);
    try {
      await seedFirebaseMockData();
      await logAudit({
        action: "seed",
        entityType: "sistem",
        entityId: "firebase-seed",
        entityLabel: "Demo veri",
        summary: "Demo veri Firestore'a aktarildi",
      });
      toast.success("Demo veri Firestore'a aktarıldı");
    } catch (error) {
      console.error(error);
      toast.error("Demo veri aktarılamadı", "Firestore yetkilerini ve Firebase ayarlarını kontrol edin");
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Ayarlar"
        subtitle="Sistem, kullanıcı ve entegrasyon ayarları"
      />

      <div className="flex gap-6">
        {/* Sol menü */}
        <nav className="w-52 flex-shrink-0">
          <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm text-left transition-colors ${
                  activeTab === tab.id
                    ? "bg-blue-50 text-blue-700 font-medium"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? "text-blue-600" : "text-slate-400"}`} />
                {tab.label}
              </button>
            ))}
          </div>
        </nav>

        {/* İçerik */}
        <div className="flex-1">
          {/* Kullanıcılar */}
          {activeTab === "kullanicilar" && (
            <div className="space-y-4">
              <Card>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-slate-800">Kullanıcılar</h3>
                  <Button size="sm" icon={<Plus className="w-3.5 h-3.5" />} onClick={() => setShowInviteModal(true)}>Personel Davet Et</Button>
                </div>
                <div className="divide-y divide-slate-100">
                  {kullanicilar.map((u) => (
                    <div key={u.id} className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-blue-700 text-xs font-bold">
                            {u.ad.split(" ").map((n) => n[0]).join("")}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-800">{`${u.ad} ${u.soyad}`}</p>
                          <p className="text-xs text-slate-500">{u.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant={u.rol === "musavir" ? "info" : "neutral"}>
                          {ROL_LABELS[u.rol]}
                        </Badge>
                        {u.yetkiler && u.yetkiler.length > 0 && (
                          <Badge variant="neutral">{u.yetkiler.length} yetki</Badge>
                        )}
                        <Badge variant={u.aktif ? "success" : "neutral"}>
                          {u.aktif ? "Aktif" : "Pasif"}
                        </Badge>
                        <Button variant="ghost" size="sm">Düzenle</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              <Card>
                <h3 className="text-sm font-semibold text-slate-800 mb-4">Rol Yetkileri</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left py-2 pr-4 font-semibold text-slate-500">Yetki</th>
                        <th className="text-center px-3 py-2 font-semibold text-slate-500">Müşavir</th>
                        <th className="text-center px-3 py-2 font-semibold text-slate-500">Personel</th>
                        <th className="text-center px-3 py-2 font-semibold text-slate-500">Mükellef</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {[
                        ["Tüm müşterileri görüntüle", true, false, false],
                        ["Müşteri oluştur/düzenle", true, false, false],
                        ["Görev oluştur/ata", true, true, false],
                        ["Rapor üret", true, true, false],
                        ["Toplu gönderim yap", true, false, false],
                        ["Kendi müşterilerini görür", true, true, false],
                        ["Kendi panelini görür", false, false, true],
                        ["Ayarları yönet", true, false, false],
                      ].map(([label, musavir, personel, mukellef]) => (
                        <tr key={String(label)}>
                          <td className="py-2 pr-4 text-slate-600">{label}</td>
                          {[musavir, personel, mukellef].map((val, i) => (
                            <td key={i} className="text-center px-3 py-2">
                              {val ? (
                                <span className="text-emerald-600 font-bold">✓</span>
                              ) : (
                                <span className="text-slate-300">—</span>
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {/* Bildirimler */}
          {activeTab === "bildirimler" && (
            <Card>
              <h3 className="text-sm font-semibold text-slate-800 mb-4">Bildirim Tercihleri</h3>
              <div className="space-y-4">
                {[
                  { label: "Yaklaşan beyanname hatırlatması", desc: "Son tarihten X gün önce bildirim", enabled: true },
                  { label: "Yeni tebligat bildirimi", desc: "GİB'den yeni tebligat geldiğinde", enabled: true },
                  { label: "Görev atama bildirimi", desc: "Yeni görev atandığında", enabled: true },
                  { label: "Rapor hazırlandı bildirimi", desc: "Rapor üretimi tamamlandığında", enabled: true },
                  { label: "Tahsilat hatırlatması", desc: "Vade yaklaştığında uyarı", enabled: false },
                  { label: "Risk skoru artışı", desc: "Müşteri riski arttığında", enabled: true },
                ].map(({ label, desc, enabled }) => (
                  <div key={label} className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-slate-700">{label}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
                    </div>
                    <button
                      className={`relative w-10 h-5 rounded-full transition-colors ${
                        enabled ? "bg-blue-600" : "bg-slate-200"
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                          enabled ? "translate-x-5" : "translate-x-0.5"
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Entegrasyonlar */}
          {activeTab === "entegrasyon" && (
            <div className="space-y-4">
              {[
                {
                  title: "GİB (Gelir İdaresi Başkanlığı)",
                  desc: "E-tebligat, beyanname durumu ve resmi veriler",
                  durum: ofisler[0]?.gibDurum ?? "hazirlik",
                  icon: "🏛",
                },
                {
                  title: "Luca Muhasebe",
                  desc: "Müşteri listesi, finansal özet ve muhasebe kayıtları",
                  durum: "hazirlik",
                  icon: "📊",
                },
                {
                  title: "WhatsApp Business API",
                  desc: "Toplu rapor ve bildirim gönderimi",
                  durum: ofisler[0]?.whatsappDurum ?? "hazirlik",
                  icon: "💬",
                },
              ].map((entg) => (
                <Card key={entg.title}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">{entg.icon}</span>
                      <div>
                        <h4 className="text-sm font-semibold text-slate-800">{entg.title}</h4>
                        <p className="text-xs text-slate-500 mt-0.5">{entg.desc}</p>
                        <Badge variant={entg.durum === "aktif" ? "success" : "neutral"} className="mt-2">
                          {entg.durum === "aktif" ? "Aktif" : "Hazirlik"}
                        </Badge>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">Yapılandır</Button>
                  </div>
                  <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-xs text-amber-700">
                      <strong>MVP Notu:</strong> Adapter iskeleti aktif. Kimlik bilgileri tanimlaninca sync loglari bu panelden izlenecek.
                    </p>
                  </div>
                  {entg.title.includes("GİB") && (
                    <div className="mt-3 rounded-lg border border-slate-200 p-3">
                      <p className="text-xs font-semibold text-slate-700">Son GIB Sync Kayitlari</p>
                      <div className="mt-2 space-y-2">
                        {gibSyncLogs.slice(0, 3).map((log) => (
                          <div key={log.id} className="flex items-center justify-between text-xs">
                            <span className="text-slate-600">{log.syncTipi}</span>
                            <Badge variant={log.durum === "basarili" ? "success" : log.durum === "basarisiz" ? "danger" : "warning"}>{log.durum}</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {entg.title.includes("WhatsApp") && (
                    <div className="mt-3 rounded-lg border border-slate-200 p-3 text-xs text-slate-600">
                      Varsayilan tahakkuk sablonu aktif. Planli mesajlar Tahakkuklar ekraninda queue olarak izlenir.
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}

          {/* Güvenlik */}
          {activeTab === "guvenlik" && (
            <div className="space-y-4">
              <Card>
                <h3 className="text-sm font-semibold text-slate-800 mb-4">Şifre Değiştir</h3>
                <div className="space-y-3 max-w-sm">
                  <Input label="Mevcut Şifre" type="password" placeholder="••••••••" />
                  <Input label="Yeni Şifre" type="password" placeholder="••••••••" />
                  <Input label="Şifre Tekrar" type="password" placeholder="••••••••" />
                  <Button>Şifreyi Güncelle</Button>
                </div>
              </Card>
              <Card>
                <h3 className="text-sm font-semibold text-slate-800 mb-3">Oturum Güvenliği</h3>
                <div className="space-y-3">
                  {[
                    ["Oturum zaman aşımı", "30 dakika"],
                    ["İki faktörlü doğrulama", "Devre dışı"],
                    ["Son giriş", "14 Temmuz 2024, 09:30"],
                  ].map(([label, value]) => (
                    <div key={label as string} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                      <span className="text-sm text-slate-600">{label}</span>
                      <span className="text-sm font-medium text-slate-800">{value}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}

          {/* Denetim */}
          {activeTab === "denetim" && (
            <Card>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-800">Denetim Kaydi</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Son 50 islem kaydi</p>
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
                    <TableHeadCell>Ozet</TableHeadCell>
                  </tr>
                </TableHead>
                <TableBody>
                  {sortedAuditLogs.length === 0 ? (
                    <TableEmpty colSpan={5} message="Denetim kaydi bulunamadi" />
                  ) : (
                    sortedAuditLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>
                          <span className="text-xs text-slate-600">{formatTarih(log.createdAt)}</span>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="text-xs font-medium text-slate-800">{log.actorName}</p>
                            <p className="text-xs text-slate-400">{log.actorRole}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={auditVariant(log.action)}>
                            {AUDIT_ACTION_LABELS[log.action]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="text-xs font-medium text-slate-700">{log.entityType}</p>
                            {log.entityLabel && <p className="text-xs text-slate-400">{log.entityLabel}</p>}
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-normal">
                          <span className="text-xs text-slate-600">{log.summary}</span>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>
          )}

          {/* Sistem */}
          {activeTab === "sistem" && (
            <div className="space-y-4">
              <Card>
                <h3 className="text-sm font-semibold text-slate-800 mb-4">Genel Tercihler</h3>
                <div className="space-y-4 max-w-sm">
                  <div>
                    <label className="text-sm font-medium text-slate-700">Ofis Adı</label>
                    <Input className="mt-1.5" defaultValue="Müşavir Ofisi A.Ş." />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700">Vergi Dairesi</label>
                    <Input className="mt-1.5" defaultValue="Bağcılar VD" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700">Zaman Dilimi</label>
                    <select className="mt-1.5 w-full bg-white border border-slate-300 text-sm text-slate-700 rounded-lg px-3 py-2 outline-none">
                      <option>Türkiye (UTC+3)</option>
                    </select>
                  </div>
                  <Button>Kaydet</Button>
                  <Button
                    type="button"
                    variant="outline"
                    loading={seeding}
                    onClick={handleSeedFirebase}
                  >
                    Demo Veriyi Firestore'a Aktar
                  </Button>
                </div>
              </Card>
              <Card>
                <h3 className="text-sm font-semibold text-slate-800 mb-3">Resmi Gazete Ozeti</h3>
                <p className="text-xs text-slate-500 mb-3">Gunluk ozetler dashboard karti olarak gosterilir.</p>
                <div className="space-y-2">
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
      <DavetModal
        open={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        defaultRole="personel"
      />
    </div>
  );
}
