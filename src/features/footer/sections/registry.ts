"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import type { FooterSectionPlugin, FooterSectionType, SectionEditorProps } from "./types";
import {
  footerSectionServerRegistry,
  listServerPlugins,
  type FooterSectionServerRegistryEntry,
} from "./registry.server";

const lazyEditors: Partial<Record<FooterSectionType, ComponentType<SectionEditorProps>>> = {
  brand: dynamic(() => import("./brand/editor").then((m) => m.BrandEditor)),
  menu: dynamic(() => import("./menu/editor").then((m) => m.MenuEditor)),
  social: dynamic(() => import("./social/editor").then((m) => m.SocialEditor)),
};

function toClientPlugin(server: FooterSectionServerRegistryEntry): FooterSectionPlugin {
  return {
    ...server,
    Editor: lazyEditors[server.type],
  };
}

export const footerSectionRegistry: Record<FooterSectionType, FooterSectionPlugin> = Object.fromEntries(
  listServerPlugins().map((p) => [p.type, toClientPlugin(p)]),
) as Record<FooterSectionType, FooterSectionPlugin>;

export function getFooterPlugin(type: string): FooterSectionPlugin | null {
  return footerSectionRegistry[type as FooterSectionType] ?? null;
}

export function listFooterPlugins(): FooterSectionPlugin[] {
  return Object.values(footerSectionRegistry);
}

export { footerSectionServerRegistry, BUILTIN_SECTION_TYPES, EXTENDED_SECTION_TYPES } from "./registry.server";
