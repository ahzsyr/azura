"use client";

import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { PDP_NON_DESKTOP_QUERY } from "@/features/products/lib/product-pdp-breakpoints";
import type { ProductDetailedSection } from "../../types";

function useIsPdpNonDesktop() {
  return useSyncExternalStore(
    (onStoreChange) => {
      const mq = window.matchMedia(PDP_NON_DESKTOP_QUERY);
      mq.addEventListener("change", onStoreChange);
      return () => mq.removeEventListener("change", onStoreChange);
    },
    () => window.matchMedia(PDP_NON_DESKTOP_QUERY).matches,
    () => false,
  );
}

type Props = {
  sections: ProductDetailedSection[];
  description?: string;
  shortDescription?: string;
  emptyLabel?: string;
  collapseLabel?: string;
};

function DescriptionSections({ sections }: { sections: ProductDetailedSection[] }) {
  return (
    <>
      {sections.map((block, idx) => (
        <section key={idx} className="prd-desc__block">
          {block.heading?.trim() ? (
            <h3 className="prd-desc__heading">{block.heading.trim()}</h3>
          ) : null}
          {block.text?.trim() ? <div className="prd-desc__text">{block.text}</div> : null}
        </section>
      ))}
    </>
  );
}

function MobileCollapsible({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  const isNonDesktop = useIsPdpNonDesktop();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(!isNonDesktop);
  }, [isNonDesktop]);

  if (!isNonDesktop) {
    return <div className={className}>{children}</div>;
  }

  return (
    <details
      className={`${className ?? ""} prd-desc--collapsible`.trim()}
      open={open}
      onToggle={(event) => setOpen((event.currentTarget as HTMLDetailsElement).open)}
    >
      <summary className="prd-desc__summary">{label}</summary>
      <div className="prd-desc__body">{children}</div>
    </details>
  );
}

export function ProductDescriptionPanel({
  sections,
  description,
  shortDescription,
  emptyLabel = "No description for this product yet.",
  collapseLabel = "Description",
}: Props) {
  const hasSections = sections.some((s) => (s.heading?.trim() || s.text?.trim()).length > 0);

  if (hasSections) {
    return (
      <MobileCollapsible label={collapseLabel} className="prd-desc">
        <DescriptionSections sections={sections} />
      </MobileCollapsible>
    );
  }

  const text = description?.trim() || shortDescription?.trim();
  if (text) {
    return (
      <MobileCollapsible label={collapseLabel} className="prd-desc">
        <p className="prd-text prd-desc__text">{text}</p>
      </MobileCollapsible>
    );
  }

  return <p className="prd-text prd-text--muted">{emptyLabel}</p>;
}
