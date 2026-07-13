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
  /** When false, content is shown without an inner collapse (e.g. tab accordion mode). */
  collapsible?: boolean;
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

function ToggleCollapse({
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
      <summary className="prd-desc__summary">
        <span className="prd-desc__summary-label">{label}</span>
        <span className="prd-desc__chevron" aria-hidden="true">▼</span>
      </summary>
      <div className="prd-desc__body">
        <div className="prd-desc__body-inner">{children}</div>
      </div>
    </details>
  );
}

export function ProductDescriptionPanel({
  sections,
  description,
  shortDescription,
  emptyLabel = "No description for this product yet.",
  collapseLabel = "Description",
  collapsible = true,
}: Props) {
  const hasSections = sections.some((s) => (s.heading?.trim() || s.text?.trim()).length > 0);

  const wrap = (content: ReactNode) => {
    if (!collapsible) {
      return <div className="prd-desc">{content}</div>;
    }
    return (
      <ToggleCollapse label={collapseLabel} className="prd-desc">
        {content}
      </ToggleCollapse>
    );
  };

  if (hasSections) {
    return wrap(<DescriptionSections sections={sections} />);
  }

  const text = description?.trim() || shortDescription?.trim();
  if (text) {
    return wrap(<p className="prd-text prd-desc__text">{text}</p>);
  }

  return <p className="prd-text prd-text--muted">{emptyLabel}</p>;
}
