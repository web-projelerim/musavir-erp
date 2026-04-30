"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Building2, Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { useAuth } from "@/lib/context/AuthContext";
import { useToast } from "@/lib/context/ToastContext";
import { isFirebaseConfigured } from "@/lib/firebase/client";
import { updateDavet } from "@/lib/firebase/repositories";
import { defaultYetkilerForRole, hashInviteToken } from "@/lib/domain/davet";
import { parseFirebaseSignUpError } from "@/lib/utils/firebaseErrors";
import { useAppData } from "@/lib/hooks/useAppData";
import type { Davet } from "@/lib/types";

export default function DavetPage({ params }: { params: { token: string } }) {
  const router = useRouter();
  const toast = useToast();
  const { signUp } = useAuth();
  const { davetler } = useAppData();

  const [davet, setDavet] = useState<Davet | null | undefined>(undefined); // undefined=yükleniyor, null=bulunamadı
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPass, setShowPass] = useState(false);
  const [form, setForm] = useState({
    ad: "",
    soyad: "",
    password: "",
    confirmPassword: "",
  });

  // Davet yükleme: Firebase varsa API route'tan, yoksa mock veriden
  useEffect(() => {
    if (!isFirebaseConfigured) {
      // Demo mod: useAppData'dan al
      const tokenHash = hashInviteToken(params.token);
      const found = davetler.find(
        (item) =>
          item.tokenHash === tokenHash ||
          item.davetLinki.endsWith(`/${params.token}`) ||
          item.davetLinki.includes(params.token)
      );
      setDavet(found ?? null);
      return;
    }

    // Üretim modu: sunucu API'sinden al (kimlik doğrulama gerektirmez)
    fetch(`/api/davet/${params.token}`)
      .then(async (res) => {
        if (res.ok) {
          const data = (await res.json()) as Davet;
          setDavet(data);
        } else {
          setDavet(null);
        }
      })
      .catch(() => setDavet(null));
  }, [params.token, davetler]);

  const expired = davet ? davet.expiresAt < new Date().toISOString() : false;
  const usable = davet && davet.durum === "bekliyor" && !expired;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!davet || !usable) return;
    setError(null);

    if (!form.ad.trim() || !form.soyad.trim()) {
      setError("Ad ve soyad alanlarını doldurunuz.");
      return;
    }
    if (form.password.length < 6) {
      setError("Şifre en az 6 karakter olmalıdır.");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("Girdiğiniz şifreler eşleşmiyor. Lütfen tekrar kontrol edin.");
      return;
    }

    setLoading(true);
    try {
      await signUp({
        ad: form.ad.trim(),
        soyad: form.soyad.trim(),
        email: davet.email,
        password: form.password,
        rol: davet.rol,
        ofisId: davet.ofisId,
        musteriId: davet.musteriId,
        davetId: davet.id,
        yetkiler: defaultYetkilerForRole(davet.rol),
      });
      if (isFirebaseConfigured) {
        await updateDavet(davet.id, {
          durum: "kullanildi",
          usedAt: new Date().toISOString(),
        });
      }
      toast.success("Hesabınız oluşturuldu", "Yönlendiriliyorsunuz...");
      router.replace(davet.rol === "mukellef" ? "/panel" : "/dashboard");
    } catch (err) {
      console.error(err);
      setError(parseFirebaseSignUpError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-white">
      <div className="mx-auto max-w-md">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold">MusavirERP</p>
            <p className="text-xs text-slate-400">Davetli hesap oluşturma</p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
          {/* Yükleniyor */}
          {davet === undefined && (
            <div className="flex items-center gap-3 py-4">
              <Loader2 className="h-5 w-5 animate-spin text-blue-400" />
              <p className="text-sm text-slate-400">Davet bilgileri yükleniyor...</p>
            </div>
          )}

          {/* Davet bulunamadı */}
          {davet === null && (
            <div>
              <h1 className="text-lg font-bold">Davet bulunamadı</h1>
              <p className="mt-2 text-sm text-slate-400">Bu davet linki geçersiz veya süresi dolmuş olabilir.</p>
            </div>
          )}

          {/* Kullanılamaz davet */}
          {davet !== null && davet !== undefined && !usable && (
            <div>
              <h1 className="text-lg font-bold">Davet kullanılamaz</h1>
              <p className="mt-2 text-sm text-slate-400">
                {expired ? "Bu davetin süresi dolmuştur." : "Davet iptal edilmiş veya daha önce kullanılmış."}
              </p>
            </div>
          )}

          {/* Aktif davet — form */}
          {usable && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-blue-300" />
                  <span className="text-sm font-semibold">Davet doğrulandı</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge variant="info">
                    {davet.rol === "mukellef" ? "Mükellef" : davet.rol === "musavir" ? "Mali Müşavir" : "Personel"}
                  </Badge>
                  {davet.musteriAdi && <Badge variant="neutral">{davet.musteriAdi}</Badge>}
                </div>
                <p className="mt-2 text-xs text-blue-100">{davet.email}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input label="Ad" value={form.ad} onChange={(event) => setForm({ ...form, ad: event.target.value })} required placeholder="Adınız" />
                <Input label="Soyad" value={form.soyad} onChange={(event) => setForm({ ...form, soyad: event.target.value })} required placeholder="Soyadınız" />
              </div>

              {/* Şifre alanı — göster/gizle */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Şifre</label>
                <div className="relative">
                  <input
                    type={showPass ? "text" : "password"}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    required
                    placeholder="En az 6 karakter"
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-3 pr-10 text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                  >
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Şifre tekrarı */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Şifre Tekrarı</label>
                <input
                  type={showPass ? "text" : "password"}
                  value={form.confirmPassword}
                  onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                  required
                  placeholder="Şifrenizi tekrar girin"
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-3 text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
              </div>

              {error && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-red-200 leading-relaxed">{error}</p>
                  </div>
                </div>
              )}

              <Button type="submit" loading={loading} className="w-full">
                Hesabı Oluştur
              </Button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
