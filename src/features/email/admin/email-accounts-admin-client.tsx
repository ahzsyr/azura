"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  countFormsReferencingEmailAccountAction,
  deleteEmailAccountAction,
  listEmailAccountsAction,
  sendEmailAccountTestAction,
  upsertEmailAccountAction,
} from "@/features/email/email-accounts.actions";
import type {
  EmailAccountPublic,
  UpsertEmailAccountInput,
} from "@/features/email/email-accounts.types";
import { Mail, Plus, Trash2 } from "lucide-react";

type Draft = {
  id?: string;
  name: string;
  provider: "resend" | "smtp";
  from: string;
  resendApiKey: string;
  smtpHost: string;
  smtpPort: string;
  smtpSecure: boolean;
  smtpUser: string;
  smtpPass: string;
};

const emptyDraft = (): Draft => ({
  name: "",
  provider: "resend",
  from: "",
  resendApiKey: "",
  smtpHost: "",
  smtpPort: "587",
  smtpSecure: false,
  smtpUser: "",
  smtpPass: "",
});

export function EmailAccountsAdminClient({
  initialAccounts,
  canManage = true,
}: {
  initialAccounts: EmailAccountPublic[];
  /** Master Admin (SUPER_ADMIN) may create/edit/delete/test. Others are read-only. */
  canManage?: boolean;
}) {
  const [accounts, setAccounts] = useState(initialAccounts);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [testTo, setTestTo] = useState("");
  const [testingId, setTestingId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await listEmailAccountsAction();
      if (res.success && res.data) {
        setAccounts(res.data.accounts);
        return;
      }
      if (!res.success) {
        setMessage({ ok: false, text: res.error });
      }
    } catch (e) {
      setMessage({
        ok: false,
        text: e instanceof Error ? e.message : "Failed to refresh email accounts",
      });
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const openCreate = () => {
    if (!canManage) {
      setMessage({
        ok: false,
        text: "Only the Master Admin can create Email Accounts.",
      });
      return;
    }
    setMessage(null);
    setDraft(emptyDraft());
  };

  const openEdit = (account: EmailAccountPublic) => {
    if (!canManage) {
      setMessage({
        ok: false,
        text: "Only the Master Admin can edit Email Accounts.",
      });
      return;
    }
    setMessage(null);
    setDraft({
      id: account.id,
      name: account.name,
      provider: account.provider === "smtp" ? "smtp" : "resend",
      from: account.from,
      resendApiKey: "",
      smtpHost: account.smtpHost ?? "",
      smtpPort: String(account.smtpPort ?? 587),
      smtpSecure: account.smtpSecure ?? false,
      smtpUser: account.smtpUser ?? "",
      smtpPass: "",
    });
  };

  const save = async () => {
    if (!draft) return;
    setBusy(true);
    setMessage(null);
    const input: UpsertEmailAccountInput = {
      id: draft.id,
      name: draft.name,
      provider: draft.provider,
      from: draft.from,
      resendApiKey: draft.resendApiKey || undefined,
      smtp: draft.provider === "smtp" ? {
        host: draft.smtpHost,
        port: Number(draft.smtpPort),
        secure: draft.smtpSecure,
        user: draft.smtpUser || undefined,
        pass: draft.smtpPass || undefined,
      } : undefined,
    };
    const res = await upsertEmailAccountAction(input);
    setBusy(false);
    if (!res.success) {
      setMessage({ ok: false, text: res.error });
      return;
    }
    setDraft(null);
    setMessage({ ok: true, text: "Email account saved." });
    await refresh();
  };

  const remove = async (account: EmailAccountPublic) => {
    if (!canManage) {
      setMessage({
        ok: false,
        text: "Only the Master Admin can delete Email Accounts.",
      });
      return;
    }
    setBusy(true);
    setMessage(null);
    const refs = await countFormsReferencingEmailAccountAction(account.id);
    const count = refs.success ? (refs.data?.count ?? 0) : 0;
    const confirmed = window.confirm(
      count > 0
        ? `"${account.name}" is used by ${count} form(s). Delete anyway? Those forms will fall back to env email settings.`
        : `Delete email account "${account.name}"?`,
    );
    if (!confirmed) {
      setBusy(false);
      return;
    }
    const res = await deleteEmailAccountAction(account.id);
    setBusy(false);
    if (!res.success) {
      setMessage({ ok: false, text: res.error });
      return;
    }
    setMessage({ ok: true, text: "Email account deleted." });
    if (draft?.id === account.id) setDraft(null);
    await refresh();
  };

  const sendTest = async (accountId: string) => {
    if (!canManage) {
      setMessage({
        ok: false,
        text: "Only the Master Admin can send test emails.",
      });
      return;
    }
    setTestingId(accountId);
    setMessage(null);
    const res = await sendEmailAccountTestAction({ accountId, to: testTo });
    setTestingId(null);
    if (!res.success) {
      setMessage({ ok: false, text: res.error });
      return;
    }
    setMessage({ ok: true, text: "Test email sent." });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold">
            <Mail className="h-5 w-5" />
            Email Accounts
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Named email accounts using Resend or SMTP. Forms pick one under Automation → Email Notifications.
            Secrets are stored sealed and never shown again after save.
            {!canManage
              ? " Viewing only — ask the Master Admin to add or change accounts."
              : null}
          </p>
        </div>
        {canManage ? (
          <Button type="button" onClick={openCreate}>
            <Plus className="mr-1 h-4 w-4" />
            Add account
          </Button>
        ) : null}
      </div>

      {!canManage ? (
        <p className="rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-sm text-muted-foreground">
          Only the <strong className="text-foreground">Master Admin</strong> can create or edit Email
          Accounts. You can still select existing accounts on forms and in portal settings when
          permitted.
        </p>
      ) : null}

      {message && (
        <p className={`text-sm ${message.ok ? "text-emerald-700 dark:text-emerald-400" : "text-destructive"}`}>
          {message.text}
        </p>
      )}

      {canManage ? (
      <Card className="space-y-3 p-4">
        <Label className="text-xs">Test recipient (for Send test on an account)</Label>
        <Input
          type="email"
          placeholder="you@example.com"
          value={testTo}
          onChange={(e) => setTestTo(e.target.value)}
        />
      </Card>
      ) : null}

      <div className="space-y-3">
        {accounts.length === 0 && (
          <Card className="p-6 text-sm text-muted-foreground">
            No email accounts yet. Add one to send form notifications without relying only on env vars.
          </Card>
        )}
        {accounts.map((account) => {
          const ready = account.provider === "resend" ? account.hasResendApiKey : account.provider === "smtp" && account.hasSmtpCredentials;
          return (
            <Card key={account.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{account.name}</p>
                  <Badge variant={ready ? "default" : "secondary"}>
                    {ready ? "Ready" : "Incomplete"}
                  </Badge>
                  <Badge variant="outline">
                    {account.provider === "smtp" ? "SMTP" : account.provider === "resend" ? "Resend" : account.provider}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">From: {account.from}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {canManage ? (
                  <>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      disabled={Boolean(testingId) || !testTo.includes("@") || !ready}
                      onClick={() => void sendTest(account.id)}
                    >
                      {testingId === account.id ? "Sending…" : "Send test"}
                    </Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => openEdit(account)}>
                      Edit
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() => void remove(account)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                ) : null}
              </div>
            </Card>
          );
        })}
      </div>

      {draft && canManage && (
        <Card className="space-y-4 p-4">
          <h2 className="text-sm font-semibold">{draft.id ? "Edit account" : "New account"}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="text-xs">Name</Label>
              <Input
                className="mt-1"
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              placeholder="BRT Email"
              />
            </div>
            <div>
              <Label className="text-xs">Provider</Label>
              <select
                className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={draft.provider}
                onChange={(e) => setDraft({ ...draft, provider: e.target.value as Draft["provider"] })}
              >
                <option value="resend">Resend API</option>
                <option value="smtp">SMTP</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <Label className="text-xs">From address</Label>
              <Input
                className="mt-1"
                type="email"
                value={draft.from}
                onChange={(e) => setDraft({ ...draft, from: e.target.value })}
                placeholder="noreply@your-domain.com"
              />
            </div>
          </div>

          {draft.provider === "resend" ? <div>
            <Label className="text-xs">
              Resend API key{draft.id ? " (leave blank to keep existing)" : ""}
            </Label>
            <Input
              className="mt-1"
              type="password"
              autoComplete="new-password"
              value={draft.resendApiKey}
              onChange={(e) => setDraft({ ...draft, resendApiKey: e.target.value })}
              placeholder={draft.id ? "••••••••" : "re_…"}
            />
          </div> : <div className="grid gap-3 sm:grid-cols-2">
            <div><Label className="text-xs">SMTP host</Label><Input className="mt-1" value={draft.smtpHost} onChange={(e) => setDraft({ ...draft, smtpHost: e.target.value })} placeholder="smtp.example.com" /></div>
            <div><Label className="text-xs">Port</Label><Input className="mt-1" type="number" value={draft.smtpPort} onChange={(e) => setDraft({ ...draft, smtpPort: e.target.value })} /></div>
            <div><Label className="text-xs">Username (optional)</Label><Input className="mt-1" autoComplete="off" value={draft.smtpUser} onChange={(e) => setDraft({ ...draft, smtpUser: e.target.value })} /></div>
            <div><Label className="text-xs">Password{draft.id ? " (blank keeps existing)" : ""}</Label><Input className="mt-1" type="password" autoComplete="new-password" value={draft.smtpPass} onChange={(e) => setDraft({ ...draft, smtpPass: e.target.value })} /></div>
            <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" checked={draft.smtpSecure} onChange={(e) => setDraft({ ...draft, smtpSecure: e.target.checked })} />Use TLS (typically port 465)</label>
          </div>}

          <div className="flex flex-wrap gap-2">
            <Button type="button" disabled={busy} onClick={() => void save()}>
              {busy ? "Saving…" : "Save"}
            </Button>
            <Button type="button" variant="outline" onClick={() => setDraft(null)}>
              Cancel
            </Button>
          </div>
        </Card>
      )}

      <p className="text-xs text-muted-foreground">
        After creating an account, open a form → Automation →{" "}
        <Link href="/admin/forms" className="underline">
          Email Notifications
        </Link>{" "}
        and select it.
      </p>
    </div>
  );
}
