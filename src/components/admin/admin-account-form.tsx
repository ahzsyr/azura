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
import { saveAdminAuthSettingsAction } from "@/features/account/admin/customer-user-actions";
import type { AdminAuthSettings } from "@/features/account/account-settings.schema";
import { AdminPageConfigRegistrar } from "@/components/admin/layout/admin-page-config-registrar";
import { AccountMfaCard, type SelfMfaView } from "@/components/account/account-mfa-card";
import { saveIfNeededThenPublish } from "@/hooks/save-then-publish";
import { useAdminPageActions } from "@/hooks/use-admin-page-actions";
import { useAdminUiStore } from "@/stores/admin-ui-store";

type EmailAccountOption = { id: string; name: string; from: string };

type Props = {
  currentEmail: string;
  pendingEmail?: string | null;
  isMasterAdmin?: boolean;
  emailAccounts?: EmailAccountOption[];
  adminAuth?: AdminAuthSettings;
  adminMfaEnabled?: boolean;
  hasEmailAccounts?: boolean;
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
  emailAccounts = [],
  adminAuth: initialAdminAuth,
  adminMfaEnabled = false,
  hasEmailAccounts = false,
  mfaStatus,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const visibleTabs = useMemo(
    () =>
      ADMIN_ACCOUNT_TABS.filter((t) => (t.id === "delivery" ? isMasterAdmin : true)),
    [isMasterAdmin],
  );
  const activeTab = useMemo(() => {
    if (isAdminAccountTab(tabParam) && (tabParam !== "delivery" || isMasterAdmin)) {
      return tabParam;
    }
    return "overview";
  }, [tabParam, isMasterAdmin]);

  const [email, setEmail] = useState(initialEmail);
  const [pendingEmail, setPendingEmail] = useState<string | null>(initialPendingEmail);
  const [newEmail, setNewEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [adminAuth, setAdminAuth] = useState<AdminAuthSettings>(
    initialAdminAuth ?? { otpEmailAccountId: "", passwordResetEmailAccountId: "" },
  );
  const [savedAdminAuth, setSavedAdminAuth] = useState(adminAuth);
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

    const adminAuthDirty =
      isMasterAdmin &&
      (adminAuth.otpEmailAccountId !== savedAdminAuth.otpEmailAccountId ||
        adminAuth.passwordResetEmailAccountId !== savedAdminAuth.passwordResetEmailAccountId);

    if (adminAuthDirty) {
      setSaveStatus("saving");
      const deliveryResult = await saveAdminAuthSettingsAction(adminAuth);
      if (!deliveryResult.success) {
        setError(deliveryResult.error);
        setSaveStatus("error");
        return false;
      }
      setSavedAdminAuth(adminAuth);
      setFeedback("OTP email delivery settings saved.");
      markSaved();
      // Continue if credential changes also pending; otherwise done
    }

    const hasEmailChange = Boolean(newEmail.trim() && newEmail.trim() !== email);
    const hasPasswordChange = Boolean(newPassword.trim());

    if (!hasEmailChange && !hasPasswordChange) {
      if (adminAuthDirty) return true;
      setError("Provide a new email and/or new password to update, or change Email delivery settings.");
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
    isMasterAdmin,
    adminAuth,
    savedAdminAuth,
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
    setAdminAuth(savedAdminAuth);
    setError(null);
    setFeedback(null);
  }, [savedAdminAuth]);

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
        tabs={[...visibleTabs]}
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
              ) : tab === "delivery" && isMasterAdmin ? (
                <DeliveryTab
                  adminAuth={adminAuth}
                  emailAccounts={emailAccounts}
                  hasEmailAccounts={hasEmailAccounts}
                  adminMfaEnabled={adminMfaEnabled}
                  onChange={(patch) => {
                    markDirty();
                    setAdminAuth((s) => ({ ...s, ...patch }));
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
          {isMasterAdmin ? (
            <Badge variant={adminMfaEnabled ? "default" : "secondary"}>
              Admin MFA {adminMfaEnabled ? "enabled" : "disabled"}
            </Badge>
          ) : null}
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
          {isMasterAdmin ? (
            <li>
              <strong className="text-foreground">Email delivery</strong> — choose the OTP email
              account used for verification, email codes and password-reset codes
            </li>
          ) : null}
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
        description={`Sign-in codes are ${adminMfaEnabled ? "enabled" : "not configured yet"} for the whole site from Email delivery. You may also add an authenticator app — it is offered first and belongs to your account only.`}
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

function DeliveryTab({
  adminAuth,
  emailAccounts,
  hasEmailAccounts,
  adminMfaEnabled,
  onChange,
}: {
  adminAuth: AdminAuthSettings;
  emailAccounts: EmailAccountOption[];
  hasEmailAccounts: boolean;
  adminMfaEnabled: boolean;
  onChange: (patch: Partial<AdminAuthSettings>) => void;
}) {
  return (
    <div className="space-y-8">
      <SettingsSection
        title="Security / Email delivery"
        description="Master Admin only. This is the sender used for every authentication email: signup verification, email sign-in codes, and password-reset codes for customers, Admins and you. Credentials stay under Email Accounts — this page only stores which account is used."
      >
        <div className="flex flex-wrap items-center gap-2">
          {adminMfaEnabled ? (
            <Badge variant="default">Email sign-in codes enabled</Badge>
          ) : (
            <Badge variant="secondary">Email sign-in codes disabled — configure an Email Account</Badge>
          )}
        </div>
        {!hasEmailAccounts ? (
          <p className="text-sm text-muted-foreground">
            No Email Accounts yet.{" "}
            <Link href="/admin/settings/email-accounts" className="text-primary underline">
              Configure an Email Account
            </Link>
          </p>
        ) : null}
        <div className="space-y-1.5">
          <label htmlFor="otpEmailAccountId" className="text-sm font-medium">
            OTP email account
          </label>
          <select
            id="otpEmailAccountId"
            className="border-input bg-background flex h-9 w-full rounded-md border px-3 text-sm"
            value={adminAuth.otpEmailAccountId ?? ""}
            onChange={(e) => onChange({ otpEmailAccountId: e.target.value })}
          >
            <option value="">Select an Email Account</option>
            {emailAccounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name} ({account.from})
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">
            Used for signup verification, email-code two-step verification, and password-reset
            codes for every account type. When a sendable account is selected, admin sign-in
            requires a 5-minute email code.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/admin/settings/email-accounts">
            Manage Email Accounts
            <ExternalLink className="ms-2 size-3.5" aria-hidden />
          </Link>
        </Button>
      </SettingsSection>
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
