"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Building2 } from "lucide-react";
import { useAuth } from "@/lib/context/AuthContext";
import type { UserRole } from "@/lib/types";

interface Props {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

function defaultPathForRole(role: UserRole) {
  return role === "mukellef" ? "/panel" : "/dashboard";
}

export function AuthGuard({ children, allowedRoles }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading } = useAuth();

  // pathname'i ref'te tut — effect'te redirect URL için kullanılır ama
  // dependency olarak eklenmez; her path değişiminde auth yeniden çalışmasın.
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace(`/giris?next=${encodeURIComponent(pathnameRef.current)}`);
      return;
    }

    if (allowedRoles && !allowedRoles.includes(user.rol)) {
      router.replace(defaultPathForRole(user.rol));
    }
  // pathname kasıtlı olarak dependency'de yok — her navigasyonda
  // auth kontrolü yeniden çalışmamalı; user/loading değişince çalışır.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowedRoles, loading, router, user]);

  // İlk yükleme: henüz user bilgisi yok → spinner göster.
  // Token yenileme (loading=true ama user zaten var) → spinner GÖSTERME,
  // navigasyonu kesme; çocukları render etmeye devam et.
  if (loading && !user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-600">
          <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center">
            <Building2 className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">MusavirERP</p>
            <p className="text-xs text-slate-500">Oturum kontrol ediliyor...</p>
          </div>
        </div>
      </div>
    );
  }

  // Auth tamamlandı ama kullanıcı yok ya da yanlış rol → effect redirect eder,
  // bu süre zarfında boş render döndür (flash önleme).
  if (!loading && (!user || (allowedRoles && !allowedRoles.includes(user.rol)))) {
    return null;
  }

  return <>{children}</>;
}
