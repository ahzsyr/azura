"use client";

import { useEffect } from "react";
import type { ThemeTokens } from "@/types/theme";
import { useAdminFormOptional } from "@/components/admin/layout/admin-form-provider";

type Props = {
  state: ThemeTokens;
  savedSnapshot: string;
};

export function ThemeDirtySync({ state, savedSnapshot }: Props) {
  const adminForm = useAdminFormOptional();

  useEffect(() => {
    adminForm?.setDirty(JSON.stringify(state) !== savedSnapshot);
  }, [state, savedSnapshot, adminForm]);

  return null;
}
