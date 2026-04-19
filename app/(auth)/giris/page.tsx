"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/lib/context/AuthContext";
import { useToast } from "@/lib/context/ToastContext";

export default function GirisPage() {
  const router = useRouter();
  const { girisYap } = useAuth();
  const toast = useToast();

  const [email, setEmail]       = useState("ali@musavir.com");
  const [sifre, setSifre]       = useState("sifre123");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await girisYap(email, sifre);
      router.replace("/dashboard");
    } catch {
      toast.error("E-posta veya şifre hatalı.");
      setLoading(false);
    }
  };

  const demoGiris = (demoEmail: string) => {
    setEmail(demoEmail);
    setSifre("sifre123");
  };

  return (
    <div className="min-h-screen flex" style={{ background: "#0f172a" }}>

      {/* Left panel */}
      <div className="hidden lg:flex lg:w-[420px] flex-col justify-between p-10 flex-shrink-0"
        style={{ borderRight: "1px solid #1e293b" }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded flex items-center justify-center" style={{ background: "#2563eb" }}>
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24">
              <path fill="#fff" d="M3 3h8v8H3V3zm0 10h8v8H3v-8zm10-10h8v8h-8V3zm0 10h8v8h-8v-8z" />
            </svg>
          </div>
          <div>
            <p style={{ fontSize: 14, fontWeight: 600, color: "#f1f5f9" }}>MusavirERP</p>
            <p style={{ fontSize: 10, color: "#475569" }}>Mali Müşavir Platformu</p>
          </div>
        </div>

        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: "#f1f5f9", lineHeight: 1.3,
            letterSpacing: "-0.02em", marginBottom: 12 }}>
            Mali müşavirliği<br />
            <span style={{ color: "#60a5fa" }}>dijitale taşıyın.</span>
          </h1>
          <p style={{ fontSize: 13, color: "#64748b", lineHeight: 1.7, marginBottom: 32 }}>
            Müşterilerinizi, görevlerinizi ve beyannamelerinizi tek bir ekrandan yönetin. GİB ve Luca entegrasyonu ile verilerini otomatik senkronize edin.
          </p>

          <div className="space-y-4">
            {[
              { label: "Gerçek zamanlı risk skoru", desc: "Riskli müşterilerinizi anında fark edin" },
              { label: "GİB & Luca entegrasyonu",   desc: "Beyanname ve hesap verisi otomatik senkron" },
              { label: "Toplu WhatsApp bildirimi",   desc: "Tüm müşterilere tek tıkla rapor gönderin" },
            ].map(({ label, desc }) => (
              <div key={label} className="flex items-center gap-3">
                <div className="flex-shrink-0 w-1.5 h-1.5 rounded-full" style={{ background: "#3b82f6", marginTop: 2 }} />
                <div>
                  <p style={{ fontSize: 12, fontWeight: 500, color: "#cbd5e1" }}>{label}</p>
                  <p style={{ fontSize: 11, color: "#475569" }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p style={{ fontSize: 10, color: "#334155" }}>© 2025 MusavirERP</p>
      </div>

      {/* Right — form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div style={{ width: "100%", maxWidth: 360 }}>

          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-8 h-8 rounded flex items-center justify-center" style={{ background: "#2563eb" }}>
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24">
                <path fill="#fff" d="M3 3h8v8H3V3zm0 10h8v8H3v-8zm10-10h8v8h-8V3zm0 10h8v8h-8v-8z" />
              </svg>
            </div>
            <p style={{ fontSize: 15, fontWeight: 600, color: "#f1f5f9" }}>MusavirERP</p>
          </div>

          <h2 style={{ fontSize: 20, fontWeight: 600, color: "#f1f5f9", marginBottom: 4, letterSpacing: "-0.01em" }}>
            Hesabınıza giriş yapın
          </h2>
          <p style={{ fontSize: 12, color: "#475569", marginBottom: 24 }}>
            E-posta ve şifrenizle devam edin.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 500,
                color: "#94a3b8", marginBottom: 5 }}>
                E-posta
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{ width: "100%", background: "#1e293b", border: "1px solid #334155",
                  color: "#f1f5f9", borderRadius: 6, padding: "10px 12px", fontSize: 13,
                  outline: "none" }}
                onFocus={(e) => e.target.style.borderColor = "#3b82f6"}
                onBlur={(e) => e.target.style.borderColor = "#334155"}
                placeholder="ad@musavir.com"
              />
            </div>

            <div>
              <div className="flex items-center justify-between" style={{ marginBottom: 5 }}>
                <label style={{ fontSize: 11, fontWeight: 500, color: "#94a3b8" }}>Şifre</label>
                <button type="button" style={{ fontSize: 11, color: "#3b82f6" }}
                  className="hover:text-blue-400">
                  Şifremi unuttum
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  value={sifre}
                  onChange={(e) => setSifre(e.target.value)}
                  required
                  style={{ width: "100%", background: "#1e293b", border: "1px solid #334155",
                    color: "#f1f5f9", borderRadius: 6, padding: "10px 40px 10px 12px", fontSize: 13,
                    outline: "none" }}
                  onFocus={(e) => e.target.style.borderColor = "#3b82f6"}
                  onBlur={(e) => e.target.style.borderColor = "#334155"}
                  placeholder="••••••••"
                />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: "#475569" }}>
                  {showPass ? <EyeOff style={{ width: 14, height: 14 }} /> : <Eye style={{ width: 14, height: 14 }} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 font-medium transition-colors"
              style={{ background: "#2563eb", color: "#fff", border: "none", borderRadius: 6,
                padding: "10px 0", fontSize: 13, cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.7 : 1, marginTop: 4 }}>
              {loading ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : "Giriş Yap"}
            </button>
          </form>

          {/* Demo accounts */}
          <div style={{ marginTop: 24, padding: 14, background: "#1e293b",
            border: "1px solid #334155", borderRadius: 6 }}>
            <p style={{ fontSize: 10, color: "#475569", fontWeight: 500,
              textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
              Demo Hesaplar
            </p>
            <div className="space-y-2">
              {[
                { rol: "Mali Müşavir", email: "ali@musavir.com" },
                { rol: "Personel",     email: "selin@musavir.com" },
                { rol: "Mükellef",     email: "ahmet@akdeniz.com" },
              ].map(({ rol, email: e }) => (
                <button key={e} onClick={() => demoGiris(e)}
                  className="w-full flex items-center justify-between hover:bg-white/5 transition-colors rounded px-2 py-1.5">
                  <span style={{ fontSize: 11, color: "#64748b" }}>{rol}</span>
                  <span style={{ fontSize: 11, color: "#94a3b8", fontFamily: "monospace" }}>{e}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
