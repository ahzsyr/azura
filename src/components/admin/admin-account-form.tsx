"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ExternalLink, Shield, UserCog } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AdminPageHeader } from "@/components/admin/layout/admin-shell";
import { AdminSettingsLayout } from "@/components/admin/layout/admin-settings-layout";
import {
  PasswordField,
  SettingsSection,
  TextField,
} from "@/components/admin/settings-fields";
import { updateAdminCredentials } from "@/features/setup/actions/update-admin-credentials";
import {
  ADMIN_ACCOUNT_TABS,
  isAdminAccountTab,
} from "@/features/setup/admin/admin-account-tabs";
import { useAdminUiStore } from "@/stores/admin-ui-store";

type Props = {
  currentEmail: string;
};

function clearSensitiveFields(
  setCurrentPassword: (v: string) => void,
  setNewPassword: (v: string) => void,
  setConfirmPassword: (v: string) => void
) {
  setCurrentPassword("");
  setNewPassword("");
  setConfirmPassword("");
}

export function AdminAccountForm({ currentEmail: initialEmail }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const activeTab = useMemo(
    () => (isAdminAccountTab(tabParam) ? tabParam : "overview"),
    [tabParam]
  );

  const [email, setEmail] = useState(initialEmail);
  const [newEmail, setNewEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const registerPageActions = useAdminUiStore((s) => s.registerPageActions);
  const clearPageActions = useAdminUiStore((s) => s.clearPageActions);
  const markUnsaved = useAdminUiStore((s) => s.markUnsaved);
  const markSaved = useAdminUiStore((s) => s.markSaved);
  const setSaveStatus = useAdminUiStore((s) => s.setSaveStatus);

  const markDirty = useCallback(() => markUnsaved(), [markUnsaved]);

  const handleTabChange = (tabId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tabId);
    router.replace(`/admin/settings/account?${params.toString()}`, { scroll: false });
  };

  const handleSave = useCallback(async () => {
    setError(null);
    setFeedback(null);

    if (!currentPassword.trim()) {
      setError("Enter your current password on the Verify changes tab before saving.");
      setSaveStatus("error");
      return;
    }

    const hasEmailChange = Boolean(newEmail.trim() && newEmail.trim() !== email);
    const hasPasswordChange = Boolean(newPassword.trim());

    if (!hasEmailChange && !hasPasswordChange) {
      setError("Provide a new email and/or new password to update.");
      setSaveStatus("error");
      return;
    }

    if (hasPasswordChange && newPassword !== confirmPassword) {
      setError("New password and confirmation do not match.");
      setSaveStatus("error");
      return;
    }

    setSaveStatus("saving");
    const result = await updateAdminCredentials({
      currentPassword,
      newEmail: hasEmailChange ? newEmail.trim() : undefined,
      newPassword: hasPasswordChange ? newPassword : undefined,
      confirmPassword: hasPasswordChange ? confirmPassword : undefined,
    });

    if (!result.success) {
      setError(result.error);
      setSaveStatus("error");
      return;
    }

    const nextEmail = result.data?.email ?? email;
    if (nextEmail !== email) {
      setEmail(nextEmail);
      setFeedback("Email updated. Sign in again if your session no longer matches.");
    } else {
      setFeedback("Admin credentials updated.");
    }
    setNewEmail("");
    clearSensitiveFields(setCurrentPassword, setNewPassword, setConfirmPassword);
    markSaved();
  }, [
    currentPassword,
    newEmail,
    email,
    newPassword,
    confirmPassword,
    markSaved,
    setSaveStatus,
  ]);

  useEffect(() => {
    registerPageActions({ onSave: handleSave });
    return () => clearPageActions();
  }, [registerPageActions, clearPageActions, handleSave]);

  const pendingEmailChange = Boolean(newEmail.trim() && newEmail.trim() !== email);
  const pendingPasswordChange = Boolean(newPassword.trim());
  const hasCurrentPassword = Boolean(currentPassword.trim());

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Admin account"
        description="Credentials for signing in to the admin panel."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/settings/portal">
              <UserCog className="me-2 size-4" aria-hidden />
              Visitor portal
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

      <AdminSettingsLayout
        tabs={[...ADMIN_ACCOUNT_TABS]}
        activeTab={activeTab}
        onTabChange={handleTabChange}
      >
        {(tab) => (
          <Card>
            <CardContent className="pt-6">
              {tab === "overview" ? (
                <OverviewTab
                  email={email}
                  pendingEmailChange={pendingEmailChange}
                  pendingPasswordChange={pendingPasswordChange}
                  hasCurrentPassword={hasCurrentPassword}
                />
              ) : tab === "verify" ? (
                <VerifyTab
                  currentPassword={currentPassword}
                  onCurrentPasswordChange={(v) => {
                    markDirty();
                    setCurrentPassword(v);
                  }}
                />
              ) : tab === "email" ? (
                <EmailTab
                  currentEmail={email}
                  newEmail={newEmail}
                  onNewEmailChange={(v) => {
                    markDirty();
                    setNewEmail(v);
                  }}
                />
              ) : tab === "password" ? (
                <PasswordTab
                  newPassword={newPassword}
                  confirmPassword={confirmPassword}
                  onNewPasswordChange={(v) => {
                    markDirty();
                    setNewPassword(v);
                  }}
                  onConfirmPasswordChange={(v) => {
                    markDirty();
                    setConfirmPassword(v);
                  }}
                />
              ) : (
                <AccessTab />
              )}
            </CardContent>
          </Card>
        )}
      </AdminSettingsLayout>
    </div>
  );
}

function OverviewTab({
  email,
  pendingEmailChange,
  pendingPasswordChange,
  hasCurrentPassword,
}: {
  email: string;
  pendingEmailChange: boolean;
  pendingPasswordChange: boolean;
  hasCurrentPassword: boolean;
}) {
  return (
    <div className="space-y-8">
      <SettingsSection
        title="Signed in as"
        description="Your admin identity for this panel. Save from the top bar (Ctrl+S) after making changes on other tabs."
      >
        <p className="rounded-lg border bg-muted/30 px-3 py-2 font-mono text-sm">{email}</p>
        <div className="flex flex-wrap gap-2">
          <Badge variant="default">Administrator</Badge>
          {pendingEmailChange ? <Badge variant="secondary">Pending email change</Badge> : null}
          {pendingPasswordChange ? <Badge variant="secondary">Pending password change</Badge> : null}
          {hasCurrentPassword ? (
            <Badge variant="outline" className="border-emerald-500/40 text-emerald-700 dark:text-emerald-400">
              Password verified for save
            </Badge>
          ) : (
            <Badge variant="outline" className="text-muted-foreground">
              Add current password on Verify changes
            </Badge>
          )}
        </div>
      </SettingsSection>

      <SettingsSection
        title="What to update"
        description="Use the ribbon tabs to change credentials, then verify and save."
      >
        <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
          <li>
            <strong className="text-foreground">Verify changes</strong> — enter your current password
            before saving
          </li>
          <li>
            <strong className="text-foreground">Email</strong> — change the address used to sign in
          </li>
          <li>
            <strong className="text-foreground">Password</strong> — set a new password (min. 8 characters)
          </li>
          <li>
            <strong className="text-foreground">Access</strong> — open the admin login page
          </li>
        </ul>
      </SettingsSection>
    </div>
  );
}

function VerifyTab({
  currentPassword,
  onCurrentPasswordChange,
}: {
  currentPassword: string;
  onCurrentPasswordChange: (value: string) => void;
}) {
  return (
    <SettingsSection
      title="Verify changes"
      description="Required whenever you update email or password. Your current password is cleared after a successful save."
    >
      <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-sm text-muted-foreground">
        <Shield className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
        <span>Without this field, Save in the top bar will not apply credential updates.</span>
      </div>
      <PasswordField
        id="currentPassword"
        label="Current password"
        description="Your existing admin password."
        value={currentPassword}
        autoComplete="current-password"
        onChange={onCurrentPasswordChange}
      />
    </SettingsSection>
  );
}

function EmailTab({
  currentEmail,
  newEmail,
  onNewEmailChange,
}: {
  currentEmail: string;
  newEmail: string;
  onNewEmailChange: (value: string) => void;
}) {
  return (
    <SettingsSection
      title="Email address"
      description="Leave blank to keep your current email. You will need to sign in again if the email changes."
    >
      <p className="text-sm text-muted-foreground">
        Current: <span className="font-mono text-foreground">{currentEmail}</span>
      </p>
      <TextField
        id="newEmail"
        label="New email"
        type="email"
        placeholder={currentEmail}
        value={newEmail}
        onChange={onNewEmailChange}
      />
    </SettingsSection>
  );
}

function PasswordTab({
  newPassword,
  confirmPassword,
  onNewPasswordChange,
  onConfirmPasswordChange,
}: {
  newPassword: string;
  confirmPassword: string;
  onNewPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
}) {
  return (
    <SettingsSection
      title="Password"
      description="Minimum 8 characters. Leave both fields blank to keep your current password."
    >
      <div className="grid gap-4 md:grid-cols-2">
        <PasswordField
          id="newPassword"
          label="New password"
          value={newPassword}
          minLength={8}
          autoComplete="new-password"
          onChange={onNewPasswordChange}
        />
        <PasswordField
          id="confirmPassword"
          label="Confirm new password"
          value={confirmPassword}
          minLength={8}
          autoComplete="new-password"
          onChange={onConfirmPasswordChange}
        />
      </div>
    </SettingsSection>
  );
}

function AccessTab() {
  return (
    <SettingsSection
      title="Admin sign-in"
      description="Open the admin login page in a new tab to test credentials after an update."
    >
      <Button asChild variant="outline" size="sm">
        <Link href="/admin/login" target="_blank" rel="noopener noreferrer">
          Admin login
          <ExternalLink className="ms-2 size-3.5" aria-hidden />
        </Link>
      </Button>
    </SettingsSection>
  );
}
