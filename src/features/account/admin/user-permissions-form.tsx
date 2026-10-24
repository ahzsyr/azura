"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ADMIN_SECTION_OPTIONS,
  type AdminSectionId,
} from "@/features/auth/admin-section-grants";
import { saveAdminSectionGrantsAction } from "@/features/account/admin/user-portal.actions";

type Props = {
  userId: string;
  grants: AdminSectionId[] | null;
};

export function UserPermissionsForm({ userId, grants }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<AdminSectionId[]>(
    grants ?? ADMIN_SECTION_OPTIONS.map((option) => option.id),
  );
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function toggle(id: AdminSectionId) {
    setSelected((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  async function save() {
    setBusy(true);
    setError("");
    setMessage("");
    const result = await saveAdminSectionGrantsAction(userId, selected);
    setBusy(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setMessage(grants == null ? "Permissions saved. This admin no longer has automatic full access." : "Permissions saved.");
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Permissions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-muted-foreground text-sm">
          {grants == null
            ? "This admin currently has every section. Saving stores the boxes you leave checked."
            : "Unchecked sections disappear from the sidebar and cannot be opened directly."}
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {ADMIN_SECTION_OPTIONS.map((option) => (
            <label key={option.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={selected.includes(option.id)}
                onChange={() => toggle(option.id)}
              />
              {option.label}
            </label>
          ))}
        </div>
        {message ? <p className="text-sm text-emerald-700 dark:text-emerald-300">{message}</p> : null}
        {error ? <p className="text-destructive text-sm">{error}</p> : null}
        <Button type="button" size="sm" disabled={busy} onClick={() => void save()}>
          Save permissions
        </Button>
      </CardContent>
    </Card>
  );
}
