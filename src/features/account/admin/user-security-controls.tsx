"use client";

/**
 * Administrator controls for another user's MFA.
 *
 * An Admin sees this for normal users; a Super Admin for Admins. The server
 * action applies the same hierarchy, so the buttons here are convenience only.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  allowUserMfaSelfServiceAction,
  disableUserMfaAction,
  enableUserEmailMfaAction,
} from "@/features/account/admin/user-mfa.actions";
import { resetUserSecurityAction } from "@/features/account/admin/customer-user-actions";
import type { MfaStatus } from "@/features/auth/mfa-totp.service";

type Props = {
  userId: string;
  userName: string;
  /** Status is read on the server render; router.refresh() after a change. */
  initialStatus: MfaStatus;
};

export function UserSecurityControls({ userId, userName, initialStatus }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState<MfaStatus>(initialStatus);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  function apply(patch: Partial<MfaStatus>) {
    setStatus((current) => ({ ...current, ...patch }));
  }

  async function resetSecurity() {
    setBusy(true);
    setError("");
    setMessage("");
    const result = await resetUserSecurityAction(userId);
    setBusy(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    apply({ enrolled: false, method: null, methodLabel: null, recoveryCodesRemaining: null });
    setMessage("Sessions revoked, MFA cleared and a password change required at next sign-in.");
    router.refresh();
  }

  async function enableEmail() {
    setBusy(true);
    setError("");
    setMessage("");
    const result = await enableUserEmailMfaAction(userId);
    setBusy(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    apply({
      enrolled: true,
      method: "EMAIL_OTP",
      methodLabel: "Email one-time code",
      disabledByAdmin: false,
      recoveryCodesRemaining: null,
    });
    setMessage("Email-code MFA enabled for this account.");
    router.refresh();
  }

  async function disable() {
    const confirmed = window.confirm(
      `Turn off two-step verification for ${userName}? The user will not be able to re-enable it without an administrator.`,
    );
    if (!confirmed) return;
    setBusy(true);
    setError("");
    setMessage("");
    const result = await disableUserMfaAction(userId);
    setBusy(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    apply({
      enrolled: false,
      method: null,
      methodLabel: null,
      disabledByAdmin: true,
      recoveryCodesRemaining: null,
    });
    setMessage("MFA disabled. The user must ask an administrator to turn it back on.");
    router.refresh();
  }

  async function allowSelfService() {
    setBusy(true);
    setError("");
    setMessage("");
    const result = await allowUserMfaSelfServiceAction(userId);
    setBusy(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    apply({ disabledByAdmin: false });
    setMessage("The user can enroll a factor again.");
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Security</CardTitle>
        <CardDescription>
          Password reset and two-step verification for {userName}. Changes apply to this account
          only.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={status.enrolled ? "default" : "secondary"}>
            MFA {status.enrolled ? `on — ${status.methodLabel}` : "off"}
          </Badge>
          {status.disabledByAdmin ? (
            <Badge variant="outline">Locked off by an administrator</Badge>
          ) : null}
          {status.recoveryCodesRemaining != null ? (
            <Badge variant="outline">{status.recoveryCodesRemaining} recovery codes</Badge>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => void resetSecurity()}>
            Reset password &amp; MFA
          </Button>
          {!status.enrolled ? (
            <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => void enableEmail()}>
              Enable email MFA
            </Button>
          ) : (
            <Button type="button" size="sm" variant="destructive" disabled={busy} onClick={() => void disable()}>
              Disable MFA
            </Button>
          )}
          {status.disabledByAdmin ? (
            <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => void allowSelfService()}>
              Allow self-service MFA
            </Button>
          ) : null}
        </div>

        {message ? <p className="text-sm text-emerald-700 dark:text-emerald-300">{message}</p> : null}
        {error ? <p className="text-destructive text-sm">{error}</p> : null}
      </CardContent>
    </Card>
  );
}
