"use client";

/**
 * Self-service two-step verification for the signed-in account (any role).
 *
 * Both methods are offered side by side: an authenticator app (TOTP with
 * recovery codes) or a code emailed by the configured sender. The server reads
 * the target account from the session, so this component can only ever change
 * the factor of the person using it.
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PasswordField } from "@/components/account/password-field";
import {
  confirmSelfAuthenticatorEnrollmentAction,
  disableSelfMfaAction,
  enableSelfEmailOtpMfaAction,
  startSelfAuthenticatorEnrollmentAction,
} from "@/features/auth/mfa-self.actions";
import type { MfaStatus } from "@/features/auth/mfa-totp.service";

/**
 * Status comes from the server render (`getMfaStatusForUser(session.user.id)`)
 * so the card paints with real state; mutations update the local copy from
 * their own result.
 */
export type SelfMfaView = MfaStatus & {
  emailOtpAvailable: boolean;
};

type Props = {
  initialStatus: SelfMfaView;
  /** When false, the parent owns the page chrome (customer account page). */
  embedded?: boolean;
};

export function AccountMfaCard({ initialStatus, embedded = false }: Props) {
  const [status, setStatus] = useState<SelfMfaView>(initialStatus);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [mode, setMode] = useState<"idle" | "authenticator" | "disable">("idle");
  const [secret, setSecret] = useState<string | null>(null);
  const [otpauthUrl, setOtpauthUrl] = useState<string | null>(null);
  const [qrCodeSvg, setQrCodeSvg] = useState<string | null>(null);
  const [confirmCode, setConfirmCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [password, setPassword] = useState("");

  function begin(val: "idle" | "authenticator" | "disable") {
    setError("");
    setMessage("");
    setMode(val);
    setSecret(null);
    setOtpauthUrl(null);
    setQrCodeSvg(null);
    setConfirmCode("");
    setPassword("");
  }

  async function startAuthenticator() {
    setBusy(true);
    setError("");
    const result = await startSelfAuthenticatorEnrollmentAction();
    setBusy(false);
    if (!result.success || !result.data) {
      setError(result.success ? "Unable to start enrollment" : result.error);
      return;
    }
    setSecret(result.data.secret);
    setOtpauthUrl(result.data.otpauthUrl);
    setQrCodeSvg(result.data.qrCodeSvg);
    setMode("authenticator");
  }

  async function confirmAuthenticator() {
    setBusy(true);
    setError("");
    const result = await confirmSelfAuthenticatorEnrollmentAction({ code: confirmCode });
    setBusy(false);
    if (!result.success || !result.data) {
      setError(result.success ? "Invalid code" : result.error);
      return;
    }
    setRecoveryCodes(result.data.recoveryCodes);
    setMessage("Two-step verification is on. Store the recovery codes now — they are shown once.");
    setSecret(null);
    setOtpauthUrl(null);
    setQrCodeSvg(null);
    setConfirmCode("");
    setMode("idle");
  }

  async function enableEmail() {
    setBusy(true);
    setError("");
    const result = await enableSelfEmailOtpMfaAction();
    setBusy(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setStatus((current) => ({
      ...current,
      enrolled: true,
      method: "EMAIL_OTP",
      methodLabel: "Email one-time code",
      disabledByAdmin: false,
      recoveryCodesRemaining: null,
    }));
    setMessage("Email code enabled. We will email you a code each time you sign in.");
  }

  async function disable() {
    setBusy(true);
    setError("");
    const result = await disableSelfMfaAction({
      password: password || undefined,
      mfaCode: confirmCode || undefined,
    });
    setBusy(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setStatus((current) => ({
      ...current,
      enrolled: false,
      method: null,
      methodLabel: null,
      enrolledAt: null,
      recoveryCodesRemaining: null,
    }));
    setMessage("Two-step verification is off for your account.");
    setPassword("");
    setConfirmCode("");
    setMode("idle");
  }

  const body = (
    <div className="space-y-4">
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
      {message ? (
        <p className="text-sm text-emerald-700 dark:text-emerald-300">{message}</p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={status.enrolled ? "default" : "secondary"}>
          {status.enrolled ? `On — ${status.methodLabel}` : "Off"}
        </Badge>
        {status.method === "AUTHENTICATOR" && status.recoveryCodesRemaining != null ? (
          <Badge variant="outline">{status.recoveryCodesRemaining} recovery codes left</Badge>
        ) : null}
        {status.disabledByAdmin ? (
          <Badge variant="outline" className="text-destructive">
            Turned off by an administrator
          </Badge>
        ) : null}
      </div>

      {status.disabledByAdmin ? (
        <p className="text-muted-foreground text-sm">
          An administrator turned off two-step verification for your account. Ask them to allow it
          again before you enroll a new factor.
        </p>
      ) : recoveryCodes ? (
        <div className="rounded-md border bg-muted/30 p-3">
          <p className="mb-2 text-sm font-medium">Recovery codes — save these now</p>
          <ul className="space-y-1 font-mono text-xs">
            {recoveryCodes.map((recovery) => (
              <li key={recovery}>{recovery}</li>
            ))}
          </ul>
          <p className="text-muted-foreground mt-2 text-xs">
            Each code works once if you lose access to your authenticator.
          </p>
        </div>
      ) : null}

      {!status.enrolled && !status.disabledByAdmin ? (
        <div className="space-y-4">
          {mode === "authenticator" && secret ? (
            <div className="space-y-4">
              <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
                <li>Open an authenticator app (Google Authenticator, 1Password, Authy…).</li>
                <li>Scan the QR code, or enter the setup key by hand.</li>
                <li>Enter the 6-digit code it shows to finish.</li>
              </ol>
              <div className="flex flex-wrap items-start gap-6">
                {qrCodeSvg ? (
                  <div className="rounded-md border bg-white p-3">
                    <div
                      className="h-48 w-48"
                      role="img"
                      aria-label="QR code for adding this account to an authenticator app"
                      // Server-generated, trusted SVG encoding the same otpauth URI as the key.
                      dangerouslySetInnerHTML={{ __html: qrCodeSvg }}
                    />
                  </div>
                ) : null}
                <div className="min-w-[14rem] flex-1 space-y-2">
                  <p className="text-muted-foreground text-xs">Setup key</p>
                  <code className="block select-all rounded border bg-muted/40 px-2 py-1 font-mono text-xs break-all">
                    {secret}
                  </code>
                  {otpauthUrl ? (
                    <details className="text-xs">
                      <summary className="text-muted-foreground cursor-pointer">
                        Show setup URI (advanced)
                      </summary>
                      <p className="mt-1 font-mono break-all">{otpauthUrl}</p>
                    </details>
                  ) : null}
                </div>
              </div>
              <div className="space-y-2">
                <label htmlFor="confirmCode" className="text-sm font-medium">
                  Authenticator code
                </label>
                <input
                  id="confirmCode"
                  className="border-input bg-background flex h-9 w-full rounded-md border px-3 text-sm"
                  inputMode="numeric"
                  maxLength={6}
                  value={confirmCode}
                  onChange={(e) => setConfirmCode(e.target.value)}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" disabled={busy || confirmCode.length !== 6} onClick={() => void confirmAuthenticator()}>
                  Confirm and turn on
                </Button>
                <Button type="button" variant="outline" disabled={busy} onClick={() => begin("idle")}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button type="button" disabled={busy} onClick={() => void startAuthenticator()}>
                Use an authenticator app
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={busy || status.emailOtpAvailable === false}
                onClick={() => void enableEmail()}
              >
                Email me a code at sign-in
              </Button>
            </div>
          )}
          {status.emailOtpAvailable === false ? (
            <p className="text-muted-foreground text-xs">
              Email codes need an OTP email account. Ask an administrator to choose one in
              Settings → Email Accounts → Email delivery.
            </p>
          ) : null}
        </div>
      ) : null}

      {status.enrolled ? (
        <div className="space-y-3">
          {mode === "disable" ? (
            <>
              <PasswordField
                id="disablePassword"
                label="Current password"
                value={password}
                onChange={setPassword}
                autoComplete="current-password"
              />
              <div className="space-y-1.5">
                <label htmlFor="disableCode" className="text-sm font-medium">
                  Or a current code / recovery code
                </label>
                <input
                  id="disableCode"
                  className="border-input bg-background flex h-9 w-full rounded-md border px-3 text-sm"
                  value={confirmCode}
                  onChange={(e) => setConfirmCode(e.target.value)}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="destructive"
                  disabled={busy || (!password && !confirmCode)}
                  onClick={() => void disable()}
                >
                  Turn off two-step verification
                </Button>
                <Button type="button" variant="outline" disabled={busy} onClick={() => begin("idle")}>
                  Cancel
                </Button>
              </div>
            </>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" disabled={busy} onClick={() => begin("disable")}>
                Turn off
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={busy}
                onClick={() => void (status.method === "AUTHENTICATOR" ? startAuthenticator() : enableEmail())}
              >
                Switch method
              </Button>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );

  if (embedded) return body;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Two-step verification</CardTitle>
        <CardDescription>
          Add a second step at sign-in. You choose an authenticator app or a code emailed to you —
          the setting applies to your account only.
        </CardDescription>
      </CardHeader>
      <CardContent>{body}</CardContent>
    </Card>
  );
}
