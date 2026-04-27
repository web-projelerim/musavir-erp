"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { useAppData } from "@/lib/hooks/useAppData";
import { useAuth } from "@/lib/context/AuthContext";
import { useToast } from "@/lib/context/ToastContext";
import { isFirebaseConfigured } from "@/lib/firebase/client";
import { updateDavet } from "@/lib/firebase/repositories";
import { defaultYetkilerForRole, hashInviteToken } from "@/lib/domain/davet";

export default function DavetPage({ params }: { params: { token: string } }) {
  const router = useRouter();
  const toast = useToast();
  const { signUp } = useAuth();
  const { davetler } = useAppData();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    ad: "",
    soyad: "",
    password: "",
  });

  const davet = useMemo(() => {
    const tokenHash = hashInviteToken(params.token);
    return davetler.find(
      (item) =>
        item.tokenHash === tokenHash ||
        item.davetLinki.endsWith(`/${params.token}`) ||
        item.davetLinki.includes(params.token)
    );
  }, [davetler, params.token]);

  const expired = davet ? davet.expiresAt < new Date().toISOString() : false;
  const usable = davet && davet.durum === "bekliyor" && !expired;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!davet || !usable) return;
    if (form.password.length < 6) {
      toast.error("Şifre en az 6 karakter olmalı");
      return;
    }
    setLoading(true);
    try {
      await signUp({
        ad: form.ad,
        soyad: form.soyad,
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
      toast.success("Hesabınız oluşturuldu");
      router.replace(davet.rol === "mukellef" ? "/panel" : "/dashboard");
    } catch (error) {
      console.error(error);
      toast.error("Hesap oluşturulamadı", "E-posta daha önce kullanılmış olabilir");
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
          {!davet ? (
            <div>
              <h1 className="text-lg font-bold">Davet bulunamadı</h1>
              <p className="mt-2 text-sm text-slate-400">Bu davet linki geçersiz veya demo veride henüz yüklenmedi.</p>
            </div>
          ) : !usable ? (
            <div>
              <h1 className="text-lg font-bold">Davet kullanılamaz</h1>
              <p className="mt-2 text-sm text-slate-400">Davet süresi dolmuş, iptal edilmiş veya daha önce kullanılmış.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-blue-300" />
                  <span className="text-sm font-semibold">Davet doğrulandı</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge variant="info">{davet.rol === "mukellef" ? "Mükellef" : "Personel"}</Badge>
                  {davet.musteriAdi && <Badge variant="neutral">{davet.musteriAdi}</Badge>}
                </div>
                <p className="mt-2 text-xs text-blue-100">{davet.email}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Ad" value={form.ad} onChange={(event) => setForm({ ...form, ad: event.target.value })} required />
                <Input label="Soyad" value={form.soyad} onChange={(event) => setForm({ ...form, soyad: event.target.value })} required />
              </div>
              <Input
                label="Şifre"
                type="password"
                value={form.password}
                onChange={(event) => setForm({ ...form, password: event.target.value })}
                required
              />
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
