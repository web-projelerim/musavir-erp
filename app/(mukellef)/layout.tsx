import { AuthGuard } from "@/components/auth/AuthGuard";

export default function MukellefLayout({ children }: { children: React.ReactNode }) {
  return <AuthGuard allowedRoles={["mukellef"]}>{children}</AuthGuard>;
}
