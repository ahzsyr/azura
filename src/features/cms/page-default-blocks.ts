import type { BlockNode, PageBlocks } from "@/types/builder";
import {
  resolveBuiltinTemplate,
  resolveTemplateKey,
} from "@/features/builder/constants";
import { CMS_WIRED_PAGE_SLUGS } from "@/features/cms/cms-wired-pages";
import enMessages from "../../../messages/en.json";
import arMessages from "../../../messages/ar.json";

export const CMS_PAGE_SLUGS = CMS_WIRED_PAGE_SLUGS;

type MessageTree = Record<string, unknown>;

const MESSAGES = {
  en: enMessages as MessageTree,
  ar: arMessages as MessageTree,
};

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
  en: MessageTree,
  ar: MessageTree,
  titlePath: string,
  subtitlePath: string,
  ctaLabelPath?: string
) {
  const hero = findBlock(blocks, "hero");
  if (!hero) return;
  hero.props.titleEn = msg(en, titlePath);
  hero.props.titleAr = msg(ar, titlePath);
  hero.props.subtitleEn = msg(en, subtitlePath);
  hero.props.subtitleAr = msg(ar, subtitlePath);
  if (ctaLabelPath) {
    hero.props.ctaLabelEn = msg(en, ctaLabelPath);
    hero.props.ctaLabelAr = msg(ar, ctaLabelPath);
  }
}

function patchBlockTitle(
  block: BlockNode | undefined,
  en: MessageTree,
  ar: MessageTree,
  titlePath: string,
  subtitlePath?: string
) {
  if (!block) return;
  block.props.titleEn = msg(en, titlePath);
  block.props.titleAr = msg(ar, titlePath);
  if (subtitlePath) {
    block.props.subtitleEn = msg(en, subtitlePath);
    block.props.subtitleAr = msg(ar, subtitlePath);
  }
}

function patchCta(blocks: PageBlocks, en: MessageTree, ar: MessageTree) {
  const cta = findBlock(blocks, "cta");
  if (!cta) return;
  cta.props.titleEn = msg(en, "cta.title");
  cta.props.titleAr = msg(ar, "cta.title");
  cta.props.buttonEn = msg(en, "cta.button");
  cta.props.buttonAr = msg(ar, "cta.button");
}

function applyI18nForSlug(slug: string, blocks: PageBlocks, en: MessageTree, ar: MessageTree) {
  switch (slug) {
    case "home":
      patchHero(blocks, en, ar, "hero.title", "hero.subtitle", "hero.ctaPrimary");
      patchBlockTitle(findBlock(blocks, "catalog"), en, ar, "packages.title", "packages.subtitle");
      patchBlockTitle(findBlock(blocks, "testimonials"), en, ar, "testimonials.title", "testimonials.subtitle");
      patchCta(blocks, en, ar);
      break;
    case "about":
      patchHero(blocks, en, ar, "about.title", "about.story");
      break;
    case "contact":
      patchHero(blocks, en, ar, "contact.title", "contact.subtitle");
      patchBlockTitle(findBlock(blocks, "inquiryForm"), en, ar, "contact.form");
      break;
    case "packages":
      patchHero(blocks, en, ar, "packages.title", "packages.subtitle");
      break;
    case "gallery":
      patchHero(blocks, en, ar, "gallery.title", "gallery.subtitle");
      patchBlockTitle(findBlock(blocks, "gallery"), en, ar, "gallery.title");
      break;
    case "testimonials":
      patchHero(blocks, en, ar, "testimonials.title", "testimonials.subtitle");
      patchBlockTitle(findBlock(blocks, "testimonials"), en, ar, "testimonials.title");
      break;
    case "hotels-transport":
      patchHero(blocks, en, ar, "hotels.title", "hotels.subtitle");
      patchBlockTitle(findBlock(blocks, "catalog", 0), en, ar, "hotels.hotels");
      patchBlockTitle(findBlock(blocks, "catalog", 1), en, ar, "hotels.transport");
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
  applyI18nForSlug(slug, blocks, MESSAGES.en, MESSAGES.ar);
  return blocks;
}

export function buildDefaultPageBlocksFromTemplate(templateKey: string, slug?: string): PageBlocks {
  const template = resolveBuiltinTemplate(templateKey, slug);
  if (!template) return [];
  const blocks = cloneBlocks(template.blocks);
  if (slug) {
    applyI18nForSlug(slug, blocks, MESSAGES.en, MESSAGES.ar);
  }
  return blocks;
}
