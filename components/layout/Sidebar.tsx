"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import {
  LayoutDashboard,
  Users,
  CalendarRange,
  CheckSquare,
  FileText,
  Bell,
  AlertTriangle,
  Calculator,
  CreditCard,
  Settings,
  Building2,
  LogOut,
} from "lucide-react";
import { useAppData } from "@/lib/hooks/useAppData";
import { useAuth } from "@/lib/context/AuthContext";

const navItems: {
  label: string;
  href: string;
  icon: React.ElementType;
  badge: string | number | null;
}[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, badge: null },
  { label: "Yukumlulukler", href: "/yukumlulukler", icon: CalendarRange, badge: null },
  { label: "Müşteriler", href: "/musteriler", icon: Users, badge: null },
  { label: "Görevler", href: "/gorevler", icon: CheckSquare, badge: "gorevler" },
  { label: "Raporlar", href: "/raporlar", icon: FileText, badge: null },
  { label: "Tebligat & Beyan", href: "/tebligatlar", icon: Bell, badge: "tebligatlar" },
  { label: "Risk Merkezi", href: "/risk", icon: AlertTriangle, badge: null },
  { label: "Tahakkuklar", href: "/tahakkuklar", icon: CreditCard, badge: null },
  { label: "KDV2 Hesaplama", href: "/kdv2", icon: Calculator, badge: null },
];

const bottomItems = [
  { label: "Ayarlar", href: "/ayarlar", icon: Settings },
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { gorevler, tebligatlar } = useAppData();
  const { user, signOut } = useAuth();

  const initials = user ? `${user.ad[0] ?? ""}${user.soyad[0] ?? ""}` : "AM";
  const roleLabel =
    user?.rol === "musavir" ? "Müşavir" : user?.rol === "personel" ? "Personel" : "Mükellef";

  const handleSignOut = async () => {
    await signOut();
    onClose?.();
    router.replace("/giris");
  };

  return (
    <>
      {isOpen && (
        <button
          type="button"
          aria-label="Menüyü kapat"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-900/45 lg:hidden"
        />
      )}

      <aside
        className={cn(
          "fixed left-0 top-0 z-50 flex h-screen w-60 flex-col bg-slate-900 shadow-2xl transition-transform duration-200 lg:z-40 lg:translate-x-0 lg:shadow-none",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
      {/* Logo */}
      <div className="px-5 py-5 border-b border-slate-700/50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
            <Building2 className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-white font-semibold text-sm leading-tight">MusavirERP</p>
            <p className="text-slate-400 text-xs">Mali Müşavir Paneli</p>
          </div>
        </div>
      </div>

      {/* Kullanıcı */}
      <div className="px-4 py-3 border-b border-slate-700/50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-bold">{initials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-medium truncate">
              {user ? `${user.ad} ${user.soyad}` : "Ali Müşavir"}
            </p>
            <p className="text-slate-400 text-xs truncate">{roleLabel}</p>
          </div>
        </div>
      </div>

      {/* Ana navigasyon */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          const badgeValue =
            item.badge === "gorevler"
              ? gorevler.filter((g) => g.durum !== "tamamlandi" && g.durum !== "iptal").length
              : item.badge === "tebligatlar"
              ? tebligatlar.filter((t) => t.durum === "yeni").length
              : typeof item.badge === "number"
              ? item.badge
              : null;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={cn(
                "flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-colors group",
                isActive
                  ? "bg-blue-600 text-white"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              )}
            >
              <span className="flex items-center gap-3">
                <item.icon className={cn("w-4 h-4 flex-shrink-0", isActive ? "text-white" : "text-slate-400 group-hover:text-white")} />
                <span className="font-medium">{item.label}</span>
              </span>
              {badgeValue !== null && badgeValue > 0 && (
                <span className={cn(
                  "text-xs px-1.5 py-0.5 rounded-full font-medium min-w-[20px] text-center",
                  isActive ? "bg-blue-500 text-white" : "bg-red-500 text-white"
                )}>
                  {badgeValue}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Alt butonlar */}
      <div className="px-3 py-3 border-t border-slate-700/50 space-y-0.5">
        {bottomItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors group",
                isActive
                  ? "bg-blue-600 text-white"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              )}
            >
              <item.icon className="w-4 h-4 flex-shrink-0 text-slate-400 group-hover:text-white" />
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={handleSignOut}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-300 hover:bg-red-900/30 hover:text-red-400 transition-colors group"
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          <span className="font-medium">Çıkış Yap</span>
        </button>
      </div>
      </aside>
    </>
  );
}
