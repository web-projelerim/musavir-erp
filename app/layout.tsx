import type { Metadata } from "next";
import "./globals.css";
import { ToastProvider } from "@/lib/context/ToastContext";
import { AuthProvider } from "@/lib/context/AuthContext";

export const metadata: Metadata = {
  title: "MusavirERP - Mali Müşavir Yönetim Paneli",
  description: "Mali müşavirler için modern SaaS yönetim paneli",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.ico",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body>
        <AuthProvider>
          <ToastProvider>{children}</ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
