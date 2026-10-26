"use client";

/**
 * Promote a customer to Admin / demote an Admin to a normal user.
 * Rendered for the Super Admin only; the server action re-checks the rule.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { changeUserRoleAction } from "@/features/account/admin/customer-user-actions";

type Props = {
  userId: string;
  role: "ADMIN" | "CUSTOMER";
  userName: string;
};

export function UserRoleSelect({ userId, role, userName }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const next = role === "ADMIN" ? "CUSTOMER" : "ADMIN";

  async function change() {
    const label = next === "ADMIN" ? "Admin" : "normal user";
    if (
      !window.confirm(
        `Change ${userName} to ${label}? Their sessions are signed out and the new role applies at their next sign-in.`,
      )
    ) {
      return;
    }
    setBusy(true);
    setError("");
    setMessage("");
    const result = await changeUserRoleAction(userId, next);
    setBusy(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setMessage(next === "ADMIN" ? "Promoted to Admin." : "Changed to a normal user.");
    router.refresh();
  }

  return (
    <div className="space-y-2">
      <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => void change()}>
        {next === "ADMIN" ? "Promote to Admin" : "Demote to normal user"}
      </Button>
      {message ? <p className="text-sm text-emerald-700 dark:text-emerald-300">{message}</p> : null}
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
    </div>
  );
}
