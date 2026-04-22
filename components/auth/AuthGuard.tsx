"use client";

import { useEffect } from "react";
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

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace(`/giris?next=${encodeURIComponent(pathname)}`);
      return;
    }

    if (allowedRoles && !allowedRoles.includes(user.rol)) {
      router.replace(defaultPathForRole(user.rol));
    }
  }, [allowedRoles, loading, pathname, router, user]);

  if (loading || !user || (allowedRoles && !allowedRoles.includes(user.rol))) {
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

  return <>{children}</>;
}
