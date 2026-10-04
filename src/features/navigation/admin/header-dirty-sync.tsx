"use client";

import { useEffect } from "react";
import { useHeaderWorkspaceIsDirty } from "@/features/navigation/header-store";
import { useAdminFormOptional } from "@/components/admin/layout/admin-form-provider";

/** Syncs header workspace dirty state with the admin top-bar Save button. */
export function HeaderDirtySync() {
  const isDirty = useHeaderWorkspaceIsDirty();
  const adminForm = useAdminFormOptional();

  useEffect(() => {
    adminForm?.setDirty(isDirty);
  }, [isDirty, adminForm]);

  return null;
}
