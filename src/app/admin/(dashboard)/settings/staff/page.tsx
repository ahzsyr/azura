import { auth } from "@/lib/auth";
import { redirectUnlessAdmin } from "@/features/auth/redirect-unless-admin";
import { listStaffUsers } from "@/features/auth/admin-invite.service";
import { AdminStaffPage } from "@/components/admin/admin-staff-page";

export const metadata = {
  title: "Staff",
};

export default async function AdminStaffSettingsPage() {
  const session = await auth();
  redirectUnlessAdmin(session, "/admin/settings/staff");
  const staff = await listStaffUsers();
  return (
    <AdminStaffPage
      staff={staff}
      actorIsSuperAdmin={session.user.role === "SUPER_ADMIN"}
      actorUserId={session.user.id}
    />
  );
}
