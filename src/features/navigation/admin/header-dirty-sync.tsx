"use client";

import { useStore } from "@nanostores/react";
import { useEffect } from "react";
import { $workspaceIsDirty } from "@/features/navigation/header-store";
import { useAdminFormOptional } from "@/components/admin/layout/admin-form-provider";

/** Syncs header workspace dirty state with the admin top-bar Save button. */
export function HeaderDirtySync() {
  const isDirty = useStore($workspaceIsDirty);
  const adminForm = useAdminFormOptional();

  useEffect(() => {
    adminForm?.setDirty(isDirty);
  }, [isDirty, adminForm]);

  return null;
}
