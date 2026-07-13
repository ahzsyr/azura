"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Props = {
  text: string;
  clampLines?: number;
  moreLabel?: string;
  lessLabel?: string;
};

export function CatalogHeroExpandableDescription({
  text,
  clampLines = 3,
  moreLabel = "View more",
  lessLabel = "View less",
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);
  const descRef = useRef<HTMLParagraphElement>(null);

  const checkOverflow = useCallback(() => {
    const el = descRef.current;
    if (!el || expanded) return;
    setOverflows(el.scrollHeight > el.clientHeight + 1);
  }, [expanded]);

  useEffect(() => {
    checkOverflow();
    const el = descRef.current;
    if (!el) return;

    const observer = new ResizeObserver(checkOverflow);
    observer.observe(el);
    return () => observer.disconnect();
  }, [text, checkOverflow]);

  useEffect(() => {
    if (expanded) setOverflows(true);
    else checkOverflow();
  }, [expanded, checkOverflow]);

  return (
    <div className="catalog-hero__desc-wrap">
      <p
        ref={descRef}
        className={`catalog-hero__desc${expanded ? "" : " catalog-hero__desc--clamped"}`}
        style={expanded ? undefined : { WebkitLineClamp: clampLines }}
      >
        {text}
      </p>
      {overflows ? (
        <button
          type="button"
          className="catalog-hero__desc-toggle"
          onClick={() => setExpanded((e) => !e)}
          aria-expanded={expanded}
        >
          {expanded ? lessLabel : moreLabel}
        </button>
      ) : null}
    </div>
  );
}
