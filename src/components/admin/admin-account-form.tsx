"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signOut } from "next-auth/react";
import { ExternalLink, Shield, UserCog } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AdminPageHeader } from "@/components/admin/layout/admin-shell";
import { AdminSettingsLayout } from "@/components/admin/layout/admin-settings-layout";
import { CredentialChecks, useCredentialCheck } from "@/components/security/credential-checks";
import { assessPassword } from "@/schemas/password-policy";
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
import { AdminPageConfigRegistrar } from "@/components/admin/layout/admin-page-config-registrar";
import { AccountMfaCard, type SelfMfaView } from "@/components/account/account-mfa-card";
import { saveIfNeededThenPublish } from "@/hooks/save-then-publish";
import { useAdminPageActions } from "@/hooks/use-admin-page-actions";
import { useAdminUiStore } from "@/stores/admin-ui-store";

type Props = {
  currentEmail: string;
  pendingEmail?: string | null;
  isMasterAdmin?: boolean;
  /** Email-code sign-in availability (site-wide sender configured). */
  adminMfaEnabled?: boolean;
  /** This admin's own second factor, read on the server render. */
  mfaStatus?: SelfMfaView | null;
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

export function AdminAccountForm({
  currentEmail: initialEmail,
  pendingEmail: initialPendingEmail = null,
  isMasterAdmin = false,
  adminMfaEnabled = false,
  mfaStatus,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  // Email delivery is configured with the Email Accounts, not here; old
  // bookmarks to this page's `delivery` tab land on Overview.
  const activeTab = useMemo(
    () => (isAdminAccountTab(tabParam) ? tabParam : "overview"),
    [tabParam],
  );

  const [email, setEmail] = useState(initialEmail);
  const [pendingEmail, setPendingEmail] = useState<string | null>(initialPendingEmail);
  const [newEmail, setNewEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

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

    const hasEmailChange = Boolean(newEmail.trim() && newEmail.trim() !== email);
    const hasPasswordChange = Boolean(newPassword.trim());

    if (!hasEmailChange && !hasPasswordChange) {
      setError("Provide a new email and/or new password to update.");
      setSaveStatus("error");
      return false;
    }

    if (!currentPassword.trim()) {
      setError("Enter your current password on the Verify changes tab before saving credentials.");
      setSaveStatus("error");
      return false;
    }

    if (hasPasswordChange && newPassword !== confirmPassword) {
      setError("New password and confirmation do not match.");
      setSaveStatus("error");
      return false;
    }

    if (hasPasswordChange && !assessPassword(newPassword).ok) {
      setError("Password must include an English uppercase letter, lowercase letter, number, and symbol.");
      setSaveStatus("error");
      return false;
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
      return false;
    }

    const nextEmail = result.data?.email ?? email;
    // Secondary notice failure: the primary confirmation did go out.
    const warning = result.data?.warning ? ` ${result.data.warning}` : "";
    if (result.data?.requiresRelogin) {
      const pending = result.data.pendingEmail;
      if (pending) setPendingEmail(pending);
      setFeedback(
        pending
          ? `Password updated. A confirmation email was sent to ${pending}. Sign in with ${nextEmail} or ${pending}.${warning}`
          : "Password updated. Sign in again with the same email and your new password.",
      );
      setNewEmail("");
      clearSensitiveFields(setCurrentPassword, setNewPassword, setConfirmPassword);
      markSaved();
      window.setTimeout(() => {
        void signOut({ callbackUrl: "/account/login" });
      }, 800);
      return true;
    } else if (result.data?.pendingEmail) {
      setPendingEmail(result.data.pendingEmail);
      setFeedback(
        `Confirmation sent to ${result.data.pendingEmail}. Your login email stays ${nextEmail} until you confirm. You can also sign in with the new address.${warning}`,
      );
    } else if (nextEmail !== email) {
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

  const handleCancel = useCallback(() => {
    setNewEmail("");
    clearSensitiveFields(setCurrentPassword, setNewPassword, setConfirmPassword);
    setError(null);
    setFeedback(null);
  }, []);

  const handlePublish = useCallback(async () => {
    await saveIfNeededThenPublish(handleSave, async () => undefined);
  }, [handleSave]);

  useAdminPageActions({
    ownerKey: "admin-account",
    scope: "settings",
    priority: 0,
    onSave: handleSave,
    onPublish: handlePublish,
    onCancel: handleCancel,
    saveStatusMode: "self-managed",
  });

  const pendingEmailChange = Boolean(pendingEmail);
  const pendingPasswordChange = Boolean(newPassword.trim());
  const hasCurrentPassword = Boolean(currentPassword.trim());

  return (
    <div className="space-y-6">
      <AdminPageConfigRegistrar configKey="settingsSavePublish" />
      <AdminPageHeader
        title="Admin account"
        description="Credentials for signing in to the admin panel."
        actions={
          isMasterAdmin ? (
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/settings/portal" prefetch={false}>
                <UserCog className="me-2 size-4" aria-hidden />
                Visitor portal
              </Link>
            </Button>
          ) : null
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
                  pendingEmail={pendingEmail}
                  pendingEmailChange={pendingEmailChange}
                  pendingPasswordChange={pendingPasswordChange}
                  hasCurrentPassword={hasCurrentPassword}
                  isMasterAdmin={isMasterAdmin}
                  adminMfaEnabled={adminMfaEnabled}
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
              ) : tab === "mfa" ? (
                <MfaTab
                  adminMfaEnabled={adminMfaEnabled}
                  isMasterAdmin={isMasterAdmin}
                  emailForQr={email}
                  mfaStatus={mfaStatus ?? null}
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
  pendingEmail,
  pendingEmailChange,
  pendingPasswordChange,
  hasCurrentPassword,
  isMasterAdmin,
  adminMfaEnabled,
}: {
  email: string;
  pendingEmail: string | null;
  pendingEmailChange: boolean;
  pendingPasswordChange: boolean;
  hasCurrentPassword: boolean;
  isMasterAdmin: boolean;
  adminMfaEnabled: boolean;
}) {
  return (
    <div className="space-y-8">
      <SettingsSection
        title="Signed in as"
        description="Your admin identity for this panel. Save from the top bar (Ctrl+S) after making changes on other tabs."
      >
        <p className="rounded-lg border bg-muted/30 px-3 py-2 font-mono text-sm">{email}</p>
        <div className="flex flex-wrap gap-2">
          <Badge variant="default">{isMasterAdmin ? "Master Admin" : "Administrator"}</Badge>
          <Badge variant={adminMfaEnabled ? "default" : "secondary"}>
            Email sign-in codes {adminMfaEnabled ? "enabled" : "disabled"}
          </Badge>
          {pendingEmailChange && pendingEmail ? (
            <Badge variant="secondary">Pending confirmation: {pendingEmail}</Badge>
          ) : null}
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
            <strong className="text-foreground">Password</strong> — set a new password (min. 12 characters)
          </li>
          <li>
            <strong className="text-foreground">MFA</strong> — two-step verification for your own
            account: an authenticator app or emailed codes
          </li>
          <li>
            <strong className="text-foreground">Email delivery</strong> (with{" "}
            <Link href="/admin/settings/email-accounts" className="text-primary underline">
              Email Accounts
            </Link>
            ) — choose the account that sends every verification, sign-in code and reset code
          </li>
          <li>
            <strong className="text-foreground">Access</strong> — open the public sign-in page
            to verify credentials (admins are routed to the admin portal)
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
  const credentialCheck = useCredentialCheck({ email: newEmail });
  return (
    <SettingsSection
      title="Email address"
      description="Leave blank to keep your current email. A confirmation link is sent to the new address before it becomes your login email."
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
      <CredentialChecks email={newEmail} check={credentialCheck} />
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
  const credentialCheck = useCredentialCheck({
    password: newPassword,
    confirmPassword,
  });
  return (
    <SettingsSection
      title="Password"
      description="At least 12 English characters, with an uppercase letter, a lowercase letter, a number, and a symbol. Leave both fields blank to keep your current password."
    >
      <div className="grid gap-4 md:grid-cols-2">
        <PasswordField
          id="newPassword"
          label="New password"
          value={newPassword}
          minLength={12}
          autoComplete="new-password"
          onChange={onNewPasswordChange}
        />
        <PasswordField
          id="confirmPassword"
          label="Confirm new password"
          value={confirmPassword}
          minLength={12}
          autoComplete="new-password"
          onChange={onConfirmPasswordChange}
        />
      </div>
      <CredentialChecks password={newPassword} check={credentialCheck} />
    </SettingsSection>
  );
}

function MfaTab({
  adminMfaEnabled,
  isMasterAdmin,
  emailForQr,
  mfaStatus,
}: {
  adminMfaEnabled: boolean;
  isMasterAdmin: boolean;
  emailForQr: string;
  mfaStatus: SelfMfaView | null;
}) {
  return (
    <div className="space-y-6">
      <SettingsSection
        title="Two-step verification at sign-in"
        description={`Email sign-in codes are ${adminMfaEnabled ? "enabled" : "not configured yet"} for the whole site from Email Accounts → Email delivery. You may also add an authenticator app — it is offered first and belongs to your account only.`}
      >
        <p className="text-muted-foreground text-sm">
          Account: <span className="text-foreground">{emailForQr}</span>
          {isMasterAdmin ? " · Master Admin" : ""}
        </p>
      </SettingsSection>
      {mfaStatus ? (
        <AccountMfaCard initialStatus={mfaStatus} embedded />
      ) : (
        <p className="text-muted-foreground text-sm">
          Could not read your two-step verification state. Reload the page to try again.
        </p>
      )}
    </div>
  );
}

function AccessTab() {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function revokeEverywhere() {
    setBusy(true);
    setError(null);
    setMessage(null);
    const res = await fetch("/api/admin/sessions/revoke-all", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: password }),
    });
    setBusy(false);
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? "Unable to revoke sessions");
      return;
    }
    setMessage("All sessions revoked. Signing out…");
    void signOut({ callbackUrl: "/account/login" });
  }

  return (
    <div className="space-y-8">
      <SettingsSection
        title="Sign-in"
        description="Open the public login page in a new tab to test credentials after an update. Admins are routed to the admin portal after sign-in."
      >
        <Button asChild variant="outline" size="sm">
          <Link href="/account/login" target="_blank" rel="noopener noreferrer">
            Sign in
            <ExternalLink className="ms-2 size-3.5" aria-hidden />
          </Link>
        </Button>
      </SettingsSection>
      <SettingsSection
        title="Sign out everywhere"
        description="Revokes all sessions on every device, including this one."
      >
        {message ? <p className="text-sm text-emerald-700 dark:text-emerald-300">{message}</p> : null}
        {error ? <p className="text-destructive text-sm">{error}</p> : null}
        <PasswordField
          id="revokeAllPassword"
          label="Current password"
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
        />
        <Button
          type="button"
          variant="destructive"
          disabled={busy || !password}
          onClick={() => void revokeEverywhere()}
        >
          Sign out everywhere
        </Button>
      </SettingsSection>
    </div>
  );
}
