"use client";

import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { CatalogAdminShell } from "./catalog-admin-shell";
import { CatalogPrimaryNav } from "./ui/catalog-primary-nav";
import { CatalogCommandPalette } from "./CatalogCommandPalette";

type CatalogWorkspaceShellProps = {
  children: ReactNode;
  className?: string;
  /** Hide primary catalog nav (rare). */
  hidePrimaryNav?: boolean;
};

type NamedItem = { slug: string; name: string };

/**
 * Shared Catalog Management workspace chrome.
 * Primary nav: Products · Categories · Brands · Navigation · Filters · Sync · Settings
 * Includes Ctrl/Cmd+K command palette.
 */
export function CatalogWorkspaceShell({
  children,
  className,
  hidePrimaryNav = false,
}: CatalogWorkspaceShellProps) {
  const [products, setProducts] = useState<NamedItem[]>([]);
  const [categories, setCategories] = useState<NamedItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [pRes, cRes] = await Promise.all([
          fetch("/api/products?locale=en-us", { credentials: "include" }),
          fetch("/api/categories", { credentials: "include" }),
        ]);
        if (cancelled) return;
        if (pRes.ok) {
          const pJson = (await pRes.json()) as {
            products?: Array<{ slug: string; name?: string }>;
          };
          setProducts(
            (pJson.products ?? []).map((p) => ({
              slug: p.slug,
              name: p.name || p.slug,
            })),
          );
        }
        if (cRes.ok) {
          const cJson = (await cRes.json()) as {
            collections?: Array<{ slug: string; name?: string }>;
            categories?: Array<{ slug: string; name?: string }>;
          };
          const list = cJson.collections ?? cJson.categories ?? [];
          setCategories(
            list.map((c) => ({
              slug: c.slug,
              name: c.name || c.slug,
            })),
          );
        }
      } catch {
        /* optional relational search */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className={cn("space-y-4", className)}>
      {!hidePrimaryNav ? <CatalogPrimaryNav /> : null}
      {children}
      <CatalogCommandPalette products={products} categories={categories} />
    </div>
  );
}

/** Feature-level tab ribbon inside the workspace (products/categories/brands). */
export const CatalogWorkspacePanelShell = CatalogAdminShell;
