"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signOut } from "next-auth/react";
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
import { saveAdminAuthSettingsAction } from "@/features/account/admin/customer-user-actions";
import type { AdminAuthSettings } from "@/features/account/account-settings.schema";
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
      setFeedback("Admin email delivery settings saved.");
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
    if (result.data?.pendingEmail) {
      setPendingEmail(result.data.pendingEmail);
      setFeedback(
        `Confirmation sent to ${result.data.pendingEmail}. Your login email stays the same until you confirm.`,
      );
    } else if (result.data?.requiresRelogin) {
      setFeedback("Password updated. Sign in again to continue.");
      setNewEmail("");
      clearSensitiveFields(setCurrentPassword, setNewPassword, setConfirmPassword);
      markSaved();
      setTimeout(() => {
        void signOut({ callbackUrl: "/account/login" });
      }, 800);
      return true;
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

  useEffect(() => {
    registerPageActions({
      onSave: handleSave,
      onCancel: handleCancel,
      selfManagedSaveStatus: true,
    });
    return () => clearPageActions();
  }, [registerPageActions, clearPageActions, handleSave, handleCancel]);

  const pendingEmailChange = Boolean(pendingEmail);
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
                <MfaTab adminMfaEnabled={adminMfaEnabled} isMasterAdmin={isMasterAdmin} />
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
            <strong className="text-foreground">MFA</strong> — optional authenticator app (login email OTP
            is controlled by Email delivery when you are Master Admin)
          </li>
          {isMasterAdmin ? (
            <li>
              <strong className="text-foreground">Email delivery</strong> — choose Email Accounts for
              admin login OTP and admin password reset
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
      description="Minimum 12 characters. Leave both fields blank to keep your current password."
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
    </SettingsSection>
  );
}

function MfaTab({
  adminMfaEnabled,
  isMasterAdmin,
}: {
  adminMfaEnabled: boolean;
  isMasterAdmin: boolean;
}) {
  const [totpEnabled, setTotpEnabled] = useState(false);
  const [secret, setSecret] = useState<string | null>(null);
  const [otpauthUrl, setOtpauthUrl] = useState<string | null>(null);
  const [confirmCode, setConfirmCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [disablePassword, setDisablePassword] = useState("");
  const [disableCode, setDisableCode] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void (async () => {
      const { getAdminMfaStatusAction } = await import("@/features/auth/mfa.actions");
      const status = await getAdminMfaStatusAction();
      if (status.success && status.data) {
        setTotpEnabled(status.data.totpEnabled);
      }
    })();
  }, []);

  async function startEnrollment() {
    setBusy(true);
    setError(null);
    setMessage(null);
    setRecoveryCodes(null);
    const { startAdminMfaEnrollmentAction } = await import("@/features/auth/mfa.actions");
    const result = await startAdminMfaEnrollmentAction();
    setBusy(false);
    if (!result.success || !result.data) {
      setError(!result.success ? result.error : "Unable to start MFA");
      return;
    }
    setSecret(result.data.secret);
    setOtpauthUrl(result.data.otpauthUrl);
  }

  async function confirmEnrollment() {
    setBusy(true);
    setError(null);
    const { confirmAdminMfaEnrollmentAction } = await import("@/features/auth/mfa.actions");
    const result = await confirmAdminMfaEnrollmentAction({ code: confirmCode });
    setBusy(false);
    if (!result.success || !result.data) {
      setError(!result.success ? result.error : "Invalid code");
      return;
    }
    setTotpEnabled(true);
    setSecret(null);
    setOtpauthUrl(null);
    setConfirmCode("");
    setRecoveryCodes(result.data.recoveryCodes);
    setMessage(
      "MFA enabled. Store these recovery codes now — they will not be shown again. Then sign in again.",
    );
  }

  async function disableMfa() {
    setBusy(true);
    setError(null);
    const { disableAdminMfaAction } = await import("@/features/auth/mfa.actions");
    const result = await disableAdminMfaAction({
      password: disablePassword || undefined,
      mfaCode: disableCode || undefined,
    });
    setBusy(false);
    if (!result.success) {
      setError(result.error ?? "Unable to disable MFA");
      return;
    }
    setTotpEnabled(false);
    setDisablePassword("");
    setDisableCode("");
    setRecoveryCodes(null);
    setMessage("MFA disabled. Existing sessions were revoked.");
  }

  return (
    <SettingsSection
      title="Multi-factor authentication"
      description={
        isMasterAdmin
          ? `Login email OTP is ${adminMfaEnabled ? "enabled" : "disabled"} based on Email delivery settings. Authenticator app enrollment below is optional.`
          : "Login may require an email OTP when the Master Admin has configured admin email delivery. Authenticator app enrollment below is optional."
      }
    >
      {message ? (
        <p className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm">
          {message}
        </p>
      ) : null}
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
      <p className="text-sm text-muted-foreground">
        Status:{" "}
        <strong className="text-foreground">{totpEnabled ? "Enabled" : "Disabled"}</strong>
      </p>

      {!totpEnabled ? (
        <div className="space-y-4">
          {!secret ? (
            <Button type="button" onClick={() => void startEnrollment()} disabled={busy}>
              Start MFA enrollment
            </Button>
          ) : (
            <>
              <p className="text-sm break-all font-mono">{otpauthUrl}</p>
              <p className="text-muted-foreground text-xs">
                Secret: <span className="font-mono text-foreground">{secret}</span>
              </p>
              <TextField
                id="mfaConfirm"
                label="Authenticator code"
                value={confirmCode}
                onChange={setConfirmCode}
              />
              <Button type="button" onClick={() => void confirmEnrollment()} disabled={busy}>
                Confirm and enable
              </Button>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <PasswordField
            id="disableMfaPassword"
            label="Current password (or leave blank if using a code)"
            value={disablePassword}
            onChange={setDisablePassword}
            autoComplete="current-password"
          />
          <TextField
            id="disableMfaCode"
            label="Authenticator or recovery code"
            value={disableCode}
            onChange={setDisableCode}
          />
          <Button
            type="button"
            variant="destructive"
            onClick={() => void disableMfa()}
            disabled={busy}
          >
            Disable MFA
          </Button>
        </div>
      )}

      {recoveryCodes ? (
        <div className="rounded-md border bg-muted/30 p-3">
          <p className="mb-2 text-sm font-medium">Recovery codes (save now)</p>
          <ul className="font-mono text-xs space-y-1">
            {recoveryCodes.map((code) => (
              <li key={code}>{code}</li>
            ))}
          </ul>
          <Button
            type="button"
            className="mt-3"
            onClick={() => void signOut({ callbackUrl: "/account/login" })}
          >
            Continue — sign in again
          </Button>
        </div>
      ) : null}
    </SettingsSection>
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
        description="Master Admin only. Select Email Accounts for administrator authentication emails. Credentials stay under Email Accounts — this page only stores which account is used."
      >
        <div className="flex flex-wrap items-center gap-2">
          {adminMfaEnabled ? (
            <Badge variant="default">Admin MFA Enabled</Badge>
          ) : (
            <Badge variant="secondary">Admin MFA Disabled — Configure an Email Account</Badge>
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
            Admin login OTP Email Account
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
            When a valid sendable account is selected, admin login requires a 5-minute email OTP.
            Otherwise login is password-only.
          </p>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="passwordResetEmailAccountId" className="text-sm font-medium">
            Admin password reset Email Account
          </label>
          <select
            id="passwordResetEmailAccountId"
            className="border-input bg-background flex h-9 w-full rounded-md border px-3 text-sm"
            value={adminAuth.passwordResetEmailAccountId ?? ""}
            onChange={(e) => onChange({ passwordResetEmailAccountId: e.target.value })}
          >
            <option value="">Select an Email Account</option>
            {emailAccounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name} ({account.from})
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">
            Used only for administrator password-reset emails — never the customer portal sender.
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
