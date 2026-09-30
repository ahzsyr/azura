"use client";

import dynamic from "next/dynamic";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAdminEditingLocaleContextOptional } from "@/components/admin/admin-editing-locale-provider";
import { DEFAULT_ADMIN_LOCALE, getContentFieldSuffix } from "@/i18n/locale-config";
import { UrlPrimaryMediaPickerField } from "@/features/media/components/url-primary-media-picker-field";
import { IconNameSelect } from "@/features/builder/blocks/marketing/admin/icon-name-select";
import {
  emptyLocalizedItemFields,
  itemFieldPropKey,
  LocalizedItemFields,
  readItemFieldValue,
} from "@/features/builder/blocks/marketing/admin/localized-item-fields";
import {
  featureGridContentElementSchema,
  newId,
  type FeatureGridContentElement,
  type FeatureGridItem,
} from "@/features/builder/blocks/marketing/schemas/marketing-blocks";
import { plainTextToHtml } from "@/features/builder/blocks/marketing/lib/normalize-feature-grid";

const AdvancedRichTextEditor = dynamic(
  () =>
    import("@/features/builder/blocks/content/admin/advanced-rich-text-editor").then(
      (m) => m.AdvancedRichTextEditor
    ),
  { ssr: false, loading: () => <p className="text-xs text-muted-foreground">Loading editor…</p> }
);

const ELEMENT_LABELS: Record<FeatureGridContentElement, string> = {
  visual: "Icon / image",
  badge: "Badge",
  number: "Number",
  title: "Title",
  subtitle: "Subtitle",
  description: "Description",
  link: "Text link",
  button: "Button",
  footer: "Footer",
};

const ALL_ELEMENTS = featureGridContentElementSchema.options;

const CONTENT_TEXT_KEYS = ["title", "subtitle", "badge", "numberLabel", "category"] as const;
const ACTION_TEXT_KEYS = ["linkLabel", "buttonLabel", "footerText"] as const;

export function emptyFeatureGridItem(): FeatureGridItem {
  return {
    id: newId("fg"),
    icon: "compass",
    imageUrl: "",
    mediaAssetId: "",
    href: "",
    descriptionContent: "",
    descriptionHtml: "",
    subtitle: "",
    badge: "",
    numberLabel: "",
    buttonLabel: "",
    buttonHref: "",
    openInNewTab: false,
    footerText: "",
    footerHref: "",
    visualType: "auto",
    expandEnabled: "inherit",
    cardClickable: false,
    styleOverrides: {},
    contentOrder: [...ALL_ELEMENTS],
    visibleElements: {
      visual: true,
      badge: true,
      number: true,
      title: true,
      subtitle: true,
      description: true,
      link: true,
      button: true,
      footer: true,
    },
    ...emptyLocalizedItemFields([
      "title",
      "description",
      "descriptionContent",
      "descriptionHtml",
      "category",
      "linkLabel",
      "subtitle",
      "badge",
      "numberLabel",
      "buttonLabel",
      "footerText",
    ]),
  } as FeatureGridItem;
}

type Props = {
  item: FeatureGridItem;
  onUpdate: (patch: Partial<FeatureGridItem> & Record<string, unknown>) => void;
};

export function FeatureGridCardForm({ item, onUpdate }: Props) {
  const adminLocale = useAdminEditingLocaleContextOptional();
  const activeCode = adminLocale?.activeLocaleCode ?? DEFAULT_ADMIN_LOCALE.code;
  const defaultCode = adminLocale?.defaultCode ?? DEFAULT_ADMIN_LOCALE.code;
  const isDefault = activeCode === defaultCode;
  const suffix = getContentFieldSuffix(activeCode);

  const contentKey = `descriptionContent${suffix}`;
  const htmlKey = `descriptionHtml${suffix}`;
  const values = item as unknown as Record<string, string>;

  let richContent =
    (typeof values[contentKey] === "string" ? values[contentKey] : "") ||
    (isDefault && typeof item.descriptionContent === "string" ? item.descriptionContent : "") ||
    "";

  if (!richContent.trim()) {
    const plain = readItemFieldValue(values, "description", activeCode);
    if (plain.trim()) {
      richContent = plainTextToHtml(plain);
    }
  }

  const visible = (item.visibleElements ?? {}) as Record<string, boolean>;
  const order = (item.contentOrder?.length ? item.contentOrder : ALL_ELEMENTS) as FeatureGridContentElement[];
  const overrides = item.styleOverrides ?? {};

  const syncLocalized = (patch: Record<string, string>, keys: readonly string[]) => {
    const next = { ...patch } as Record<string, string>;
    if (isDefault) {
      for (const key of keys) {
        const localizedKey = itemFieldPropKey(key, activeCode);
        const value = next[localizedKey];
        if (typeof value === "string") next[key] = value;
      }
    }
    onUpdate(next);
  };

  const moveElement = (el: FeatureGridContentElement, dir: -1 | 1) => {
    const idx = order.indexOf(el);
    if (idx < 0) return;
    const nextIdx = idx + dir;
    if (nextIdx < 0 || nextIdx >= order.length) return;
    const next = [...order];
    const [removed] = next.splice(idx, 1);
    next.splice(nextIdx, 0, removed!);
    onUpdate({ contentOrder: next });
  };

  return (
    <Tabs defaultValue="content" className="w-full">
      <TabsList className="sticky top-0 z-10 grid h-auto w-full grid-cols-4 gap-1 bg-background pb-1">
        <TabsTrigger value="content" className="px-2 text-xs">
          Content
        </TabsTrigger>
        <TabsTrigger value="visual" className="px-2 text-xs">
          Visual
        </TabsTrigger>
        <TabsTrigger value="actions" className="px-2 text-xs">
          Actions
        </TabsTrigger>
        <TabsTrigger value="layout" className="px-2 text-xs">
          Layout
        </TabsTrigger>
      </TabsList>

      <TabsContent value="content" className="mt-3 space-y-3">
        <LocalizedItemFields
          fields={[
            { key: "title", label: "Title" },
            { key: "subtitle", label: "Subtitle" },
            { key: "badge", label: "Badge" },
            { key: "numberLabel", label: "Number label" },
            { key: "category", label: "Category" },
          ]}
          values={values}
          onChange={(patch) => syncLocalized(patch, CONTENT_TEXT_KEYS)}
        />

        <div>
          <Label className="text-xs">Description (rich text)</Label>
          <div className="mt-1 rounded-md border p-2">
            <AdvancedRichTextEditor
              content={richContent}
              onChange={(json, html) => {
                const patch: Record<string, string> = {
                  [contentKey]: json,
                  [htmlKey]: html,
                };
                if (isDefault) {
                  patch.descriptionContent = json;
                  patch.descriptionHtml = html;
                }
                onUpdate(patch);
              }}
            />
          </div>
        </div>
      </TabsContent>

      <TabsContent value="visual" className="mt-3 space-y-3">
        <div>
          <Label className="text-xs">Visual type</Label>
          <select
            className="mt-1 h-9 w-full rounded-md border px-2 text-sm"
            value={item.visualType ?? "auto"}
            onChange={(e) =>
              onUpdate({ visualType: e.target.value as FeatureGridItem["visualType"] })
            }
          >
            <option value="auto">Auto</option>
            <option value="icon">Icon</option>
            <option value="image">Image</option>
            <option value="none">None</option>
          </select>
        </div>
        <IconNameSelect value={item.icon} onChange={(icon) => onUpdate({ icon })} />
        <UrlPrimaryMediaPickerField
          label="Image (optional)"
          mediaTypes={["IMAGE", "SVG"]}
          url={item.imageUrl}
          onPick={({ url, mediaId }) => onUpdate({ imageUrl: url, mediaAssetId: mediaId ?? "" })}
        />
      </TabsContent>

      <TabsContent value="actions" className="mt-3 space-y-3">
        <LocalizedItemFields
          fields={[
            { key: "linkLabel", label: "Link label" },
            { key: "buttonLabel", label: "Button label" },
            { key: "footerText", label: "Footer text" },
          ]}
          values={values}
          onChange={(patch) => syncLocalized(patch, ACTION_TEXT_KEYS)}
        />

        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">Link href</Label>
            <Input
              className="mt-1 h-8 text-sm"
              value={item.href ?? ""}
              onChange={(e) => onUpdate({ href: e.target.value })}
            />
          </div>
          <div>
            <Label className="text-xs">Button href</Label>
            <Input
              className="mt-1 h-8 text-sm"
              value={item.buttonHref ?? ""}
              onChange={(e) => onUpdate({ buttonHref: e.target.value })}
            />
          </div>
          <div className="col-span-2">
            <Label className="text-xs">Footer href</Label>
            <Input
              className="mt-1 h-8 text-sm"
              value={item.footerHref ?? ""}
              onChange={(e) => onUpdate({ footerHref: e.target.value })}
            />
          </div>
        </div>

        <div className="space-y-2 rounded-md border px-3 py-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={Boolean(item.openInNewTab)}
              onChange={(e) => onUpdate({ openInNewTab: e.target.checked })}
            />
            Open links in new tab
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={Boolean(item.cardClickable)}
              onChange={(e) => onUpdate({ cardClickable: e.target.checked })}
            />
            Entire card clickable
          </label>
        </div>

        <div>
          <Label className="text-xs">Expand override</Label>
          <select
            className="mt-1 h-9 w-full rounded-md border px-2 text-sm"
            value={item.expandEnabled ?? "inherit"}
            onChange={(e) =>
              onUpdate({ expandEnabled: e.target.value as FeatureGridItem["expandEnabled"] })
            }
          >
            <option value="inherit">Inherit from block</option>
            <option value="on">Always on</option>
            <option value="off">Always off</option>
          </select>
        </div>
      </TabsContent>

      <TabsContent value="layout" className="mt-3 space-y-4">
        <div>
          <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Visible elements
          </Label>
          <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1">
            {ALL_ELEMENTS.map((el) => (
              <label key={el} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={visible[el] !== false}
                  onChange={(e) =>
                    onUpdate({
                      visibleElements: { ...visible, [el]: e.target.checked },
                    })
                  }
                />
                {ELEMENT_LABELS[el]}
              </label>
            ))}
          </div>
        </div>

        <div>
          <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Element order
          </Label>
          <ul className="mt-2 space-y-1">
            {order.map((el, idx) => (
              <li
                key={el}
                className="flex items-center justify-between rounded border px-2 py-1 text-sm"
              >
                <span>{ELEMENT_LABELS[el]}</span>
                <span className="flex gap-1">
                  <button
                    type="button"
                    className="rounded border px-1.5 text-xs disabled:opacity-40"
                    disabled={idx === 0}
                    onClick={() => moveElement(el, -1)}
                    aria-label={`Move ${ELEMENT_LABELS[el]} up`}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="rounded border px-1.5 text-xs disabled:opacity-40"
                    disabled={idx === order.length - 1}
                    onClick={() => moveElement(el, 1)}
                    aria-label={`Move ${ELEMENT_LABELS[el]} down`}
                  >
                    ↓
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Style overrides
          </Label>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {(
              [
                ["backgroundColor", "Background"],
                ["textColor", "Text"],
                ["borderColor", "Border"],
                ["accentColor", "Accent"],
                ["borderRadius", "Radius"],
                ["padding", "Padding"],
              ] as const
            ).map(([key, label]) => (
              <div key={key}>
                <Label className="text-xs">{label}</Label>
                <Input
                  className="mt-1 h-8 text-sm"
                  placeholder="CSS value"
                  value={(overrides[key] as string) ?? ""}
                  onChange={(e) =>
                    onUpdate({
                      styleOverrides: { ...overrides, [key]: e.target.value },
                    })
                  }
                />
              </div>
            ))}
          </div>
        </div>
      </TabsContent>
    </Tabs>
  );
}
