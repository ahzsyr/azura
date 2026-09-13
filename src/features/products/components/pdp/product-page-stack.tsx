"use client";

import type { ReactNode } from "react";
import { Fragment } from "react";
import {
  resolveProductPageStackOrder,
  type ProductPageStackKey,
} from "@/features/products/lib/product-page-stack-order";
import { useProductPageResponsive } from "./product-page-responsive-provider";

export type ProductPageStackBlocks = Partial<Record<ProductPageStackKey, ReactNode>>;

type Props = {
  blocks: ProductPageStackBlocks;
};

function renderBlock(key: ProductPageStackKey, node: ReactNode | undefined | null) {
  if (!node) return null;
  return <Fragment key={key}>{node}</Fragment>;
}

/** Unified mobile/tablet column — renders blocks in configured stack order. */
export function ProductPageStack({ blocks }: Props) {
  const { layout, elementOrder, viewport, resolvedLayout } = useProductPageResponsive();
  const stackOrder = resolveProductPageStackOrder({
    layout,
    mainOrder: elementOrder.main,
    stackOrderOverride: layout.mobileStackOrder.length ? layout.mobileStackOrder : null,
  }).filter((key) => resolvedLayout.visibleBlocks.includes(key));

  const useTabletSplit = viewport === "tablet" && layout.tabletColumnMode === "split";
  const gallery = blocks.gallery;
  const sideBuyBox = blocks.sideBuyBox;
  const rendered = new Set<ProductPageStackKey>();

  const nodes: ReactNode[] = [];

  if (useTabletSplit && gallery && sideBuyBox) {
    nodes.push(
      <div key="split" className="prd-page__split">
        <div className="prd-page__split-media">{gallery}</div>
        <div className="prd-page__split-buy">{sideBuyBox}</div>
      </div>,
    );
    rendered.add("gallery");
    rendered.add("sideBuyBox");
  }

  for (const key of stackOrder) {
    if (rendered.has(key)) continue;
    const node = renderBlock(key, blocks[key]);
    if (node) nodes.push(node);
  }

  return <div className="prd-page__stack">{nodes}</div>;
}
