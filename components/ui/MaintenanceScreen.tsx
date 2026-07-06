import { Wrench } from "lucide-react";

/**
 * Tüm hata/istisna durumlarında gösterilen ortak bakım ekranı.
 *
 * Kullanıcıya ham hata kodu (503, 400, 500, 404 vb.) veya teknik yığın izi
 * gösterilmez; her sorunda tek ve sakin bir "bakımdayız" mesajı çıkar.
 * error.tsx / not-found.tsx tarafından kullanılır. (Kök layout çökerse
 * global-error.tsx kendi bağımsız kopyasını render eder.)
 */
export function MaintenanceScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950 px-6">
      <div className="text-center max-w-md">
        <img
          src="/logo-mm.jpg"
          alt="MusavirERP"
          className="w-20 h-20 rounded-2xl mx-auto mb-6 shadow-lg object-cover"
        />
        <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 mb-5">
          <Wrench className="w-3.5 h-3.5 text-blue-300 animate-pulse" />
          <span className="text-xs font-medium text-blue-100">Bakım çalışması</span>
        </div>
        <h1 className="text-2xl font-bold text-white mb-3">Şu anda bakımdayız</h1>
        <p className="text-slate-300 leading-relaxed">
          Kısa sürecek. Anlayışınız için teşekkür ederiz.
        </p>
        <p className="mt-8 text-xs text-slate-500">MusavirERP</p>
      </div>
    </div>
  );
}
