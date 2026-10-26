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
import { UserRoleSelect } from "@/features/account/admin/user-role-select";
import { UserSecurityControls } from "@/features/account/admin/user-security-controls";
import { getMfaStatusForUser, type MfaStatus } from "@/features/auth/mfa-totp.service";
import { AdminPageHeader } from "@/components/admin/layout/admin-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  canManageUser,
  canManageUserSecurity,
  isSuperAdminRole,
  roleLabel,
} from "@/features/auth/role-policy";

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
      actorIsSuperAdmin={isSuperAdminRole(session.user.role)}
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

  const hierarchy = {
    actorId: session.user.id,
    actorRole: session.user.role,
    targetId: user.id,
    targetRole: user.role,
  };
  // Server-enforced rule, mirrored here only to decide what to render.
  const canEdit = canManageUser(hierarchy);
  const canManageSecurity = canManageUserSecurity(hierarchy);
  const canChangeRole =
    isSuperAdminRole(session.user.role) && user.role !== "SUPER_ADMIN" && canEdit;
  const isSelf = user.id === session.user.id;

  // Read on the server so the controls render with the real state (no effect-
  // driven fetch); mutations call router.refresh() to re-read.
  const mfaStatus: MfaStatus | null = canManageSecurity
    ? await getMfaStatusForUser(user.id)
    : null;

  const securityCard =
    canManageSecurity && mfaStatus ? (
      <UserSecurityControls userId={user.id} userName={user.name} initialStatus={mfaStatus} />
    ) : null;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={user.name}
        description={`${user.email} · ${roleLabel(user.role)}`}
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href={user.role === "CUSTOMER" ? "/admin/settings/users?role=customer" : "/admin/settings/users?role=admin"}>
              Back to list
            </Link>
          </Button>
        }
      />

      {user.role === "SUPER_ADMIN" ? (
        <p className="text-muted-foreground text-sm">
          Super Admin accounts stay view-only — manage them from Account settings on that account.
        </p>
      ) : null}

      {user.role === "CUSTOMER" && canEdit ? (
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
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Role &amp; access</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={user.role === "CUSTOMER" ? "outline" : "default"}>
              {roleLabel(user.role)}
            </Badge>
            {user.mfaEnrolled ? (
              <Badge variant="secondary">MFA: {user.mfaMethodLabel}</Badge>
            ) : (
              <Badge variant="outline">MFA: off</Badge>
            )}
          </div>
          {canChangeRole ? (
            <UserRoleSelect
              userId={user.id}
              role={user.role === "ADMIN" ? "ADMIN" : "CUSTOMER"}
              userName={user.name}
            />
          ) : null}
          {isSelf ? (
            <p className="text-muted-foreground text-sm">This is your own account.</p>
          ) : null}
          {!canEdit && !isSelf ? (
            <p className="text-muted-foreground text-sm">
              You can view this account, but only an administrator ranked above it can change it.
            </p>
          ) : null}
          {canEdit && user.role === "ADMIN" ? (
            <UserPermissionsForm userId={user.id} grants={user.adminSectionGrants} />
          ) : null}
          {canEdit && user.role === "ADMIN" ? (
            <AdminUserControls userId={user.id} disabled={Boolean(user.disabledAt)} />
          ) : null}
        </CardContent>
      </Card>

      {securityCard}

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
