"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import {
  LayoutDashboard,
  Users,
  CheckSquare,
  FileText,
  Bell,
  AlertTriangle,
  Calculator,
  Settings,
  ChevronRight,
  Building2,
  LogOut,
} from "lucide-react";

const navItems = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Müşteriler",
    href: "/musteriler",
    icon: Users,
  },
  {
    label: "Görevler",
    href: "/gorevler",
    icon: CheckSquare,
    badge: 6,
  },
  {
    label: "Raporlar",
    href: "/raporlar",
    icon: FileText,
  },
  {
    label: "Tebligat & Beyan",
    href: "/tebligatlar",
    icon: Bell,
    badge: 2,
  },
  {
    label: "Risk Merkezi",
    href: "/risk",
    icon: AlertTriangle,
  },
  {
    label: "KDV2 Hesaplama",
    href: "/kdv2",
    icon: Calculator,
  },
];

const bottomItems = [
  { label: "Ayarlar", href: "/ayarlar", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed top-0 left-0 h-screen w-60 bg-slate-900 flex flex-col z-40">
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
            <span className="text-white text-xs font-bold">AM</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-medium truncate">Ali Müşavir</p>
            <p className="text-slate-400 text-xs truncate">Müşavir</p>
          </div>
        </div>
      </div>

      {/* Ana navigasyon */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
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
              {item.badge && (
                <span className={cn(
                  "text-xs px-1.5 py-0.5 rounded-full font-medium min-w-[20px] text-center",
                  isActive ? "bg-blue-500 text-white" : "bg-slate-700 text-slate-300"
                )}>
                  {item.badge}
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
        <Link
          href="/giris"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-300 hover:bg-red-900/30 hover:text-red-400 transition-colors group"
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          <span className="font-medium">Çıkış Yap</span>
        </Link>
      </div>
    </aside>
  );
}
