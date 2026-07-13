/**
 * @deprecated Page starter templates are superseded by the Layout Engine's
 * Composition Presets. Kept temporarily for legacy migrations and demo flows.
 */
import type { BlockNode, PageBlocks } from "@/types/builder";
import {
  resolveBuiltinTemplate,
  resolveTemplateKey,
} from "@/features/builder/constants";
import { CMS_WIRED_PAGE_SLUGS } from "@/features/cms/cms-wired-pages";
import enMessages from "../../../messages/en.json";

export const CMS_PAGE_SLUGS = CMS_WIRED_PAGE_SLUGS;

type MessageTree = Record<string, unknown>;

const MESSAGES = enMessages as MessageTree;

function msg(messages: MessageTree, path: string): string {
  const value = path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object" && key in (acc as object)) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, messages);
  return typeof value === "string" ? value : "";
}

function cloneBlocks(blocks: PageBlocks): PageBlocks {
  return JSON.parse(JSON.stringify(blocks)) as PageBlocks;
}

function findBlock(blocks: PageBlocks, type: BlockNode["type"], index = 0): BlockNode | undefined {
  let seen = 0;
  for (const block of blocks) {
    if (block.type === type) {
      if (seen === index) return block;
      seen += 1;
    }
  }
  return undefined;
}

function patchHero(
  blocks: PageBlocks,
  messages: MessageTree,
  titlePath: string,
  subtitlePath: string,
  ctaLabelPath?: string
) {
  const hero = findBlock(blocks, "hero");
  if (!hero) return;
  hero.props.title = msg(messages, titlePath);
  hero.props.subtitle = msg(messages, subtitlePath);
  if (ctaLabelPath) {
    hero.props.ctaLabel = msg(messages, ctaLabelPath);
  }
}

function patchBlockTitle(
  block: BlockNode | undefined,
  messages: MessageTree,
  titlePath: string,
  subtitlePath?: string
) {
  if (!block) return;
  block.props.title = msg(messages, titlePath);
  if (subtitlePath) {
    block.props.subtitle = msg(messages, subtitlePath);
  }
}

function patchCta(blocks: PageBlocks, messages: MessageTree) {
  const cta = findBlock(blocks, "cta");
  if (!cta) return;
  cta.props.title = msg(messages, "cta.title");
  cta.props.button = msg(messages, "cta.button");
}

function applyI18nForSlug(slug: string, blocks: PageBlocks, messages: MessageTree) {
  switch (slug) {
    case "home":
      patchHero(blocks, messages, "hero.title", "hero.subtitle", "hero.ctaPrimary");
      patchBlockTitle(findBlock(blocks, "catalog"), messages, "packages.title", "packages.subtitle");
      patchBlockTitle(findBlock(blocks, "testimonials"), messages, "testimonials.title", "testimonials.subtitle");
      patchCta(blocks, messages);
      break;
    case "about":
      patchHero(blocks, messages, "about.title", "about.story");
      break;
    case "contact":
      patchHero(blocks, messages, "contact.title", "contact.subtitle");
      patchBlockTitle(findBlock(blocks, "inquiryForm"), messages, "contact.form");
      break;
    case "packages":
      patchHero(blocks, messages, "packages.title", "packages.subtitle");
      break;
    case "gallery":
      patchHero(blocks, messages, "gallery.title", "gallery.subtitle");
      patchBlockTitle(findBlock(blocks, "gallery"), messages, "gallery.title");
      break;
    case "testimonials":
      patchHero(blocks, messages, "testimonials.title", "testimonials.subtitle");
      patchBlockTitle(findBlock(blocks, "testimonials"), messages, "testimonials.title");
      break;
    case "hotels-transport":
      patchHero(blocks, messages, "hotels.title", "hotels.subtitle");
      patchBlockTitle(findBlock(blocks, "catalog", 0), messages, "hotels.hotels");
      patchBlockTitle(findBlock(blocks, "catalog", 1), messages, "hotels.transport");
      break;
    default:
      break;
  }
}

export function isEmptyBlocks(blocks: unknown): boolean {
  return !Array.isArray(blocks) || blocks.length === 0;
}

export function buildDefaultPageBlocks(slug: string, templateKey: string): PageBlocks {
  const resolvedKey = resolveTemplateKey(templateKey, slug);
  const template = resolveBuiltinTemplate(resolvedKey, slug);
  if (!template) return [];

  const blocks = cloneBlocks(template.blocks);
  applyI18nForSlug(slug, blocks, MESSAGES);
  return blocks;
}

export function buildDefaultPageBlocksFromTemplate(templateKey: string, slug?: string): PageBlocks {
  const template = resolveBuiltinTemplate(templateKey, slug);
  if (!template) return [];
  const blocks = cloneBlocks(template.blocks);
  if (slug) {
    applyI18nForSlug(slug, blocks, MESSAGES);
  }
  return blocks;
}
