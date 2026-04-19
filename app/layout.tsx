import type { Metadata } from "next";
import "./globals.css";
import { ToastProvider } from "@/lib/context/ToastContext";

export const metadata: Metadata = {
  title: "MusavirERP - Mali Müşavir Yönetim Paneli",
  description: "Mali müşavirler için modern SaaS yönetim paneli",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
