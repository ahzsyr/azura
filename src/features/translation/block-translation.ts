import { createHash } from "node:crypto";
import type { EntityTranslation } from "@prisma/client";
import type { PublicLocale } from "@/i18n/locale-config";
import { getContentFieldSuffix } from "@/i18n/locale-config";
import type { BlockNode, BlockType, PageBlocks } from "@/types/builder";
import type { EntityTranslationInput } from "./types";

export const BUILDER_BLOCK_ENTITY_TYPE = "BuilderBlock";

export type BlockParentType = "CmsPage" | "Post" | "ContentItem";

/** Translatable text fields per block type */
export const BLOCK_TRANSLATABLE_FIELDS: Partial<Record<BlockType, string[]>> = {
  hero: ["title", "subtitle", "badge", "ctaLabel", "secondaryCtaLabel"],
  text: ["content"],
  image: ["alt"],
  gallery: ["title"],
  faq: ["title"],
  testimonials: ["title"],
  pricing: ["title"],
  cta: ["title", "subtitle", "button", "secondaryButton", "promoBadge", "promoText", "countdownLabel"],
  video: ["title", "caption"],
  richText: ["html"],
  customHtml: ["html"],
  catalog: ["title", "subtitle", "emptyMessage"],
  contentList: ["title", "subtitle"],
  inquiryForm: ["title"],
  advancedRichText: ["content", "html"],
  markdown: ["markdown"],
  code: ["title"],
  table: ["title"],
  timeline: ["title"],
  changelog: ["title"],
  comparison: ["title"],
  featureGrid: ["title", "subtitle"],
  benefitsGrid: ["title", "subtitle"],
  trustBadges: ["title", "subtitle"],
  logoCloud: ["title", "subtitle"],
  statsCounter: ["title", "subtitle"],
  beforeAfter: ["title", "subtitle", "beforeLabel", "afterLabel"],
  videoHero: ["title", "subtitle", "badge", "ctaLabel", "secondaryCtaLabel"],
  videoGallery: ["title", "subtitle"],
  interactiveHotspots: ["title", "subtitle"],
  masonryGallery: ["title", "subtitle"],
  productGrid: ["title", "subtitle", "badge", "emptyMessage"],
  productCarousel: ["title", "subtitle", "emptyMessage"],
  productComparison: ["title"],
  productSpecifications: ["title"],
  productReviews: ["title"],
  productFaq: ["title"],
  relatedProducts: ["title"],
  searchBlock: ["title", "subtitle", "placeholder"],
  advancedFilters: ["title", "subtitle"],
  categoryExplorer: ["title", "subtitle"],
  relatedContent: ["title", "subtitle"],
  recentlyViewed: ["title", "subtitle", "emptyMessage"],
  stickyCta: ["title", "message", "primaryButton"],
  leadForm: ["title", "subtitle", "incentive"],
  contactFormBuilder: ["title"],
  multiStepForm: ["title"],
  newsletterSignup: ["title", "subtitle", "incentive"],
  downloadGate: ["title", "description"],
  pricingCalculator: ["title", "subtitle"],
  knowledgeBase: ["title", "subtitle"],
  documentationNav: ["title", "subtitle"],
  statusDashboard: ["title", "subtitle"],
  teamDirectory: ["title", "subtitle"],
  partnerDirectory: ["title", "subtitle"],
};

const ALL_BLOCK_FIELDS = [
  "title",
  "subtitle",
  "content",
  "ctaLabel",
  "secondaryCtaLabel",
  "badge",
  "button",
  "secondaryButton",
  "promoBadge",
  "promoText",
  "countdownLabel",
  "beforeLabel",
  "afterLabel",
  "caption",
  "html",
  "alt",
  "emptyMessage",
  "markdown",
] as const;

/** Stable 32-char id (fits EntityTranslation.entityId VarChar(36)) */
export function makeBlockEntityId(
  parentType: BlockParentType,
  parentId: string,
  blockId: string
): string {
  return createHash("sha256")
    .update(`${parentType}\0${parentId}\0${blockId}`)
    .digest("hex")
    .slice(0, 32);
}

/** @deprecated Legacy readable ids from early block translations — use indexBlockTranslationsByBlockId */
export function parseBlockEntityId(entityId: string): {
  parentType: string;
  parentId: string;
  blockId: string;
} | null {
  const parts = entityId.split(":");
  if (parts.length < 3) return null;
  const blockId = parts.pop()!;
  const parentId = parts.pop()!;
  const parentType = parts.join(":");
  return { parentType, parentId, blockId };
}

export function getBlockIdFromEntityId(entityId: string): string {
  return parseBlockEntityId(entityId)?.blockId ?? entityId;
}

export function getTranslatableFieldsForBlockType(blockType: BlockType): string[] {
  return BLOCK_TRANSLATABLE_FIELDS[blockType] ?? [];
}

function normalizePageBlocks(blocks: unknown): PageBlocks {
  return Array.isArray(blocks) ? (blocks as PageBlocks) : [];
}

export function walkBlocks(blocks: PageBlocks): BlockNode[] {
  const result: BlockNode[] = [];
  function visit(nodes: PageBlocks) {
    for (const node of nodes) {
      if (!node || typeof node !== "object") continue;
      result.push(node);
      if (Array.isArray(node.children) && node.children.length > 0) {
        visit(node.children);
      }
    }
  }
  visit(normalizePageBlocks(blocks));
  return result;
}

export function collectBlockEntityIds(
  blocks: PageBlocks,
  parentType: BlockParentType,
  parentId: string
): string[] {
  return walkBlocks(blocks).map((b) => makeBlockEntityId(parentType, parentId, b.id));
}

function readLegacyPropValue(
  props: Record<string, unknown>,
  field: string,
  localeCode: string
): string {
  const suffix = getContentFieldSuffix(localeCode);
  const val = props[`${field}${suffix}`];
  if (typeof val === "string" && val.trim()) return val;
  if (localeCode.toLowerCase() !== "en") {
    const en = props[`${field}En`];
    if (typeof en === "string") return en;
  }
  return "";
}

export function extractTranslationsFromBlock(
  block: BlockNode,
  parentType: BlockParentType,
  parentId: string,
  locales: PublicLocale[],
  overrides?: Map<string, string>
): EntityTranslationInput[] {
  const fields = getTranslatableFieldsForBlockType(block.type);
  if (fields.length === 0) return [];

  const entityId = makeBlockEntityId(parentType, parentId, block.id);
  const inputs: EntityTranslationInput[] = [];
  const props = block.props;

  for (const field of fields) {
    for (const locale of locales) {
      const overrideKey = buildTranslationOverrideKey(entityId, field, locale.code);
      const overrideVal = overrides?.get(overrideKey);
      const value =
        overrideVal !== undefined
          ? overrideVal
          : readLegacyPropValue(props, field, locale.code);

      if (!value.trim()) continue;

      inputs.push({
        entityType: BUILDER_BLOCK_ENTITY_TYPE,
        entityId,
        field,
        languageCode: locale.code.toLowerCase(),
        value,
        status: "PUBLISHED",
      });
    }
  }

  return inputs;
}

export function extractTranslationsFromBlocks(
  blocks: PageBlocks,
  parentType: BlockParentType,
  parentId: string,
  locales: PublicLocale[],
  overrides?: Map<string, string>
): EntityTranslationInput[] {
  const inputs: EntityTranslationInput[] = [];
  for (const block of walkBlocks(blocks)) {
    inputs.push(...extractTranslationsFromBlock(block, parentType, parentId, locales, overrides));
  }
  return inputs;
}

export function parseBlockTranslationsJson(raw: string | null | undefined): EntityTranslationInput[] {
  if (!raw?.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is EntityTranslationInput =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as EntityTranslationInput).entityId === "string" &&
        typeof (item as EntityTranslationInput).field === "string" &&
        typeof (item as EntityTranslationInput).languageCode === "string" &&
        typeof (item as EntityTranslationInput).value === "string"
    );
  } catch {
    return [];
  }
}

export function mergeBlockTranslationInputs(
  fromProps: EntityTranslationInput[],
  fromForm: EntityTranslationInput[]
): EntityTranslationInput[] {
  const map = new Map<string, EntityTranslationInput>();

  for (const input of fromProps) {
    const key = buildTranslationOverrideKey(input.entityId, input.field, input.languageCode);
    map.set(key, input);
  }

  for (const input of fromForm) {
    const key = buildTranslationOverrideKey(input.entityId, input.field, input.languageCode);
    if (input.value.trim()) {
      map.set(key, { ...input, entityType: BUILDER_BLOCK_ENTITY_TYPE });
    } else {
      map.delete(key);
    }
  }

  return [...map.values()];
}

export type BlockTranslationMap = Map<string, EntityTranslation[]>;

export function groupTranslationsByBlockId(rows: EntityTranslation[]): BlockTranslationMap {
  const map: BlockTranslationMap = new Map();
  for (const row of rows) {
    const blockId = getBlockIdFromEntityId(row.entityId);
    if (!map.has(blockId)) map.set(blockId, []);
    map.get(blockId)!.push(row);
  }
  return map;
}

/** Map translation rows to block ids using the same hashed entity ids used on save */
export function indexBlockTranslationsByBlockId(
  blocks: PageBlocks,
  parentType: BlockParentType,
  parentId: string,
  rows: EntityTranslation[]
): BlockTranslationMap {
  const map: BlockTranslationMap = new Map();
  const entityIdToBlockId = new Map<string, string>();
  for (const block of walkBlocks(blocks)) {
    entityIdToBlockId.set(makeBlockEntityId(parentType, parentId, block.id), block.id);
  }
  for (const row of rows) {
    const blockId = entityIdToBlockId.get(row.entityId);
    if (!blockId) continue;
    if (!map.has(blockId)) map.set(blockId, []);
    map.get(blockId)!.push(row);
  }
  return map;
}

export function getBlockFieldValue(
  translations: EntityTranslation[] | undefined,
  field: string,
  localeCode: string,
  legacyProps: Record<string, unknown>,
  locales: PublicLocale[],
  defaultCode?: string
): string {
  const dbMap: Record<string, string> = {};
  if (translations) {
    for (const row of translations) {
      if (row.field === field && row.status === "PUBLISHED" && row.value.trim()) {
        dbMap[row.languageCode.toLowerCase()] = row.value;
      }
    }
  }

  const normalized = localeCode.toLowerCase();
  const defaultLocale = defaultCode ?? locales.find((l) => l.isDefault)?.code ?? "en";

  const candidates = [normalized];
  if (normalized.includes("-")) candidates.push(normalized.split("-")[0]!);
  candidates.push(defaultLocale);

  for (const code of candidates) {
    if (dbMap[code]) return dbMap[code];
  }

  return readLegacyPropValue(legacyProps, field, localeCode);
}

const OVERRIDE_KEY_SEP = "|||";

export function buildTranslationOverrideKey(
  entityId: string,
  field: string,
  localeCode: string
): string {
  return `${entityId}${OVERRIDE_KEY_SEP}${field}${OVERRIDE_KEY_SEP}${localeCode}`;
}

export function parseTranslationOverrideKey(key: string): {
  entityId: string;
  field: string;
  languageCode: string;
} | null {
  const parts = key.split(OVERRIDE_KEY_SEP);
  if (parts.length !== 3) return null;
  return { entityId: parts[0]!, field: parts[1]!, languageCode: parts[2]! };
}

export function inputsToOverrideMap(inputs: EntityTranslationInput[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const input of inputs) {
    map.set(buildTranslationOverrideKey(input.entityId, input.field, input.languageCode), input.value);
  }
  return map;
}

export function overrideMapToInputs(map: Map<string, string>): EntityTranslationInput[] {
  const inputs: EntityTranslationInput[] = [];
  for (const [key, value] of map) {
    const parsed = parseTranslationOverrideKey(key);
    if (!parsed || !value.trim()) continue;
    inputs.push({
      entityType: BUILDER_BLOCK_ENTITY_TYPE,
      entityId: parsed.entityId,
      field: parsed.field,
      languageCode: parsed.languageCode.toLowerCase(),
      value,
      status: "PUBLISHED",
    });
  }
  return inputs;
}

export function translationsToFieldValues(
  rows: EntityTranslation[],
  field: string
): Record<string, { value: string; status?: EntityTranslation["status"] }> {
  const result: Record<string, { value: string; status?: EntityTranslation["status"] }> = {};
  for (const row of rows) {
    if (row.field === field) {
      result[row.languageCode] = { value: row.value, status: row.status };
    }
  }
  return result;
}

/** Sync legacy En/Ar props from translation inputs for backward-compatible JSON storage */
export function syncLegacyPropsFromTranslations(
  block: BlockNode,
  translations: EntityTranslation[]
): BlockNode {
  const fields = getTranslatableFieldsForBlockType(block.type);
  if (fields.length === 0) return block;

  const nextProps = { ...block.props };

  for (const field of fields) {
    for (const row of translations) {
      if (row.field !== field || !row.value.trim()) continue;
      const suffix = getContentFieldSuffix(row.languageCode);
      if (suffix === "En" || suffix === "Ar") {
        nextProps[`${field}${suffix}`] = row.value;
      }
    }
  }

  return { ...block, props: nextProps };
}

export function syncBlocksLegacyProps(
  blocks: PageBlocks,
  translationMap: BlockTranslationMap
): PageBlocks {
  function mapNode(node: BlockNode): BlockNode {
    const rows = translationMap.get(node.id) ?? [];
    let next = syncLegacyPropsFromTranslations(node, rows);
    if (next.children?.length) {
      next = { ...next, children: next.children.map(mapNode) };
    }
    return next;
  }
  return blocks.map(mapNode);
}

export { ALL_BLOCK_FIELDS };
