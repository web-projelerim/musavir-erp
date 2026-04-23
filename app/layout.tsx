import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ToastProvider } from "@/lib/context/ToastContext";
import { AuthProvider } from "@/lib/context/AuthContext";
import { PwaRegister } from "@/components/layout/PwaRegister";

export const metadata: Metadata = {
  title: "MusavirERP - Mali Müşavir Yönetim Paneli",
  description: "Mali müşavirler için modern SaaS yönetim paneli",
  applicationName: "MusavirERP",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "MusavirERP",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.ico",
    apple: "/favicon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#0f172a",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body>
        <AuthProvider>
          <ToastProvider>
            <PwaRegister />
            {children}
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
