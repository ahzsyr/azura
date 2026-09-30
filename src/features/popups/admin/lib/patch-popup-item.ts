import type {
  PopupCta,
  PopupContentBlock,
  PopupItem,
} from "@/features/popups/popup.schema";

const NESTED_KEYS = [
  "customOffset",
  "devices",
  "pageTargeting",
  "design",
  "content",
  "trigger",
  "schedule",
  "frequency",
] as const;

type NestedKey = (typeof NESTED_KEYS)[number];

export type PopupContentPatch = {
  title?: string;
  subtitle?: string;
  body?: string;
  bodyHtml?: string;
  imageUrl?: string;
  imageAlt?: string;
  videoUrl?: string;
  primaryCta?: Partial<PopupCta>;
  secondaryCta?: Partial<PopupCta>;
  /** Only set when intentionally replacing blocks; omit to preserve. */
  blocks?: PopupContentBlock[];
};

export type PopupItemPatch = {
  [K in Exclude<keyof PopupItem, NestedKey>]?: PopupItem[K];
} & {
  customOffset?: Partial<PopupItem["customOffset"]>;
  devices?: Partial<PopupItem["devices"]>;
  pageTargeting?: Partial<PopupItem["pageTargeting"]>;
  design?: Partial<PopupItem["design"]>;
  trigger?: Partial<PopupItem["trigger"]>;
  schedule?: Partial<PopupItem["schedule"]>;
  frequency?: Partial<PopupItem["frequency"]>;
  content?: PopupContentPatch;
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

/**
 * Patch-merge a PopupItem without reconstructing from visible fields only.
 * Nested objects are shallow-merged; `content.blocks` is preserved unless
 * the patch explicitly includes `blocks`.
 */
export function patchPopupItem(item: PopupItem, patch: PopupItemPatch): PopupItem {
  const next: PopupItem = { ...item };

  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) continue;

    if (key === "content" && isPlainObject(value)) {
      const contentPatch = value as PopupContentPatch;
      const { primaryCta, secondaryCta, blocks, ...rest } = contentPatch;
      next.content = {
        ...item.content,
        ...rest,
        primaryCta: primaryCta
          ? { ...item.content.primaryCta, ...primaryCta }
          : item.content.primaryCta,
        secondaryCta: secondaryCta
          ? { ...item.content.secondaryCta, ...secondaryCta }
          : item.content.secondaryCta,
        blocks: blocks !== undefined ? blocks : item.content.blocks,
      };
      continue;
    }

    if ((NESTED_KEYS as readonly string[]).includes(key) && isPlainObject(value)) {
      const nestedKey = key as NestedKey;
      Object.assign(next, {
        [nestedKey]: {
          ...(item[nestedKey] as object),
          ...(value as object),
        },
      });
      continue;
    }

    Object.assign(next, { [key]: value });
  }

  return next;
}

export function touchUpdatedAt(item: PopupItem): PopupItem {
  return { ...item, updatedAt: new Date().toISOString() };
}

export function patchPopupItemWithTimestamp(
  item: PopupItem,
  patch: PopupItemPatch,
): PopupItem {
  return touchUpdatedAt(patchPopupItem(item, patch));
}
