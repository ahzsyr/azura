import type { FooterSectionServerPlugin, FooterSectionType } from "./types";
import { brandMetadata } from "./brand/metadata";
import { createBrandDefault } from "./brand/create-default";
import { validateBrand } from "./brand/validate";
import { resolveBrand } from "./brand/resolve";
import { BrandRenderer } from "./brand/renderer";
import { menuMetadata } from "./menu/metadata";
import { createMenuDefault } from "./menu/create-default";
import { validateMenu } from "./menu/validate";
import { resolveMenu } from "./menu/resolve";
import { MenuRenderer } from "./menu/renderer";
import { contactMetadata } from "./contact/metadata";
import { createContactDefault } from "./contact/create-default";
import { validateContact } from "./contact/validate";
import { resolveContact } from "./contact/resolve";
import { ContactRenderer } from "./contact/renderer";
import { socialMetadata } from "./social/metadata";
import { createSocialDefault } from "./social/create-default";
import { validateSocial } from "./social/validate";
import { resolveSocial } from "./social/resolve";
import { SocialRenderer } from "./social/renderer";
import { textMetadata } from "./text/metadata";
import { createTextDefault } from "./text/create-default";
import { validateText } from "./text/validate";
import { resolveText } from "./text/resolve";
import { TextRenderer } from "./text/renderer";
import { legalMetadata } from "./legal/metadata";
import { createLegalDefault } from "./legal/create-default";
import { validateLegal } from "./legal/validate";
import { resolveLegal } from "./legal/resolve";
import { LegalRenderer } from "./legal/renderer";
import { newsletterServerPlugin } from "./newsletter/server-plugin";
import { paymentsServerPlugin } from "./payments/server-plugin";
import { trustServerPlugin } from "./trust/server-plugin";
import { openingHoursServerPlugin } from "./opening_hours/server-plugin";
import { appsServerPlugin } from "./apps/server-plugin";
import { logosServerPlugin } from "./logos/server-plugin";
import { partnersServerPlugin } from "./partners/server-plugin";
import { richTextServerPlugin } from "./rich_text/server-plugin";
import { customHtmlServerPlugin } from "./custom_html/server-plugin";
import type { ComponentType } from "react";
import type { SectionRenderProps } from "./types";

export type FooterSectionServerRegistryEntry = FooterSectionServerPlugin & {
  Renderer: ComponentType<SectionRenderProps>;
};

function entry(
  plugin: FooterSectionServerPlugin,
  Renderer: ComponentType<SectionRenderProps>,
): FooterSectionServerRegistryEntry {
  return { ...plugin, Renderer };
}

const plugins: FooterSectionServerRegistryEntry[] = [
  entry({ ...brandMetadata, createDefault: createBrandDefault, validate: validateBrand, resolve: resolveBrand }, BrandRenderer),
  entry({ ...menuMetadata, createDefault: createMenuDefault, validate: validateMenu, resolve: resolveMenu }, MenuRenderer),
  entry({ ...contactMetadata, createDefault: createContactDefault, validate: validateContact, resolve: resolveContact }, ContactRenderer),
  entry({ ...socialMetadata, createDefault: createSocialDefault, validate: validateSocial, resolve: resolveSocial }, SocialRenderer),
  entry({ ...textMetadata, createDefault: createTextDefault, validate: validateText, resolve: resolveText }, TextRenderer),
  entry({ ...legalMetadata, createDefault: createLegalDefault, validate: validateLegal, resolve: resolveLegal }, LegalRenderer),
  entry(newsletterServerPlugin, newsletterServerPlugin.Renderer),
  entry(paymentsServerPlugin, paymentsServerPlugin.Renderer),
  entry(trustServerPlugin, trustServerPlugin.Renderer),
  entry(openingHoursServerPlugin, openingHoursServerPlugin.Renderer),
  entry(appsServerPlugin, appsServerPlugin.Renderer),
  entry(logosServerPlugin, logosServerPlugin.Renderer),
  entry(partnersServerPlugin, partnersServerPlugin.Renderer),
  entry(richTextServerPlugin, richTextServerPlugin.Renderer),
  entry(customHtmlServerPlugin, customHtmlServerPlugin.Renderer),
];

export const footerSectionServerRegistry = Object.fromEntries(
  plugins.map((p) => [p.type, p]),
) as Record<FooterSectionType, FooterSectionServerRegistryEntry>;

export function getServerPlugin(type: string): FooterSectionServerRegistryEntry | null {
  return footerSectionServerRegistry[type as FooterSectionType] ?? null;
}

export function listServerPlugins(): FooterSectionServerRegistryEntry[] {
  return plugins;
}

export const BUILTIN_SECTION_TYPES = [
  "brand",
  "menu",
  "contact",
  "social",
  "text",
  "legal",
] as const satisfies readonly FooterSectionType[];

export const EXTENDED_SECTION_TYPES = [
  "newsletter",
  "payments",
  "trust",
  "opening_hours",
  "apps",
  "logos",
  "partners",
  "rich_text",
  "custom_html",
] as const satisfies readonly FooterSectionType[];
