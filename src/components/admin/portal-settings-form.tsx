"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ExternalLink, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminPageHeader } from "@/components/admin/layout/admin-shell";
import { AdminSettingsLayout } from "@/components/admin/layout/admin-settings-layout";
import {
  NumberField,
  SettingsSection,
  TextAreaField,
  TextField,
  ToggleField,
} from "@/components/admin/settings-fields";
import { updatePortalSettings } from "@/features/setup/actions/update-portal-settings";
import { savePasswordResetSettingsAction } from "@/features/account/admin/customer-user-actions";
import { isPortalSettingsTab, PORTAL_SETTINGS_TABS } from "@/features/account/admin/portal-settings-tabs";
import type { PasswordResetSettings } from "@/features/account/account-settings.schema";
import { routing } from "@/i18n/routing";
import { useAdminUiStore } from "@/stores/admin-ui-store";

type Props = {
  registrationEnabled: boolean;
  passwordReset: PasswordResetSettings;
};

const PUBLIC_ACCOUNT_BASE = `/${routing.defaultLocale}/account`;

export function PortalSettingsForm({ registrationEnabled: initial, passwordReset: initialReset }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const activeTab = useMemo(
    () => (isPortalSettingsTab(tabParam) ? tabParam : "registration"),
    [tabParam]
  );

  const [enabled, setEnabled] = useState(initial);
  const [resetSettings, setResetSettings] = useState(initialReset);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const registerPageActions = useAdminUiStore((s) => s.registerPageActions);
  const clearPageActions = useAdminUiStore((s) => s.clearPageActions);
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

  const handleTabChange = (tabId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tabId);
    router.replace(`/admin/settings/portal?${params.toString()}`, { scroll: false });
  };

  const handleSave = useCallback(async () => {
    setError(null);
    setFeedback(null);
    setSaveStatus("saving");
    const [portalResult, resetResult] = await Promise.all([
      updatePortalSettings({ registrationEnabled: enabled }),
      savePasswordResetSettingsAction(resetSettings),
    ]);
    if (!portalResult.success) {
      setError(portalResult.error);
      setSaveStatus("error");
      return;
    }
    if (!resetResult.success) {
      setError(resetResult.error);
      setSaveStatus("error");
      return;
    }
    setFeedback("Visitor portal settings saved.");
    markSaved();
  }, [enabled, resetSettings, markSaved, setSaveStatus]);

  useEffect(() => {
    registerPageActions({ onSave: handleSave });
    return () => clearPageActions();
  }, [registerPageActions, clearPageActions, handleSave]);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Visitor portal"
        description="Registration, password reset emails, and storefront account flows."
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
          <Badge variant={resetSettings.enabled ? "default" : "secondary"}>
            Reset emails {resetSettings.enabled ? "on" : "off"}
          </Badge>
          <span className="text-muted-foreground ms-1 text-xs">
            Token expiry {resetSettings.tokenExpiryHours}h
          </span>
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
              ) : (
                <PasswordResetTab settings={resetSettings} onChange={patchReset} />
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

function PasswordResetTab({
  settings,
  onChange,
}: {
  settings: PasswordResetSettings;
  onChange: (patch: Partial<PasswordResetSettings>) => void;
}) {
  return (
    <div className="space-y-8">
      <SettingsSection
        title="Password reset"
        description="Emails sent when customers request a reset from the account hub."
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
        description="Sender display name and optional notifications. Sending uses EMAIL_FROM / Resend / SMTP from environment."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <NumberField
            id="tokenExpiryHours"
            label="Link expiry (hours)"
            description="How long reset links stay valid."
            min={0.25}
            max={168}
            step={0.25}
            value={settings.tokenExpiryHours}
            onChange={(tokenExpiryHours) =>
              onChange({ tokenExpiryHours: Number.isFinite(tokenExpiryHours) ? tokenExpiryHours : 1 })
            }
          />
          <TextField
            id="fromName"
            label="From name (optional)"
            value={settings.fromName ?? ""}
            onChange={(fromName) => onChange({ fromName })}
          />
        </div>
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
          <code className="font-mono">{"{{expiryHours}}"}</code>
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
