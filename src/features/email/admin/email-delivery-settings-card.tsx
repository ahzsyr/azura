"use client";

/**
 * Site-wide authentication sender ("Email delivery"), shown with the Email
 * Accounts it belongs to.
 *
 * What this screen owns:
 * - which Email Account every authentication email leaves from (signup
 *   verification, email-code two-step verification, password-reset and
 *   sign-in codes) — for customers, Admins and the Super Admin alike;
 * - the optional From name for those messages;
 * - an end-to-end test that mails the signed-in admin through the very same
 *   resolver the codes use.
 *
 * Any administrator may save it: the sender belongs to the site, never to the
 * account that configured it.
 */

import { useCallback, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  saveEmailDeliverySettingsAction,
  sendEmailDeliveryTestAction,
} from "@/features/account/admin/customer-user-actions";
import type { EmailAccountPublic } from "@/features/email/email-accounts.types";

type Reason =
  | "ready"
  | "no_accounts"
  | "not_selected_multiple"
  | "selected_missing"
  | "selected_incomplete";

export type EmailDeliveryStatus = {
  /** Account authentication mail actually leaves from (resolved server-side). */
  effectiveAccountId: string | null;
  effectiveAccountName: string | null;
  effectiveFrom: string | null;
  reason: Reason;
};

const REASON_COPY: Record<Reason, string> = {
  ready: "Email codes and reset codes are being delivered.",
  no_accounts:
    "No sendable Email Account yet. Add one above with its credentials (and a verified sender domain), then pick it here.",
  not_selected_multiple:
    "Several Email Accounts exist. Choose the one authentication emails should leave from — until then, no code is sent.",
  selected_missing: "The selected Email Account no longer exists. Choose another account.",
  selected_incomplete:
    "The selected Email Account is missing credentials. Finish it above, or choose another account.",
};

export function EmailDeliverySettingsCard({
  selectedId,
  fromName,
  initialStatus,
  accounts,
}: {
  selectedId: string;
  fromName: string;
  initialStatus: EmailDeliveryStatus;
  accounts: EmailAccountPublic[];
}) {
  const [accountId, setAccountId] = useState(selectedId);
  const [displayName, setDisplayName] = useState(fromName);
  const [status, setStatus] = useState(initialStatus);
  const [busy, setBusy] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [saved, setSaved] = useState({ accountId: selectedId, fromName });

  const dirty = accountId !== saved.accountId || displayName !== saved.fromName;

  const sendable = useMemo(
    () =>
      accounts.filter((account) =>
        account.provider === "resend"
          ? account.hasResendApiKey
          : account.provider === "smtp" && account.hasSmtpCredentials,
      ),
    [accounts],
  );

  const save = useCallback(async () => {
    setBusy(true);
    setMessage(null);
    const result = await saveEmailDeliverySettingsAction({
      emailAccountId: accountId,
      fromName: displayName,
    });
    setBusy(false);
    if (!result.success) {
      setMessage({ ok: false, text: result.error });
      return;
    }
    setSaved({ accountId, fromName: displayName });
    const chosen = accounts.find((account) => account.id === accountId) ?? null;
    setStatus(
      accountId
        ? {
            effectiveAccountId: chosen?.id ?? null,
            effectiveAccountName: chosen?.name ?? null,
            effectiveFrom: chosen?.from ?? null,
            reason: chosen ? "ready" : "selected_missing",
          }
        : sendable.length === 1
          ? {
              effectiveAccountId: sendable[0].id,
              effectiveAccountName: sendable[0].name,
              effectiveFrom: sendable[0].from,
              reason: "ready",
            }
          : {
              effectiveAccountId: null,
              effectiveAccountName: null,
              effectiveFrom: null,
              reason: sendable.length === 0 ? "no_accounts" : "not_selected_multiple",
            },
    );
    setMessage({ ok: true, text: "Email delivery saved. Every authentication email will use this sender." });
  }, [accountId, displayName, accounts, sendable]);

  const sendTest = useCallback(async () => {
    setTesting(true);
    setMessage(null);
    const result = await sendEmailDeliveryTestAction();
    setTesting(false);
    setMessage(
      result.success
        ? {
            ok: true,
            text: `Test email sent to your admin address through ${result.from || "the configured account"}. Check the inbox (and spam) — it uses the same path as the codes.`,
          }
        : { ok: false, text: result.error },
    );
  }, []);

  const ready = status.reason === "ready";

  return (
    <section className="space-y-4 rounded-lg border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Email delivery</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            The sender for every authentication email: signup verification, email-code two-step
            verification, password-reset and sign-in codes — for customers, Admins and the Super
            Admin alike. Credentials live in the Email Accounts above; this only chooses which one
            is used.
          </p>
        </div>
        <Badge variant={ready ? "default" : "secondary"}>
          {ready ? "Delivering" : "Not delivering"}
        </Badge>
      </div>

      <div
        className={
          ready
            ? "rounded-md border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-sm"
            : "rounded-md border border-amber-500/40 bg-amber-500/5 px-3 py-2 text-sm"
        }
      >
        <p>{REASON_COPY[status.reason]}</p>
        {status.effectiveFrom ? (
          <p className="text-muted-foreground mt-1 text-xs">
            Sending from <span className="font-mono text-foreground">{status.effectiveFrom}</span>
            {status.effectiveAccountName ? ` (${status.effectiveAccountName})` : ""}
          </p>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="deliveryEmailAccountId" className="text-sm font-medium">
            OTP email account
          </Label>
          <select
            id="deliveryEmailAccountId"
            className="border-input bg-background flex h-9 w-full rounded-md border px-3 text-sm"
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
          >
            <option value="">
              {sendable.length === 1
                ? `Automatic — ${sendable[0].name} (${sendable[0].from})`
                : "Select an Email Account"}
            </option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name} ({account.from})
                {sendable.some((a) => a.id === account.id) ? "" : " — incomplete"}
              </option>
            ))}
          </select>
          <p className="text-muted-foreground text-xs">
            Every account type uses this sender. With a sendable account selected, admin sign-in
            requires a 5-minute email code.
          </p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="deliveryFromName" className="text-sm font-medium">
            From name (optional)
          </Label>
          <Input
            id="deliveryFromName"
            value={displayName}
            maxLength={120}
            placeholder="Your site name"
            onChange={(e) => setDisplayName(e.target.value)}
          />
          <p className="text-muted-foreground text-xs">
            Shown as the sender name next to the address above.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" disabled={busy || !dirty} onClick={() => void save()}>
          {busy ? "Saving…" : "Save email delivery"}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={testing || dirty || !ready}
          onClick={() => void sendTest()}
        >
          {testing ? "Sending…" : "Send test to my admin email"}
        </Button>
        {dirty ? (
          <span className="text-muted-foreground text-xs">Unsaved changes.</span>
        ) : null}
      </div>

      {message ? (
        <p
          className={`text-sm ${message.ok ? "text-emerald-700 dark:text-emerald-400" : "text-destructive"}`}
          role="status"
        >
          {message.text}
        </p>
      ) : null}
    </section>
  );
}
