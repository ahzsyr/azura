"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { canToggleAccount } from "@/features/account/admin/user-portal-access";
import { disableAdminAction, enableAdminAction } from "@/features/auth/admin-staff.actions";
import { setCustomerDisabledAction } from "@/features/account/admin/customer-user-actions";

type Props = {
  userId: string;
  role: string;
  disabled: boolean;
  actorId: string;
  actorRole: string;
};

export function UserStatusButton({ userId, role, disabled, actorId, actorRole }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const allowed = canToggleAccount({
    actorId,
    actorRole,
    targetId: userId,
    targetRole: role,
  });
  if (!allowed) return null;

  async function toggle() {
    setBusy(true);
    setError("");
    const result =
      role === "CUSTOMER"
        ? await setCustomerDisabledAction(userId, !disabled)
        : disabled
          ? await enableAdminAction(userId)
          : await disableAdminAction(userId);
    setBusy(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <span className="inline-flex flex-col items-end gap-1">
      <Button
        type="button"
        size="sm"
        variant={disabled ? "outline" : "destructive"}
        disabled={busy}
        onClick={() => void toggle()}
      >
        {disabled ? "Enable" : "Disable"}
      </Button>
      {error ? <span className="text-destructive max-w-40 text-xs">{error}</span> : null}
    </span>
  );
}
