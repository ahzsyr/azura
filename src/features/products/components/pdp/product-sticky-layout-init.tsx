"use client";

import { useEffect } from "react";
import { initProductStickyLayout } from "../../lib/product-sticky-layout";

/** Wires sticky breadcrumb + buy rail offsets on product detail pages. */
export function ProductStickyLayoutInit() {
  useEffect(() => initProductStickyLayout(), []);
  return null;
}
