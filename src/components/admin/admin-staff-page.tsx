"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminPageHeader } from "@/components/admin/layout/admin-content-area";
import {
  disableAdminAction,
  enableAdminAction,
  forceAdminPasswordAction,
  inviteAdminAction,
  revokeAdminSessionsAction,
} from "@/features/auth/admin-staff.actions";
import { sendAdminPasswordResetAction } from "@/features/account/admin/customer-user-actions";

export type StaffRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  totpEnabled: boolean;
  mustChangePassword: boolean;
  disabledAt: Date | null;
  updatedAt: Date;
  createdAt: Date;
};

type Props = {
  staff: StaffRow[];
  actorIsSuperAdmin: boolean;
  actorUserId: string;
};

export function AdminStaffPage({ staff, actorIsSuperAdmin, actorUserId }: Props) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    if (!actorIsSuperAdmin) return;
    setBusy(true);
    setError("");
    setMessage("");
    const result = await inviteAdminAction({ email, name });
    setBusy(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setMessage(`Invite sent to ${email}`);
    setEmail("");
    setName("");
    window.location.reload();
  }

  async function run(
    action: () => Promise<{ success: true } | { success: false; error: string }>,
    okMessage: string,
  ) {
    setBusy(true);
    setError("");
    setMessage("");
    const result = await action();
    setBusy(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setMessage(okMessage);
    window.location.reload();
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Staff"
        description="Administrators with panel access. Only a super admin can invite or manage ADMIN staff."
      />

      {message ? (
        <p className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {actorIsSuperAdmin ? (
        <Card>
          <CardHeader>
            <CardTitle>Invite ADMIN</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={invite} className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="inviteName">Name</Label>
                <Input
                  id="inviteName"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="inviteEmail">Email</Label>
                <Input
                  id="inviteEmail"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
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

      <Card>
        <CardHeader>
          <CardTitle>Operators</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {staff.map((row) => {
            const canManage =
              actorIsSuperAdmin && row.role === "ADMIN" && row.id !== actorUserId;
            return (
              <div
                key={row.id}
                className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium">
                    {row.name}{" "}
                    <span className="text-muted-foreground font-mono text-xs">{row.email}</span>
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge variant="outline">
                      {row.role === "SUPER_ADMIN" ? "Master Admin" : row.role}
                    </Badge>
                    {row.totpEnabled ? (
                      <Badge variant="secondary">MFA on</Badge>
                    ) : (
                      <Badge variant="outline">MFA off</Badge>
                    )}
                    {row.mustChangePassword ? (
                      <Badge variant="secondary">Must change password</Badge>
                    ) : null}
                    {row.disabledAt ? (
                      <Badge variant="outline" className="border-destructive/40 text-destructive">
                        Disabled
                      </Badge>
                    ) : null}
                  </div>
                </div>
                {canManage ? (
                  <div className="flex flex-wrap gap-2">
                    {row.disabledAt ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() =>
                          void run(() => enableAdminAction(row.id), "Admin re-enabled")
                        }
                      >
                        Enable
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        disabled={busy}
                        onClick={() =>
                          void run(() => disableAdminAction(row.id), "Admin disabled")
                        }
                      >
                        Disable
                      </Button>
                    )}
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() =>
                        void run(
                          () => sendAdminPasswordResetAction(row.id),
                          "Admin password reset email sent",
                        )
                      }
                    >
                      Send reset email
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() =>
                        void run(
                          () => forceAdminPasswordAction(row.id),
                          "Password change required",
                        )
                      }
                    >
                      Force password
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() =>
                        void run(
                          () => revokeAdminSessionsAction(row.id),
                          "Sessions revoked",
                        )
                      }
                    >
                      Revoke sessions
                    </Button>
                  </div>
                ) : null}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
