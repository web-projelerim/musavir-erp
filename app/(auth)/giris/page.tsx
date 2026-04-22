"use client";

import { useEffect, useState } from "react";
import { Building2, Eye, EyeOff, ArrowRight, Shield, TrendingUp, Users, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/context/AuthContext";

export default function GirisPage() {
  const router = useRouter();
  const { user, loading: authLoading, signIn, signUp, resetPassword, isFirebaseReady } = useAuth();
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ad, setAd] = useState("");
  const [soyad, setSoyad] = useState("");
  const [email, setEmail] = useState("ali@musavir.com");
  const [password, setPassword] = useState("sifre123");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && user) {
      router.replace(user.rol === "mukellef" ? "/panel" : "/dashboard");
    }
  }, [authLoading, router, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (authMode === "register") {
        if (!ad.trim() || !soyad.trim()) {
          setError("Ad ve soyad alanlarını doldurun.");
          return;
        }

        if (password.length < 6) {
          setError("Şifre en az 6 karakter olmalı.");
          return;
        }

        if (password !== confirmPassword) {
          setError("Şifreler eşleşmiyor.");
          return;
        }
      }

      const appUser =
        authMode === "register"
          ? await signUp({
              ad: ad.trim(),
              soyad: soyad.trim(),
              email: email.trim(),
              password,
            })
          : await signIn(email.trim(), password);
      router.replace(appUser.rol === "mukellef" ? "/panel" : "/dashboard");
    } catch (err) {
      console.error(err);
      setError(
        authMode === "register"
          ? "Kayıt oluşturulamadı. E-posta daha önce kullanılmış olabilir veya Firebase Auth ayarlarını kontrol etmek gerekebilir."
          : isFirebaseReady
          ? "Giriş başarısız. E-posta, şifre veya Firebase kullanıcı kaydını kontrol edin."
          : "Demo giriş başarısız oldu."
      );
    } finally {
      setLoading(false);
    }
  };

  const toggleAuthMode = () => {
    const nextMode = authMode === "login" ? "register" : "login";
    setAuthMode(nextMode);
    setError(null);
    setShowPass(false);
    setPassword(nextMode === "login" ? "sifre123" : "");
    setConfirmPassword("");
    setEmail(nextMode === "login" ? "ali@musavir.com" : "");
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError("Şifre sıfırlama için e-posta adresini girin.");
      return;
    }

    if (!isFirebaseReady) {
      setError("Demo modunda şifre sıfırlama gönderilmez. Firebase env girilince aktif olur.");
      return;
    }

    try {
      await resetPassword(email);
      setError(null);
      alert("Şifre sıfırlama e-postası gönderildi.");
    } catch (err) {
      console.error(err);
      setError("Şifre sıfırlama e-postası gönderilemedi.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex">
      {/* Sol panel - bilgi */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-white font-bold text-lg">MusavirERP</p>
              <p className="text-slate-400 text-xs">Mali Müşavir Yönetim Platformu</p>
            </div>
          </div>
        </div>

        <div>
          <h1 className="text-4xl font-bold text-white leading-tight mb-4">
            Mali müşavirliği<br />
            <span className="text-blue-400">dijital çağa</span><br />
            taşıyın.
          </h1>
          <p className="text-slate-300 text-lg leading-relaxed mb-10">
            Tüm müşterilerinizi tek ekranda yönetin. GİB ve Luca verilerini takip edin, raporları otomatik üretin.
          </p>

          <div className="space-y-4">
            {[
              { icon: Users, title: "Portföy Yönetimi", desc: "Tüm müşterilerinizi tek ekranda görün" },
              { icon: Shield, title: "Resmi Veri Takibi", desc: "GİB/Luca entegrasyon altyapısı" },
              { icon: TrendingUp, title: "Akıllı Risk Skoru", desc: "Riskli müşterileri erken fark edin" },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex items-center gap-4">
                <div className="w-9 h-9 bg-blue-600/20 border border-blue-500/30 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4 text-blue-400" />
                </div>
                <div>
                  <p className="text-white text-sm font-semibold">{title}</p>
                  <p className="text-slate-400 text-xs">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-slate-500 text-xs">© 2024 MusavirERP. Tüm hakları saklıdır.</p>
      </div>

      {/* Sağ panel - giriş formu */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          {/* Mobil logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-9 h-9 bg-blue-500 rounded-xl flex items-center justify-center">
              <Building2 className="w-4 h-4 text-white" />
            </div>
            <p className="text-white font-bold text-lg">MusavirERP</p>
          </div>

          <h2 className="text-2xl font-bold text-white mb-1">
            {authMode === "login" ? "Giriş Yap" : "Kayıt Ol"}
          </h2>
          <p className="text-slate-400 text-sm mb-8">
            {authMode === "login"
              ? "Hesabınıza erişmek için bilgilerinizi girin"
              : "Firebase üzerinde yeni mali müşavir hesabı oluşturun"}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {authMode === "register" && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">
                    Ad
                  </label>
                  <input
                    type="text"
                    value={ad}
                    onChange={(e) => setAd(e.target.value)}
                    required
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-3 text-sm
                               placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    placeholder="Ali"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">
                    Soyad
                  </label>
                  <input
                    type="text"
                    value={soyad}
                    onChange={(e) => setSoyad(e.target.value)}
                    required
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-3 text-sm
                               placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    placeholder="Müşavir"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                E-posta Adresi
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-3 text-sm
                           placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="ad@musavir.com"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium text-slate-300">Şifre</label>
                {authMode === "login" && (
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="text-xs text-blue-400 hover:text-blue-300"
                  >
                    Şifremi Unuttum
                  </button>
                )}
              </div>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-3 pr-10 text-sm
                             placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {authMode === "register" ? (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Şifre Tekrarı
                </label>
                <input
                  type={showPass ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-3 text-sm
                             placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  placeholder="••••••••"
                />
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="remember"
                  className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="remember" className="text-sm text-slate-400">
                  Beni hatırla
                </label>
              </div>
            )}

            {error && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3">
                <p className="text-xs text-red-200">{error}</p>
              </div>
            )}

            {!isFirebaseReady && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
                <p className="text-xs text-amber-100">
                  Firebase env bilgileri girilmediği için demo oturum modu aktif.
                </p>
              </div>
            )}

            {authMode === "register" && (
              <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-3">
                <p className="text-xs text-blue-100">
                  Yeni hesaplar mali müşavir rolüyle açılır. Personel ve mükellef hesapları daha sonra davet/rol yönetimiyle bağlanacak.
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || authLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold
                         py-3 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm
                         disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  {authMode === "login" ? (
                    <>
                      Giriş Yap
                      <ArrowRight className="w-4 h-4" />
                    </>
                  ) : (
                    <>
                      Kayıt Ol
                      <UserPlus className="w-4 h-4" />
                    </>
                  )}
                </>
              )}
            </button>
          </form>

          <div className="mt-5 text-center">
            <button
              type="button"
              onClick={toggleAuthMode}
              className="text-sm text-slate-400 hover:text-blue-300"
            >
              {authMode === "login"
                ? "Hesabınız yok mu? Kayıt olun"
                : "Zaten hesabınız var mı? Giriş yapın"}
            </button>
          </div>

          {/* Demo hesaplar */}
          {authMode === "login" && (
          <div className="mt-8 border border-slate-700/50 rounded-xl p-4">
            <p className="text-xs text-slate-500 font-medium mb-3 uppercase tracking-wide">Demo Hesaplar</p>
            <div className="space-y-2">
              {[
                { rol: "Mali Müşavir", email: "ali@musavir.com" },
                { rol: "Personel", email: "selin@musavir.com" },
                { rol: "Mükellef", email: "ahmet@akdeniz.com" },
              ].map(({ rol, email }) => (
                <div key={email} className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">{rol}</span>
                  <span className="text-slate-300 font-mono">{email}</span>
                </div>
              ))}
            </div>
          </div>
          )}
        </div>
      </div>
    </div>
  );
}
