"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  disableAdminAction,
  enableAdminAction,
  forceAdminPasswordAction,
  revokeAdminSessionsAction,
} from "@/features/auth/admin-staff.actions";
import { sendAdminPasswordResetAction } from "@/features/account/admin/customer-user-actions";

type Props = {
  userId: string;
  disabled: boolean;
};

export function AdminUserControls({ userId, disabled }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function run(
    action: () => Promise<{ success: boolean; error?: string }>,
    okMessage: string,
  ) {
    setBusy(true);
    setError("");
    setMessage("");
    const result = await action();
    setBusy(false);
    if (!result.success) {
      setError(result.error ?? "Action failed");
      return;
    }
    setMessage(okMessage);
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Account</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        {disabled ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => void run(() => enableAdminAction(userId), "Account enabled.")}
          >
            Enable
          </Button>
        ) : (
          <Button
            type="button"
            size="sm"
            variant="destructive"
            disabled={busy}
            onClick={() => void run(() => disableAdminAction(userId), "Account disabled.")}
          >
            Disable
          </Button>
        )}
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() => void run(() => sendAdminPasswordResetAction(userId), "Reset email sent.")}
        >
          Send reset email
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() => void run(() => forceAdminPasswordAction(userId), "Password change required.")}
        >
          Force password change
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() => void run(() => revokeAdminSessionsAction(userId), "Sessions revoked.")}
        >
          Revoke sessions
        </Button>
        {message ? <p className="w-full text-sm text-emerald-700 dark:text-emerald-300">{message}</p> : null}
        {error ? <p className="text-destructive w-full text-sm">{error}</p> : null}
      </CardContent>
    </Card>
  );
}
