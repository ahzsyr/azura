import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { redirectUnlessAdmin } from "@/features/auth/redirect-unless-admin";
import { getPortalUser, getUserActivity, listPortalUsers } from "@/features/account/admin/user-portal.service";
import { UsersPortalList } from "@/features/account/admin/users-portal-list";
import { UserDetailForm } from "@/features/account/admin/user-detail-form";
import { UserContactActions } from "@/features/account/admin/user-contact-actions";
import { UserPermissionsForm } from "@/features/account/admin/user-permissions-form";
import { AdminUserControls } from "@/features/account/admin/admin-user-controls";
import { UserActivityPanels } from "@/features/account/admin/user-activity-panels";
import { AdminPageHeader } from "@/components/admin/layout/admin-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type RoleFilter = "all" | "admin" | "customer";

function roleFilter(value: string | undefined): RoleFilter {
  if (value === "admin" || value === "customer") return value;
  return "all";
}

export const metadata = { title: "Users" };

export default async function SettingsUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string; search?: string }>;
}) {
  const session = await auth();
  redirectUnlessAdmin(session, "/admin/settings/users");
  const params = await searchParams;
  const role = roleFilter(params.role);
  const users = await listPortalUsers(role);
  return (
    <UsersPortalList
      users={users}
      role={role}
      initialSearch={params.search ?? ""}
      actorId={session.user.id}
      actorRole={session.user.role}
      actorIsSuperAdmin={session.user.role === "SUPER_ADMIN"}
    />
  );
}

export async function SettingsUserRecordPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ usagePage?: string }>;
}) {
  const session = await auth();
  const { id } = await params;
  redirectUnlessAdmin(session, `/admin/settings/users/${id}`);
  const user = await getPortalUser(id);
  if (!user) notFound();
  const usagePage = Math.max(0, Number((await searchParams).usagePage ?? 0) || 0);
  const activity = await getUserActivity(id, usagePage);
  const actorIsSuperAdmin = session.user.role === "SUPER_ADMIN";
  const manageStaff = actorIsSuperAdmin && user.role === "ADMIN" && user.id !== session.user.id;

  return (
    <div className="space-y-6">
      {user.role === "CUSTOMER" ? (
        <UserDetailForm
          listHref="/admin/settings/users?role=customer"
          user={{
            id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            dateOfBirth: user.dateOfBirth ? new Date(user.dateOfBirth) : null,
            addressLine1: user.addressLine1,
            addressLine2: user.addressLine2,
            city: user.city,
            state: user.state,
            postalCode: user.postalCode,
            country: user.country,
            marketingOptIn: user.marketingOptIn,
            disabledAt: user.disabledAt ? new Date(user.disabledAt) : null,
            createdAt: new Date(user.createdAt),
          }}
        />
      ) : (
        <>
          <AdminPageHeader
            title={user.name}
            description={`${user.email} · ${user.role === "SUPER_ADMIN" ? "Super admin" : "Admin"}`}
            actions={
              <Button asChild variant="outline" size="sm">
                <Link href="/admin/settings/users?role=admin">Back to list</Link>
              </Button>
            }
          />
          {manageStaff ? <AdminUserControls userId={user.id} disabled={Boolean(user.disabledAt)} /> : null}
          {manageStaff ? <UserPermissionsForm userId={user.id} grants={user.adminSectionGrants} /> : null}
          {user.role === "SUPER_ADMIN" ? (
            <p className="text-muted-foreground text-sm">Super admin accounts stay view-only.</p>
          ) : null}
        </>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Contact</CardTitle>
        </CardHeader>
        <CardContent>
          <UserContactActions userId={user.id} email={user.email} phone={user.phone} />
        </CardContent>
      </Card>

      <UserActivityPanels userId={user.id} activity={activity} usagePage={usagePage} />
    </div>
  );
}
