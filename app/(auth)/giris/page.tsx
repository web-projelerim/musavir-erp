"use client";

import { useEffect, useState } from "react";
import { Building2, Eye, EyeOff, ArrowRight, Shield, TrendingUp, Users, UserPlus, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/context/AuthContext";
import { useToast } from "@/lib/context/ToastContext";
import { parseFirebaseAuthError, parseFirebaseResetError, parseFirebaseSignUpError } from "@/lib/utils/firebaseErrors";

export default function GirisPage() {
  const router = useRouter();
  const { user, loading: authLoading, signIn, signUp, resetPassword } = useAuth();
  const toast = useToast();
  const [authMode, setAuthMode] = useState<"login" | "register" | "forgot">("login");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ad, setAd] = useState("");
  const [soyad, setSoyad] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && user) {
      router.replace(user.rol === "mukellef" ? "/panel" : "/dashboard");
    }
  }, [authLoading, router, user]);

  useEffect(() => {
    const msg = sessionStorage.getItem("auth_error");
    if (msg) {
      setError(msg);
      sessionStorage.removeItem("auth_error");
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (authMode === "register") {
        if (!ad.trim() || !soyad.trim()) {
          setError("Ad ve soyad alanlarını doldurunuz.");
          setLoading(false);
          return;
        }
        if (!email.trim()) {
          setError("E-posta adresi girilmedi.");
          setLoading(false);
          return;
        }
        if (password.length < 6) {
          setError("Şifre en az 6 karakter olmalıdır.");
          setLoading(false);
          return;
        }
        if (password !== confirmPassword) {
          setError("Girdiğiniz şifreler eşleşmiyor. Lütfen tekrar kontrol edin.");
          setLoading(false);
          return;
        }
      }

      if (!email.trim()) {
        setError("E-posta adresi girilmedi.");
        setLoading(false);
        return;
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
      if (authMode === "register") {
        setError(parseFirebaseSignUpError(err));
      } else {
        setError(parseFirebaseAuthError(err));
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleAuthMode = () => {
    const nextMode = authMode === "login" ? "register" : "login";
    setAuthMode(nextMode);
    setError(null);
    setShowPass(false);
    setPassword("");
    setConfirmPassword("");
    setEmail("");
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError("E-posta adresini girin.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await resetPassword(email.trim());
      toast.success(
        "Şifre sıfırlama e-postası gönderildi",
        `${email.trim()} adresine bağlantı gönderildi. Spam/Junk klasörünü de kontrol edin.`
      );
      setAuthMode("login");
    } catch (err) {
      console.error(err);
      setError(parseFirebaseResetError(err));
    } finally {
      setLoading(false);
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
            {authMode === "login" ? "Giriş Yap" : authMode === "register" ? "Kayıt Ol" : "Şifre Sıfırla"}
          </h2>
          <p className="text-slate-400 text-sm mb-8">
            {authMode === "login"
              ? "Hesabınıza erişmek için bilgilerinizi girin"
              : authMode === "register"
              ? "Yeni mali müşavir hesabı oluşturun"
              : "E-posta adresinize şifre sıfırlama bağlantısı gönderilecek"}
          </p>

          {/* Şifre sıfırlama formu */}
          {authMode === "forgot" && (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">E-posta Adresi</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-3 text-sm
                             placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  placeholder="ad@musavir.com"
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

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold
                           py-3 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm
                           disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  "Sıfırlama Bağlantısı Gönder"
                )}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => { setAuthMode("login"); setError(null); }}
                  className="text-sm text-slate-400 hover:text-blue-300"
                >
                  ← Girişe dön
                </button>
              </div>
            </form>
          )}

          <form onSubmit={handleSubmit} className={authMode === "forgot" ? "hidden" : "space-y-4"}>
            {authMode === "register" && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Ad</label>
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
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Soyad</label>
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
              <label className="block text-sm font-medium text-slate-300 mb-1.5">E-posta Adresi</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                suppressHydrationWarning
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
                    onClick={() => { setAuthMode("forgot"); setError(null); }}
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
                  suppressHydrationWarning
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
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Şifre Tekrarı</label>
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
                <label htmlFor="remember" className="text-sm text-slate-400">Beni hatırla</label>
              </div>
            )}

            {error && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-xs text-red-200 leading-relaxed">{error}</p>
                    {(error.includes("kayıtlı") || error.includes("hatalı")) && authMode === "login" && (
                      <button
                        type="button"
                        onClick={toggleAuthMode}
                        className="mt-1.5 text-xs text-blue-400 hover:text-blue-300 underline"
                      >
                        Kayıt olmak için tıklayın →
                      </button>
                    )}
                    {error.includes("zaten") && authMode === "register" && (
                      <button
                        type="button"
                        onClick={toggleAuthMode}
                        className="mt-1.5 text-xs text-blue-400 hover:text-blue-300 underline"
                      >
                        Giriş yapmak için tıklayın →
                      </button>
                    )}
                  </div>
                </div>
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
                    <>Giriş Yap <ArrowRight className="w-4 h-4" /></>
                  ) : (
                    <>Kayıt Ol <UserPlus className="w-4 h-4" /></>
                  )}
                </>
              )}
            </button>
          </form>

          {authMode !== "forgot" && (
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
          )}
        </div>
      </div>
    </div>
  );
}
