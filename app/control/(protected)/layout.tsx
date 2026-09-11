import { AdminShell } from "@/components/admin/admin-shell";
import { requireControlUser } from "@/lib/control/server-session";

export default async function ProtectedControlLayout({ children }: { children: React.ReactNode }) {
  const user = await requireControlUser();
  return <AdminShell user={user}>{children}</AdminShell>;
}
