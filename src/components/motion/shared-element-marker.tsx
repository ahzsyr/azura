"use client";

import type { CSSProperties, ElementType, ReactNode } from "react";
import {
  sharedElementAttrs,
  type SharedElementKind,
  type SharedElementType,
} from "@/lib/navigation/shared-elements";

type Props = {
  type: SharedElementType;
  id: string;
  kind: SharedElementKind;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  as?: ElementType;
} & Record<string, unknown>;

/** Client wrapper that marks an element for shared view transitions. */
export function SharedElementMarker({
  type,
  id,
  kind,
  children,
  className,
  style,
  as: Tag = "div",
  ...rest
}: Props) {
  const attrs = sharedElementAttrs(type, id, kind);
  return (
    <Tag
      className={className}
      style={{ ...attrs.style, ...style }}
      data-shared-element={attrs["data-shared-element"]}
      data-shared-element-type={attrs["data-shared-element-type"]}
      data-shared-element-id={attrs["data-shared-element-id"]}
      {...rest}
    >
      {children}
    </Tag>
  );
}
