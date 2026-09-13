"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import type { QuickViewSeed } from "./quick-view-types";

const ProductQuickViewModal = dynamic(
  () =>
    import("./product-quick-view-modal").then((m) => m.ProductQuickViewModal),
  { ssr: false },
);

type QuickViewOpenState = {
  slug: string;
  localePrefix: string;
  seed?: QuickViewSeed;
};

type QuickViewEventDetail = QuickViewOpenState;

export function ProductQuickViewProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState<QuickViewOpenState | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<QuickViewEventDetail>).detail;
      if (detail?.slug) {
        setOpen({
          slug: detail.slug,
          localePrefix: detail.localePrefix ?? "en",
          seed: detail.seed,
        });
      }
    };
    window.addEventListener("az:product-quick-view", handler);
    return () => window.removeEventListener("az:product-quick-view", handler);
  }, []);

  const onClose = useCallback(() => setOpen(null), []);

  return (
    <>
      {children}
      {open ? (
        <ProductQuickViewModal
          slug={open.slug}
          localePrefix={open.localePrefix}
          seed={open.seed ?? null}
          onClose={onClose}
        />
      ) : null}
    </>
  );
}
