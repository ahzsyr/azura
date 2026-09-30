"use client";

import { useEffect } from "react";
import type { ThemeTokens } from "@/types/theme";
import { useAdminFormOptional } from "@/components/admin/layout/admin-form-provider";

type Props = {
  state: ThemeTokens;
  savedSnapshot: string;
  /** Additional dirty sources (e.g. page transitions) that live outside ThemeTokens. */
  extraDirty?: boolean;
};

export function ThemeDirtySync({ state, savedSnapshot, extraDirty = false }: Props) {
  const adminForm = useAdminFormOptional();

  useEffect(() => {
    const themeDirty = JSON.stringify(state) !== savedSnapshot;
    adminForm?.setDirty(themeDirty || extraDirty);
  }, [state, savedSnapshot, extraDirty, adminForm]);

  return null;
}
