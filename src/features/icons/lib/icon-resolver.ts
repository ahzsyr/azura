"use client";

import type { ComponentType } from "react";
import type { LucideIcon } from "lucide-react";
import { resolveBuiltinLucideIcon } from "./builtin-icons";

export type ResolvedIcon =
  | { kind: "builtin"; icon: LucideIcon }
  | { kind: "custom-svg"; svgContent: string }
  | { kind: "font"; fontFamily: string; glyph: string; unicode?: string | null; fontUrl?: string | null };

// Scaffold resolver: for Phase 2 we only support built-ins via the explicit lucide registry.
// Later phases will extend to DB-backed IconAsset for custom svg and font icons.
export function resolveIconById(iconId: string): ResolvedIcon | null {
  const builtin = resolveBuiltinLucideIcon(iconId);
  if (builtin) return { kind: "builtin", icon: builtin };
  return null;
}

export function isResolvedBuiltinIcon(value: ResolvedIcon | null): value is { kind: "builtin"; icon: LucideIcon } {
  return Boolean(value && value.kind === "builtin");
}

export type IconRenderProps = {
  iconId: string;
  className?: string;
  strokeWidth?: number;
};

