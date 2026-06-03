import { AdminSessionProvider } from "@/components/admin/admin-session-provider";

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return <AdminSessionProvider>{children}</AdminSessionProvider>;
}
