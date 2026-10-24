"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminPageHeader } from "@/components/admin/layout/admin-shell";
import { formatAdminDate } from "@/lib/admin-date-format";
import type { PortalUserRow } from "@/features/account/admin/user-portal-types";
import { UserStatusButton } from "@/features/account/admin/user-status-button";
import { inviteAdminAction } from "@/features/auth/admin-staff.actions";

type RoleFilter = "all" | "admin" | "customer";

type Props = {
  users: PortalUserRow[];
  role: RoleFilter;
  actorId: string;
  actorRole: string;
  actorIsSuperAdmin: boolean;
  initialSearch?: string;
};

const FILTERS: { id: RoleFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "admin", label: "Admins" },
  { id: "customer", label: "Customers" },
];

function statusLabel(user: PortalUserRow): string {
  if (user.disabledAt) return "Disabled";
  if (user.lockedUntil && new Date(user.lockedUntil).getTime() > Date.now()) return "Locked";
  if (user.mustChangePassword) return "Must change password";
  return "Active";
}

function roleLabel(role: string): string {
  if (role === "SUPER_ADMIN") return "Super admin";
  if (role === "ADMIN") return "Admin";
  return "Customer";
}

export function UsersPortalList({
  users,
  role,
  actorId,
  actorRole,
  actorIsSuperAdmin,
  initialSearch = "",
}: Props) {
  const router = useRouter();
  const [search, setSearch] = useState(initialSearch);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (user) =>
        user.name.toLowerCase().includes(q) ||
        user.email.toLowerCase().includes(q) ||
        (user.phone ?? "").toLowerCase().includes(q),
    );
  }, [users, search]);

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    const result = await inviteAdminAction({ email: inviteEmail, name: inviteName });
    setBusy(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setMessage(`Invite sent to ${inviteEmail}`);
    setInviteEmail("");
    setInviteName("");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Users"
        description="Admin and customer accounts, access, and contact."
      />

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((filter) => (
          <Button key={filter.id} asChild size="sm" variant={role === filter.id ? "default" : "outline"}>
            <Link href={filter.id === "all" ? "/admin/settings/users" : `/admin/settings/users?role=${filter.id}`}>
              {filter.label}
            </Link>
          </Button>
        ))}
      </div>

      <div className="max-w-md">
        <Input
          placeholder="Search name, email, or phone…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {message ? (
        <p className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm">{message}</p>
      ) : null}
      {error ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {actorIsSuperAdmin && role !== "customer" ? (
        <Card>
          <CardHeader>
            <CardTitle>Invite admin</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={invite} className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="inviteName">Name</Label>
                <Input id="inviteName" value={inviteName} onChange={(e) => setInviteName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="inviteEmail">Email</Label>
                <Input
                  id="inviteEmail"
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  required
                />
              </div>
              <div className="flex items-end">
                <Button type="submit" disabled={busy}>
                  Send invite
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Last login</th>
              <th className="px-4 py-3 font-medium">Joined</th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-muted-foreground px-4 py-8 text-center">
                  No accounts found.
                </td>
              </tr>
            ) : (
              filtered.map((user) => (
                <tr key={user.id} className="border-t">
                  <td className="px-4 py-3">{user.name}</td>
                  <td className="px-4 py-3">{user.email}</td>
                  <td className="px-4 py-3">
                    <Badge variant="outline">{roleLabel(user.role)}</Badge>
                  </td>
                  <td className="px-4 py-3">{statusLabel(user)}</td>
                  <td className="text-muted-foreground px-4 py-3">
                    {user.lastLoginAt ? formatAdminDate(user.lastLoginAt) : "—"}
                  </td>
                  <td className="text-muted-foreground px-4 py-3">{formatAdminDate(user.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <UserStatusButton
                        userId={user.id}
                        role={user.role}
                        disabled={Boolean(user.disabledAt)}
                        actorId={actorId}
                        actorRole={actorRole}
                      />
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/admin/settings/users/${user.id}`}>Record</Link>
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
