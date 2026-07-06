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

type NavChild = { label: string; href: string; icon: React.ElementType };

type NavItem = {
  label: string;
  href: string;
  icon: React.ElementType;
  badge: string | number | null;
  children?: NavChild[];
};

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, badge: null },
  { label: "Müşteriler", href: "/musteriler", icon: Users, badge: null },
  { label: "Görevler", href: "/gorevler", icon: CheckSquare, badge: "gorevler" },
  { label: "Raporlar", href: "/raporlar", icon: FileText, badge: null },
  {
    label: "Beyannameler",
    href: "/beyannameler",
    icon: ScrollText,
    badge: null,
    children: [
      { label: "Beyanname Takip", href: "/beyanname-takip", icon: ClipboardList },
    ],
  },
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
  const { signOut } = useAuth();
  const [aramaText, setAramaText] = useState("");

  const handleSignOut = async () => {
    await signOut();
    onClose?.();
    router.replace("/giris");
  };

  const q = aramaText.trim().toLocaleLowerCase("tr-TR");
  const searching = q.length > 0;
  const filteredNavItems = navItems.filter((item) => {
    if (item.label.toLocaleLowerCase("tr-TR").includes(q)) return true;
    return (item.children ?? []).some((c) => c.label.toLocaleLowerCase("tr-TR").includes(q));
  });

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
      <div className="flex items-center justify-between gap-2 border-b border-slate-700/50 px-4 py-5">
        <div className="flex min-w-0 items-center gap-2.5">
          <img
            src="/logo-mm.jpg"
            alt="MusavirERP logosu"
            className="h-9 w-9 flex-shrink-0 rounded-lg object-cover"
          />
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

      {/* Hızlı arama */}
      {!collapsed && (
        <div className="border-b border-slate-700/50 px-3 py-3">
          <div className="flex items-center gap-2 rounded-lg bg-slate-800 px-2.5 py-2">
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
      <nav className={cn("flex-1 space-y-0.5 px-3 py-2", collapsed ? "overflow-visible" : "overflow-y-auto")}>
        {filteredNavItems.length === 0 && (
          <p className="px-3 py-2 text-xs text-slate-500">Eşleşen menü yok</p>
        )}
        {filteredNavItems.map((item) => {
          const selfActive = pathname === item.href || pathname.startsWith(item.href + "/");
          const children = item.children ?? [];
          const hasChildren = children.length > 0;
          const childActive = children.some((c) => pathname === c.href || pathname.startsWith(c.href + "/"));
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
            <div key={item.href} className={cn(hasChildren && "group/nav relative")}>
              <Link
                href={item.href}
                onClick={onClose}
                title={collapsed ? item.label : undefined}
                className={cn(
                  "flex items-center rounded-lg text-sm transition-colors group",
                  collapsed ? "justify-center px-2 py-2" : "justify-between px-3 py-2",
                  selfActive || (collapsed && childActive)
                    ? "bg-blue-600 text-white"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                )}
              >
                <span className={cn("relative flex items-center", !collapsed && "gap-3")}>
                  <item.icon className={cn("w-4 h-4 flex-shrink-0", selfActive ? "text-white" : "text-slate-400 group-hover:text-white")} />
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
                    selfActive ? "bg-blue-500 text-white" : "bg-red-500 text-white"
                  )}>
                    {badgeValue}
                  </span>
                )}
                {!collapsed && (badgeValue === null || badgeValue === 0) && (
                  <ChevronRight className={cn(
                    "h-3.5 w-3.5 flex-shrink-0",
                    selfActive ? "text-blue-200" : "text-slate-500 group-hover:text-white",
                    hasChildren && "transition-transform group-hover/nav:rotate-90"
                  )} />
                )}
              </Link>

              {/* Alt menü — genişletilmiş modda üstüne gelince açılır */}
              {hasChildren && !collapsed && (
                <div className={cn("mt-0.5 space-y-0.5", searching ? "block" : "hidden group-hover/nav:block")}>
                  {children.map((child) => {
                    const cActive = pathname === child.href || pathname.startsWith(child.href + "/");
                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        onClick={onClose}
                        className={cn(
                          "group flex items-center gap-3 rounded-lg py-2 pl-11 pr-3 text-sm transition-colors",
                          cActive ? "bg-blue-600 text-white" : "text-slate-400 hover:bg-slate-800 hover:text-white"
                        )}
                      >
                        <child.icon className={cn("h-3.5 w-3.5 flex-shrink-0", cActive ? "text-white" : "text-slate-500 group-hover:text-white")} />
                        <span className="font-medium">{child.label}</span>
                      </Link>
                    );
                  })}
                </div>
              )}

              {/* Alt menü — daraltılmış modda sağa açılan kutu */}
              {hasChildren && collapsed && (
                <div className="absolute left-full top-0 z-50 ml-1 hidden min-w-[190px] rounded-lg border border-slate-700 bg-slate-800 p-1.5 shadow-xl group-hover/nav:block">
                  <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">{item.label}</p>
                  <Link
                    href={item.href}
                    onClick={onClose}
                    className={cn(
                      "flex items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors",
                      selfActive ? "bg-blue-600 text-white" : "text-slate-300 hover:bg-slate-700 hover:text-white"
                    )}
                  >
                    <item.icon className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="font-medium">{item.label}</span>
                  </Link>
                  {children.map((child) => {
                    const cActive = pathname === child.href || pathname.startsWith(child.href + "/");
                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        onClick={onClose}
                        className={cn(
                          "flex items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors",
                          cActive ? "bg-blue-600 text-white" : "text-slate-300 hover:bg-slate-700 hover:text-white"
                        )}
                      >
                        <child.icon className="h-3.5 w-3.5 flex-shrink-0" />
                        <span className="font-medium">{child.label}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
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
