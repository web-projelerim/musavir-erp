"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import {
  LayoutDashboard,
  Users,
  CheckSquare,
  FileText,
  Bell,
  Calculator,
  CreditCard,
  Settings,
  Building2,
  LogOut,
  ScrollText,
  Send,
  ClipboardList,
  Wallet,
  Search,
  ChevronLeft,
  ChevronRight,
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
  { label: "Müşteriler", href: "/musteriler", icon: Users, badge: null },
  { label: "Görevler", href: "/gorevler", icon: CheckSquare, badge: "gorevler" },
  { label: "Raporlar", href: "/raporlar", icon: FileText, badge: null },
  { label: "Beyannameler", href: "/beyannameler", icon: ScrollText, badge: null },
  { label: "Beyanname Takip", href: "/beyanname-takip", icon: ClipboardList, badge: null },
  { label: "Tebligatlar", href: "/tebligatlar", icon: Bell, badge: "tebligatlar" },
  { label: "Tahakkuklar", href: "/tahakkuklar", icon: CreditCard, badge: null },
  { label: "Tahsilatlar", href: "/tahsilatlar", icon: Wallet, badge: null },
  { label: "KDV2 Hesaplama", href: "/kdv2", icon: Calculator, badge: null },
  { label: "Onay Bekleyenler", href: "/onay-bekleyenler", icon: Send, badge: "onay" },
];

const bottomItems = [
  { label: "Ayarlar", href: "/ayarlar", icon: Settings },
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
}

export function Sidebar({ isOpen = false, onClose, collapsed = false, onToggleCollapsed }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { gorevler, tebligatlar, gonderimler } = useAppData();
  const { user, signOut } = useAuth();
  const [aramaText, setAramaText] = useState("");

  const initials = user ? `${user.ad[0] ?? ""}${user.soyad[0] ?? ""}` : "AM";
  const roleLabel =
    user?.rol === "musavir" ? "Müşavir" : user?.rol === "personel" ? "Personel" : "Mükellef";

  const handleSignOut = async () => {
    await signOut();
    onClose?.();
    router.replace("/giris");
  };

  const filteredNavItems = navItems.filter((item) =>
    item.label.toLocaleLowerCase("tr-TR").includes(aramaText.trim().toLocaleLowerCase("tr-TR"))
  );

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
          "fixed left-0 top-0 z-50 flex h-screen flex-col bg-slate-900 shadow-2xl transition-[transform,width] duration-200 lg:z-40 lg:translate-x-0 lg:shadow-none",
          collapsed ? "lg:w-16" : "lg:w-60",
          "w-60",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
      {/* Logo + daralt/genişlet */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-700/50 px-4 py-4">
        <div className="flex min-w-0 items-center gap-2">
          {!collapsed && (
            <img
              src="/logo-mm.jpg"
              alt="Mali Müşavir logosu"
              className="h-8 w-8 flex-shrink-0 rounded-lg object-cover"
            />
          )}
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-blue-500">
            <Building2 className="h-4 w-4 text-white" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold leading-tight text-white">MusavirERP</p>
              <p className="truncate text-xs text-slate-400">Mali Müşavir Paneli</p>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={onToggleCollapsed}
          aria-label={collapsed ? "Menüyü genişlet" : "Menüyü daralt"}
          className="hidden flex-shrink-0 rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white lg:block"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* Kullanıcı */}
      <div className="border-b border-slate-700/50 px-4 py-2.5">
        <div className={cn("flex items-center gap-3", collapsed && "justify-center")}>
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-600">
            <span className="text-xs font-bold text-white">{initials}</span>
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-white">
                {user ? `${user.ad} ${user.soyad}` : "Ali Müşavir"}
              </p>
              <p className="truncate text-xs text-slate-400">{roleLabel}</p>
            </div>
          )}
        </div>
      </div>

      {/* Hızlı arama */}
      {!collapsed && (
        <div className="border-b border-slate-700/50 px-3 py-2">
          <div className="flex items-center gap-2 rounded-lg bg-slate-800 px-2.5 py-1.5">
            <Search className="h-3.5 w-3.5 flex-shrink-0 text-slate-400" />
            <input
              type="text"
              value={aramaText}
              onChange={(e) => setAramaText(e.target.value)}
              placeholder="Hızlı arama..."
              className="w-full min-w-0 bg-transparent text-xs text-white placeholder-slate-400 outline-none"
            />
          </div>
        </div>
      )}

      {/* Ana navigasyon */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-2">
        {filteredNavItems.length === 0 && (
          <p className="px-3 py-2 text-xs text-slate-500">Eşleşen menü yok</p>
        )}
        {filteredNavItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          const badgeValue =
            item.badge === "gorevler"
              ? gorevler.filter((g) => g.durum !== "tamamlandi" && g.durum !== "iptal").length
              : item.badge === "tebligatlar"
              ? tebligatlar.filter((t) => t.durum === "yeni").length
              : item.badge === "onay"
              ? gonderimler.filter((g) => g.durum === "bekliyor").length
              : typeof item.badge === "number"
              ? item.badge
              : null;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              title={collapsed ? item.label : undefined}
              className={cn(
                "flex items-center rounded-lg text-sm transition-colors group",
                collapsed ? "justify-center px-2 py-2" : "justify-between px-3 py-2",
                isActive
                  ? "bg-blue-600 text-white"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              )}
            >
              <span className={cn("relative flex items-center", !collapsed && "gap-3")}>
                <item.icon className={cn("w-4 h-4 flex-shrink-0", isActive ? "text-white" : "text-slate-400 group-hover:text-white")} />
                {!collapsed && <span className="font-medium">{item.label}</span>}
                {collapsed && badgeValue !== null && badgeValue > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                    {badgeValue > 9 ? "9+" : badgeValue}
                  </span>
                )}
              </span>
              {!collapsed && badgeValue !== null && badgeValue > 0 && (
                <span className={cn(
                  "text-xs px-1.5 py-0.5 rounded-full font-medium min-w-[20px] text-center",
                  isActive ? "bg-blue-500 text-white" : "bg-red-500 text-white"
                )}>
                  {badgeValue}
                </span>
              )}
              {!collapsed && (badgeValue === null || badgeValue === 0) && (
                <ChevronRight className={cn("h-3.5 w-3.5 flex-shrink-0", isActive ? "text-blue-200" : "text-slate-500 group-hover:text-white")} />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Alt butonlar */}
      <div className="px-3 py-2 border-t border-slate-700/50 space-y-0.5">
        {bottomItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              title={collapsed ? item.label : undefined}
              className={cn(
                "flex items-center rounded-lg text-sm transition-colors group",
                collapsed ? "justify-center px-2 py-2" : "justify-between px-3 py-2",
                isActive
                  ? "bg-blue-600 text-white"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              )}
            >
              <span className={cn("flex items-center", !collapsed && "gap-3")}>
                <item.icon className="w-4 h-4 flex-shrink-0 text-slate-400 group-hover:text-white" />
                {!collapsed && <span className="font-medium">{item.label}</span>}
              </span>
              {!collapsed && (
                <ChevronRight className={cn("h-3.5 w-3.5 flex-shrink-0", isActive ? "text-blue-200" : "text-slate-500 group-hover:text-white")} />
              )}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={handleSignOut}
          title={collapsed ? "Çıkış Yap" : undefined}
          className={cn(
            "flex items-center rounded-lg text-sm text-slate-300 hover:bg-red-900/30 hover:text-red-400 transition-colors group",
            collapsed ? "justify-center px-2 py-2" : "gap-3 px-3 py-2"
          )}
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span className="font-medium">Çıkış Yap</span>}
        </button>
      </div>
      </aside>
    </>
  );
}
