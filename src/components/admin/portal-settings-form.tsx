"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ExternalLink, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminPageHeader } from "@/components/admin/layout/admin-shell";
import { AdminSettingsLayout } from "@/components/admin/layout/admin-settings-layout";
import {
  SettingsSection,
  TextAreaField,
  TextField,
  ToggleField,
} from "@/components/admin/settings-fields";
import { updatePortalSettings } from "@/features/setup/actions/update-portal-settings";
import {
  saveEmailVerificationSettingsAction,
  savePasswordResetSettingsAction,
} from "@/features/account/admin/customer-user-actions";
import { isPortalSettingsTab, PORTAL_SETTINGS_TABS } from "@/features/account/admin/portal-settings-tabs";
import type {
  EmailVerificationSettings,
  PasswordResetSettings,
} from "@/features/account/account-settings.schema";
import { routing } from "@/i18n/routing";
import { useAdminPageActions } from "@/hooks/use-admin-page-actions";
import { useAdminUiStore } from "@/stores/admin-ui-store";

type EmailAccountOption = { id: string; name: string; from: string };

type Props = {
  registrationEnabled: boolean;
  passwordReset: PasswordResetSettings;
  emailVerification: EmailVerificationSettings;
  emailAccounts: EmailAccountOption[];
};

const PUBLIC_ACCOUNT_BASE = `/${routing.defaultLocale}/account`;

function EmailAccountSelect({
  id,
  label,
  value,
  onChange,
  emailAccounts,
  allowEnvFallback,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (id: string) => void;
  emailAccounts: EmailAccountOption[];
  allowEnvFallback?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <select
        id={id}
        className="border-input bg-background flex h-9 w-full rounded-md border px-3 text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">
          {allowEnvFallback ? "Env default (RESEND / SMTP)" : "Select an Email Account"}
        </option>
        {emailAccounts.map((account) => (
          <option key={account.id} value={account.id}>
            {account.name} ({account.from})
          </option>
        ))}
      </select>
      <p className="text-xs text-muted-foreground">
        Credentials live under{" "}
        <Link href="/admin/settings/email-accounts" className="underline">
          Settings → Email Accounts
        </Link>
        .
      </p>
    </div>
  );
}

export function PortalSettingsForm({
  registrationEnabled: initial,
  passwordReset: initialReset,
  emailVerification: initialVerification,
  emailAccounts,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const activeTab = useMemo(
    () => (isPortalSettingsTab(tabParam) ? tabParam : "registration"),
    [tabParam]
  );

  const [enabled, setEnabled] = useState(initial);
  const [resetSettings, setResetSettings] = useState(initialReset);
  const [verificationSettings, setVerificationSettings] = useState(initialVerification);
  const [savedEnabled, setSavedEnabled] = useState(initial);
  const [savedResetSettings, setSavedResetSettings] = useState(initialReset);
  const [savedVerificationSettings, setSavedVerificationSettings] = useState(initialVerification);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const markUnsaved = useAdminUiStore((s) => s.markUnsaved);
  const markSaved = useAdminUiStore((s) => s.markSaved);
  const setSaveStatus = useAdminUiStore((s) => s.setSaveStatus);

  const patchRegistration = useCallback(
    (value: boolean) => {
      markUnsaved();
      setEnabled(value);
    },
    [markUnsaved]
  );

  const patchReset = useCallback(
    (patch: Partial<PasswordResetSettings>) => {
      markUnsaved();
      setResetSettings((s) => ({ ...s, ...patch }));
    },
    [markUnsaved]
  );

  const patchVerification = useCallback(
    (patch: Partial<EmailVerificationSettings>) => {
      markUnsaved();
      setVerificationSettings((s) => ({ ...s, ...patch }));
    },
    [markUnsaved]
  );

  const handleTabChange = (tabId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tabId);
    router.replace(`/admin/settings/portal?${params.toString()}`, { scroll: false });
  };

  const handleSave = useCallback(async () => {
    setError(null);
    setFeedback(null);
    setSaveStatus("saving");
    const [portalResult, resetResult, verificationResult] = await Promise.all([
      updatePortalSettings({ registrationEnabled: enabled }),
      savePasswordResetSettingsAction(resetSettings),
      saveEmailVerificationSettingsAction(verificationSettings),
    ]);
    if (!portalResult.success) {
      setError(portalResult.error);
      setSaveStatus("error");
      return false;
    }
    if (!resetResult.success) {
      setError(resetResult.error);
      setSaveStatus("error");
      return false;
    }
    if (!verificationResult.success) {
      setError(verificationResult.error);
      setSaveStatus("error");
      return false;
    }
    setSavedEnabled(enabled);
    setSavedResetSettings(resetSettings);
    setSavedVerificationSettings(verificationSettings);
    setFeedback("Visitor portal settings saved.");
    markSaved();
  }, [enabled, resetSettings, verificationSettings, markSaved, setSaveStatus]);

  const handleCancel = useCallback(() => {
    setEnabled(savedEnabled);
    setResetSettings(savedResetSettings);
    setVerificationSettings(savedVerificationSettings);
    setError(null);
    setFeedback(null);
  }, [savedEnabled, savedResetSettings, savedVerificationSettings]);

  useAdminPageActions({
    ownerKey: "portal-settings",
    scope: "settings",
    priority: 0,
    onSave: handleSave,
    onCancel: handleCancel,
    saveStatusMode: "self-managed",
  });

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Visitor portal"
        description="Customer registration, signup OTP delivery, and password reset emails. Master Admin only."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/users">
              <Users className="me-2 size-4" aria-hidden />
              Customer accounts
            </Link>
          </Button>
        }
      />

      {feedback ? (
        <p className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-800 dark:text-emerald-200">
          {feedback}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Portal status</CardTitle>
          <CardDescription>
            Quick overview of visitor-facing account features. Save from the top bar (Ctrl+S).
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-2 pt-0">
          <Badge variant={enabled ? "default" : "secondary"}>
            Registration {enabled ? "open" : "closed"}
          </Badge>
          <Badge variant={verificationSettings.emailAccountId ? "default" : "secondary"}>
            Signup OTP {verificationSettings.emailAccountId ? "account set" : "unset"}
          </Badge>
          <Badge variant={resetSettings.enabled ? "default" : "secondary"}>
            Reset emails {resetSettings.enabled ? "on" : "off"}
          </Badge>
        </CardContent>
      </Card>

      <AdminSettingsLayout
        tabs={[...PORTAL_SETTINGS_TABS]}
        activeTab={activeTab}
        onTabChange={handleTabChange}
      >
        {(tab) => (
          <Card>
            <CardContent className="pt-6">
              {tab === "registration" ? (
                <RegistrationTab enabled={enabled} onChange={patchRegistration} />
              ) : tab === "email-verification" ? (
                <EmailVerificationTab
                  settings={verificationSettings}
                  onChange={patchVerification}
                  emailAccounts={emailAccounts}
                />
              ) : (
                <PasswordResetTab
                  settings={resetSettings}
                  onChange={patchReset}
                  emailAccounts={emailAccounts}
                />
              )}
            </CardContent>
          </Card>
        )}
      </AdminSettingsLayout>
    </div>
  );
}

function RegistrationTab({
  enabled,
  onChange,
}: {
  enabled: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="space-y-8">
      <SettingsSection
        title="Visitor registration"
        description="When disabled, the register page and API are unavailable. Existing customers can still sign in."
      >
        <ToggleField
          label="Allow visitor registration"
          description="New customers can create an account from the public site."
          checked={enabled}
          onChange={onChange}
        />
      </SettingsSection>

      <SettingsSection
        title="Storefront links"
        description="Open public account pages in a new tab to verify the experience."
      >
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`${PUBLIC_ACCOUNT_BASE}/register`} target="_blank" rel="noopener noreferrer">
              Register page
              <ExternalLink className="ms-2 size-3.5" aria-hidden />
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href={`${PUBLIC_ACCOUNT_BASE}/login`} target="_blank" rel="noopener noreferrer">
              Sign in
              <ExternalLink className="ms-2 size-3.5" aria-hidden />
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link
              href={`${PUBLIC_ACCOUNT_BASE}/forgot-password`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Forgot password
              <ExternalLink className="ms-2 size-3.5" aria-hidden />
            </Link>
          </Button>
        </div>
      </SettingsSection>
    </div>
  );
}

function EmailVerificationTab({
  settings,
  onChange,
  emailAccounts,
}: {
  settings: EmailVerificationSettings;
  onChange: (patch: Partial<EmailVerificationSettings>) => void;
  emailAccounts: EmailAccountOption[];
}) {
  return (
    <div className="space-y-8">
      <SettingsSection
        title="Registration email verification / OTP"
        description="6-digit codes expire in 5 minutes. Used for signup and OTP resend. Independent of admin authentication."
      >
        <EmailAccountSelect
          id="verificationEmailAccountId"
          label="Email account"
          value={settings.emailAccountId ?? ""}
          onChange={(emailAccountId) => onChange({ emailAccountId })}
          emailAccounts={emailAccounts}
          allowEnvFallback
        />
        <TextField
          id="verificationFromName"
          label="From name (optional)"
          value={settings.fromName ?? ""}
          onChange={(fromName) => onChange({ fromName })}
        />
      </SettingsSection>
      <SettingsSection title="Email template" description="Subject and heading for verification emails.">
        <TextField
          id="verificationSubject"
          label="Email subject"
          value={settings.emailSubject}
          onChange={(emailSubject) => onChange({ emailSubject })}
        />
        <TextField
          id="verificationHeading"
          label="Email heading"
          value={settings.emailHeading}
          onChange={(emailHeading) => onChange({ emailHeading })}
        />
        <TextAreaField
          id="verificationBody"
          label="Email body (optional note)"
          rows={6}
          value={settings.emailBody}
          onChange={(emailBody) => onChange({ emailBody })}
        />
      </SettingsSection>
    </div>
  );
}

function PasswordResetTab({
  settings,
  onChange,
  emailAccounts,
}: {
  settings: PasswordResetSettings;
  onChange: (patch: Partial<PasswordResetSettings>) => void;
  emailAccounts: EmailAccountOption[];
}) {
  return (
    <div className="space-y-8">
      <SettingsSection
        title="Customer password reset"
        description="Emails sent when customers request a reset from the account hub. Never used for administrator resets."
      >
        <ToggleField
          label="Enable password reset emails"
          description="When off, reset requests are rejected even if the form is visible."
          checked={settings.enabled}
          onChange={(enabled) => onChange({ enabled })}
        />
      </SettingsSection>

      <SettingsSection
        title="Delivery"
        description="Choose an Email Account for customer reset emails."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border bg-muted/40 px-3 py-2 text-sm text-muted-foreground md:col-span-2">
            Reset links always expire after <strong className="text-foreground">5 minutes</strong> and
            can only be used once.
          </div>
          <TextField
            id="fromName"
            label="From name (optional)"
            value={settings.fromName ?? ""}
            onChange={(fromName) => onChange({ fromName })}
          />
        </div>
        <EmailAccountSelect
          id="emailAccountId"
          label="Email account"
          value={settings.emailAccountId ?? ""}
          onChange={(emailAccountId) => onChange({ emailAccountId })}
          emailAccounts={emailAccounts}
          allowEnvFallback
        />
        <TextField
          id="notifyReceiverEmail"
          label="Notify receiver email (optional)"
          type="email"
          placeholder="admin@example.com"
          description="Receives a notice when someone requests a reset (no reset link included)."
          value={settings.notifyReceiverEmail ?? ""}
          onChange={(notifyReceiverEmail) => onChange({ notifyReceiverEmail })}
        />
        <TextField
          id="replyToEmail"
          label="Reply-to email (optional)"
          type="email"
          value={settings.replyToEmail ?? ""}
          onChange={(replyToEmail) => onChange({ replyToEmail })}
        />
      </SettingsSection>

      <SettingsSection
        title="Email template"
        description="Use merge tags in subject, heading, and body."
      >
        <div className="rounded-lg border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          <code className="font-mono">{"{{name}}"}</code>
          {" · "}
          <code className="font-mono">{"{{resetLink}}"}</code>
          {" · "}
          <code className="font-mono">{"{{expiryMinutes}}"}</code>
        </div>
        <TextField
          id="emailSubject"
          label="Email subject"
          value={settings.emailSubject}
          onChange={(emailSubject) => onChange({ emailSubject })}
        />
        <TextField
          id="emailHeading"
          label="Email heading"
          value={settings.emailHeading}
          onChange={(emailHeading) => onChange({ emailHeading })}
        />
        <TextAreaField
          id="emailBody"
          label="Email body"
          rows={10}
          value={settings.emailBody}
          onChange={(emailBody) => onChange({ emailBody })}
        />
      </SettingsSection>
    </div>
  );
}
