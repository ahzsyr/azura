"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState, type ReactNode } from "react";

const ProductQuickViewModal = dynamic(
  () =>
    import("./product-quick-view-modal").then((m) => m.ProductQuickViewModal),
  { ssr: false },
);

type QuickViewEventDetail = { slug: string; localePrefix: string };

export function ProductQuickViewProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState<{ slug: string; localePrefix: string } | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<QuickViewEventDetail>).detail;
      if (detail?.slug) {
        setOpen({ slug: detail.slug, localePrefix: detail.localePrefix ?? "en" });
      }
    };
    window.addEventListener("az:product-quick-view", handler);
    return () => window.removeEventListener("az:product-quick-view", handler);
  }, []);

  const onClose = useCallback(() => setOpen(null), []);

  return (
    <>
      {children}
      <ProductQuickViewModal
        slug={open?.slug ?? null}
        localePrefix={open?.localePrefix ?? "en"}
        onClose={onClose}
      />
    </>
  );
}
