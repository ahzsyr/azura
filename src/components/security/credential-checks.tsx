"use client";

import { useEffect, useMemo, useState } from "react";
import { assessEmailPattern } from "@/lib/security/email-input";
import { assessPassword, type PasswordChecks } from "@/schemas/password-policy";

type RemoteEmail = { ok: boolean; pattern: boolean; domain: boolean; message: string | null };
type Remote = {
  password?: { ok: boolean; checks: PasswordChecks };
  email?: RemoteEmail;
};

const PASSWORD_ROWS: Array<{ key: keyof PasswordChecks; label: string }> = [
  { key: "length", label: "At least 12 characters" },
  { key: "uppercase", label: "Uppercase letter" },
  { key: "lowercase", label: "Lowercase letter" },
  { key: "number", label: "Number" },
  { key: "symbol", label: "Symbol" },
  { key: "english", label: "English letters, numbers, and symbols only" },
  { key: "uncommon", label: "Not a common password" },
];

export function useCredentialCheck(input: {
  email?: string;
  password?: string;
  confirmPassword?: string;
}) {
  const password = input.password ?? "";
  const email = input.email ?? "";
  const confirm = input.confirmPassword;
  const localPassword = useMemo(() => (password ? assessPassword(password) : null), [password]);
  const localEmail = useMemo(() => (email.trim() ? assessEmailPattern(email) : null), [email]);
  const [remote, setRemote] = useState<Remote | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    const shouldCheckPassword = password.length > 0;
    const shouldCheckEmail = Boolean(localEmail?.ok);
    if (!shouldCheckPassword && !shouldCheckEmail) {
      setRemote(null);
      setChecking(false);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => {
      setChecking(true);
      void fetch("/api/security/field-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        signal: controller.signal,
        body: JSON.stringify({
          ...(shouldCheckPassword ? { password } : {}),
          ...(shouldCheckEmail ? { email } : {}),
        }),
      })
        .then(async (response) => (response.ok ? ((await response.json()) as Remote) : null))
        .then((data) => {
          if (!controller.signal.aborted) setRemote(data);
        })
        .catch(() => {
          if (!controller.signal.aborted) setRemote(null);
        })
        .finally(() => {
          if (!controller.signal.aborted) setChecking(false);
        });
    }, 350);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [password, email, localEmail?.ok]);

  const checks = remote?.password?.checks ?? localPassword?.checks ?? null;
  const passwordOk = Boolean(
    localPassword?.ok &&
      (remote?.password ? remote.password.ok : true) &&
      (confirm === undefined || password === confirm),
  );
  const emailPatternOk = Boolean(localEmail?.ok);
  const emailDomainOk = Boolean(remote?.email?.domain);
  const confirmMismatch =
    confirm !== undefined && password.length > 0 && confirm.length > 0 && password !== confirm;
  const emailMessage = !email.trim()
    ? null
    : !emailPatternOk
      ? (localEmail?.message ?? "Enter a valid email address")
      : checking && !remote?.email
        ? "Checking email domain…"
        : (remote?.email?.message ?? (emailDomainOk ? null : "Could not verify this email domain"));

  return {
    checks,
    passwordOk,
    emailOk: emailPatternOk && emailDomainOk,
    emailMessage,
    checking,
    confirmMismatch,
  };
}

export function CredentialChecks({
  email,
  password,
  check,
}: {
  email?: string;
  password?: string;
  check: ReturnType<typeof useCredentialCheck>;
}) {
  const showPassword = Boolean(password);
  const showEmail = Boolean(email?.trim());
  if (!showPassword && !showEmail) return null;

  return (
    <div className="space-y-2 rounded-lg border border-border/70 bg-muted/30 px-3 py-2" aria-live="polite">
      {showPassword && check.checks ? (
        <ul className="space-y-1 text-xs">
          {PASSWORD_ROWS.map((row) => {
            const ok = check.checks?.[row.key] === true;
            return (
              <li key={row.key} className={ok ? "text-emerald-700 dark:text-emerald-300" : "text-muted-foreground"}>
                <span aria-hidden>{ok ? "✓" : "•"} </span>
                {row.label}
              </li>
            );
          })}
          {check.confirmMismatch ? (
            <li className="text-destructive">
              <span aria-hidden>• </span>
              Passwords must match
            </li>
          ) : null}
        </ul>
      ) : null}
      {showEmail && check.emailMessage ? (
        <p className={`text-xs ${check.emailOk ? "text-emerald-700 dark:text-emerald-300" : "text-muted-foreground"}`}>
          {check.emailMessage}
        </p>
      ) : null}
      {showEmail && check.emailOk ? (
        <p className="text-xs text-emerald-700 dark:text-emerald-300">Email domain verified</p>
      ) : null}
    </div>
  );
}
