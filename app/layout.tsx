import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MusavirERP - Mali Müşavir Yönetim Paneli",
  description: "Mali müşavirler için modern SaaS yönetim paneli",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
