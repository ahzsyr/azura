import "@/styles/routes/admin.css";
import { AdminShell } from "@/components/admin/layout/admin-shell";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="admin-route-root">
      <AdminShell>{children}</AdminShell>
    </div>
  );
}
