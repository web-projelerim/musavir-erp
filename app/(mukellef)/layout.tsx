import { AuthGuard } from "@/components/auth/AuthGuard";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";

export default function MukellefLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard allowedRoles={["mukellef"]}>
      <ErrorBoundary>{children}</ErrorBoundary>
    </AuthGuard>
  );
}
