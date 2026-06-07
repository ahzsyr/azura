import { AdminSessionProvider } from "@/components/admin/admin-session-provider";
import { AdminEditingLocaleProvider } from "@/components/admin/admin-editing-locale-provider";

export const dynamic = "force-dynamic";

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminSessionProvider>
      <AdminEditingLocaleProvider>{children}</AdminEditingLocaleProvider>
    </AdminSessionProvider>
  );
}
