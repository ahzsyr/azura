"use client";

import { useEffect, useRef, useState } from "react";
import {
  COMPARE_CHANGED_EVENT,
  isInCompareList,
  toggleCompareList,
} from "@/features/comparison/comparison-store";
import { ArrowLeftRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  contentTypeSlug: string;
  itemId: string;
  maxItems: number;
  label?: string;
  className?: string;
  /** `card` = circular overlay on catalog cards (Astro-style); `inline` = text button */
  variant?: "inline" | "card";
};

export function AddToCompareButton({
  contentTypeSlug,
  itemId,
  maxItems,
  label = "Compare",
  className,
  variant = "card",
}: Props) {
  const [active, setActive] = useState(false);
  const [full, setFull] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const toastRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const sync = () => setActive(isInCompareList(contentTypeSlug, itemId));
    sync();
    window.addEventListener(COMPARE_CHANGED_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(COMPARE_CHANGED_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [contentTypeSlug, itemId]);

  const onClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const wasActive = isInCompareList(contentTypeSlug, itemId);
    const result = toggleCompareList(contentTypeSlug, itemId, maxItems);
    setActive(isInCompareList(contentTypeSlug, itemId));

    if (result === "full") {
      setFull(true);
      window.setTimeout(() => setFull(false), 2500);
      return;
    }

    if (result === "added" && !wasActive) {
      setJustAdded(true);
      window.setTimeout(() => setJustAdded(false), 400);
    }
  };

  const isCard = variant === "card";
  const title = full
    ? `Maximum ${maxItems} items`
    : active
      ? `${label} — selected`
      : label;

  return (
    <span className={cn("cmp-add-btn-wrap", isCard && "cmp-add-btn-wrap--card", className)}>
      <button
        type="button"
        className={cn(
          "cmp-add-btn",
          isCard && "cmp-add-btn--card",
          active && "is-active",
          justAdded && "is-just-added",
          full && "is-full"
        )}
        onClick={onClick}
        aria-pressed={active}
        title={title}
        aria-label={isCard ? title : undefined}
      >
        <span className="cmp-add-btn__icon" aria-hidden="true">
          <ArrowLeftRight size={16} strokeWidth={2} />
        </span>
        {!isCard ? <span className="cmp-add-btn__label">{label}</span> : null}
      </button>
      <span
        ref={toastRef}
        className="cmp-add-btn__toast"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {full ? `Maximum ${maxItems} items` : ""}
      </span>
    </span>
  );
}
