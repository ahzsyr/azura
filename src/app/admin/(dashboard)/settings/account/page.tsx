import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AdminAccountForm } from "@/components/admin/admin-account-form";

export const metadata = {
  title: "Admin account",
};

export default async function AdminAccountSettingsPage() {
  const session = await auth();
  if (!session?.user?.email) redirect("/admin/login");
  return (
    <Suspense
      fallback={<div className="p-6 text-sm text-muted-foreground">Loading admin account…</div>}
    >
      <AdminAccountForm currentEmail={session.user.email} />
    </Suspense>
  );
}
