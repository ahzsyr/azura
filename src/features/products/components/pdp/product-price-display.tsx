"use client";

import { useMemo } from "react";
import {
  formatPriceForTemplate,
  type PriceFormatSegment,
} from "@/features/products/lib/currency/display";
import type { ShopperCurrencyContext } from "@/features/products/lib/currency/types";

type Props = {
  ctx: ShopperCurrencyContext;
  amount: number;
  displayCode: string;
  numberLocale: string;
  className?: string;
};

function Segment({ segment }: { segment: PriceFormatSegment }) {
  if (segment.t === "txt") return <span className="price-vis__txt">{segment.v}</span>;
  if (segment.t === "img") {
    return (
      <img
        className="price-vis__img"
        src={segment.src}
        alt=""
        width={20}
        height={20}
        decoding="async"
        data-skip-img-fade
      />
    );
  }
  if (segment.t === "svg") {
    return <span className="price-vis__svg" dangerouslySetInnerHTML={{ __html: segment.html }} />;
  }
  return <span className="price-vis__sym">{segment.v}</span>;
}

export function ProductPriceDisplay({
  ctx,
  amount,
  displayCode,
  numberLocale,
  className = "",
}: Props) {
  const vis = useMemo(
    () => formatPriceForTemplate(ctx, amount, displayCode, numberLocale),
    [ctx, amount, displayCode, numberLocale],
  );

  if (!vis.useGlyph) {
    return <span className={`price-vis ${className}`.trim()}>{vis.formatted}</span>;
  }

  return (
    <span className={`price-vis ${className}`.trim()}>
      <span className="price-vis__row">
        {vis.segments.map((s, i) => (
          <Segment key={i} segment={s} />
        ))}
      </span>
    </span>
  );
}
