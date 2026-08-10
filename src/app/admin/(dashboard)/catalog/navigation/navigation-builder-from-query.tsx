"use client";

import { useSearchParams } from "next/navigation";
import { CatalogNavigationBuilder } from "@/features/catalog/admin/navigation/CatalogNavigationBuilder";
import type { CatalogNavigationScopeType } from "@/features/catalog/navigation/types";
import type { ThemeTokens } from "@/types/theme";

export function CatalogNavigationBuilderFromQuery({ themeTokens }: { themeTokens: ThemeTokens }) {
  const params = useSearchParams();
  const scopeType = (params.get("scopeType") || "GLOBAL") as CatalogNavigationScopeType;
  const scopeIdRaw = params.get("scopeId");
  const scopeId = scopeIdRaw && scopeIdRaw.length ? scopeIdRaw : null;
  return (
    <CatalogNavigationBuilder
      initialScopeType={scopeType}
      initialScopeId={scopeId}
      themeTokens={themeTokens}
    />
  );
}
