"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { CATALOG_WORKSPACE_NAV } from "@/features/catalog/admin/catalog-workspace-nav";

type NamedItem = { id?: string; slug: string; name: string };

export type CatalogCommandPaletteProps = {
  products?: NamedItem[];
  categories?: NamedItem[];
};

const ACTIONS = [
  { id: "new-product", label: "New Product", href: "/admin/products#new" },
  { id: "new-category", label: "New Category", href: "/admin/categories#new" },
  { id: "preview-sync", label: "Preview Sync", href: "/admin/catalog/sync" },
] as const;

export function CatalogCommandPalette({
  products = [],
  categories = [],
}: CatalogCommandPaletteProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const q = query.trim().toLowerCase();

  const filteredProducts = useMemo(() => {
    if (!q) return products.slice(0, 8);
    return products
      .filter((p) => p.name.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q))
      .slice(0, 8);
  }, [products, q]);

  const filteredCategories = useMemo(() => {
    if (!q) return categories.slice(0, 8);
    return categories
      .filter((c) => c.name.toLowerCase().includes(q) || c.slug.toLowerCase().includes(q))
      .slice(0, 8);
  }, [categories, q]);

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80]">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Close command palette"
        onClick={() => setOpen(false)}
      />
      <div className="relative mx-auto mt-[12vh] w-full max-w-lg px-4">
        <Command
          className="overflow-hidden rounded-xl border bg-background shadow-xl"
          label="Catalog command palette"
          shouldFilter={false}
        >
          <div className="border-b px-3 py-2">
            <Command.Input
              value={query}
              onValueChange={setQuery}
              placeholder="Search catalog… (Ctrl/Cmd+K)"
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              autoFocus
            />
          </div>
          <Command.List className="max-h-[50vh] overflow-y-auto p-2 text-sm">
            <Command.Empty className="px-2 py-6 text-center text-muted-foreground">
              No matches.
            </Command.Empty>

            <Command.Group heading="Navigate" className="mb-2">
              {CATALOG_WORKSPACE_NAV.map((item) => (
                <Command.Item
                  key={item.id}
                  value={item.label}
                  onSelect={() => go(item.href)}
                  className="cursor-pointer rounded-md px-2 py-1.5 aria-selected:bg-muted"
                >
                  {item.label}
                </Command.Item>
              ))}
            </Command.Group>

            <Command.Group heading="Actions" className="mb-2">
              {ACTIONS.map((action) => (
                <Command.Item
                  key={action.id}
                  value={action.label}
                  onSelect={() => go(action.href)}
                  className="cursor-pointer rounded-md px-2 py-1.5 aria-selected:bg-muted"
                >
                  {action.label}
                </Command.Item>
              ))}
            </Command.Group>

            {filteredProducts.length > 0 ? (
              <Command.Group heading="Products" className="mb-2">
                {filteredProducts.map((p) => (
                  <Command.Item
                    key={p.slug}
                    value={`product ${p.name} ${p.slug}`}
                    onSelect={() => go(`/admin/products?edit=${encodeURIComponent(p.slug)}`)}
                    className="cursor-pointer rounded-md px-2 py-1.5 aria-selected:bg-muted"
                  >
                    {p.name}
                    <span className="ml-2 text-xs text-muted-foreground">/{p.slug}</span>
                  </Command.Item>
                ))}
              </Command.Group>
            ) : null}

            {filteredCategories.length > 0 ? (
              <Command.Group heading="Categories" className="mb-2">
                {filteredCategories.map((c) => (
                  <Command.Item
                    key={c.slug}
                    value={`category ${c.name} ${c.slug}`}
                    onSelect={() => go(`/admin/categories?edit=${encodeURIComponent(c.slug)}`)}
                    className="cursor-pointer rounded-md px-2 py-1.5 aria-selected:bg-muted"
                  >
                    {c.name}
                    <span className="ml-2 text-xs text-muted-foreground">/{c.slug}</span>
                  </Command.Item>
                ))}
              </Command.Group>
            ) : null}
          </Command.List>
        </Command>
      </div>
    </div>
  );
}
