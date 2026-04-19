import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";

export default function MusavirLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen" style={{ background: "#f9fafb" }}>
      <Sidebar />
      <div style={{ marginLeft: "var(--sidebar-w, 220px)", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        <TopBar />
        <main style={{ flex: 1, padding: "20px 24px" }}>{children}</main>
      </div>
    </div>
  );
}
