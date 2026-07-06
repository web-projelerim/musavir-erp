import { AuthGuard } from "@/components/auth/AuthGuard";
import { MusavirShell } from "@/components/layout/MusavirShell";

export default function MusavirLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard allowedRoles={["musavir"]}>
      <MusavirShell>{children}</MusavirShell>
    </AuthGuard>
  );
}
