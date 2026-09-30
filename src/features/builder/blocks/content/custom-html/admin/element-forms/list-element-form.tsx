"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAdminEditingLocaleContextOptional } from "@/components/admin/admin-editing-locale-provider";
import { DEFAULT_ADMIN_LOCALE } from "@/i18n/locale-config";
import { newId } from "@/features/builder/blocks/content/schemas/content-blocks";
import type { HtmlElement } from "../../types";
import { LocalizedHtmlInput } from "../localized-html-input";
import { patchLocalizedField, readLocalizedField } from "../../lib/localized-fields";

type Props = {
  element: HtmlElement;
  onChange: (patch: Partial<HtmlElement>) => void;
};

function patchChildText(
  child: HtmlElement | undefined,
  tag: "strong" | "p",
  value: string,
  localeCode: string,
  defaultCode: string
): HtmlElement {
  const base: HtmlElement = child ?? { id: newId(tag), tag };
  return {
    ...base,
    tag,
    ...patchLocalizedField("text", value, localeCode, defaultCode),
  };
}

export function ListElementForm({ element, onChange }: Props) {
  const adminLocale = useAdminEditingLocaleContextOptional();
  const activeCode = adminLocale?.activeLocaleCode ?? DEFAULT_ADMIN_LOCALE.code;
  const defaultCode = adminLocale?.defaultCode ?? DEFAULT_ADMIN_LOCALE.code;
  const items = (element.children ?? []) as HtmlElement[];
  const isHeaderList = element.attributes?.listVariant === "withHeader";

  const makePlainListItem = (text = ""): HtmlElement => ({
    id: newId("li"),
    tag: "li" as const,
    ...patchLocalizedField("text", text, defaultCode, defaultCode),
  });

  const makeHeaderListItem = (title = "", body = ""): HtmlElement => ({
    id: newId("li"),
    tag: "li" as const,
    ...patchLocalizedField("title", title, defaultCode, defaultCode),
    ...patchLocalizedField("text", body, defaultCode, defaultCode),
    children: [
      patchChildText(undefined, "strong", title, defaultCode, defaultCode),
      patchChildText(undefined, "p", body, defaultCode, defaultCode),
    ],
  });

  const syncHeaderListItemChildren = (
    li: HtmlElement,
    title: string,
    body: string
  ): HtmlElement => ({
    ...li,
    children: [
      patchChildText(li.children?.[0], "strong", title, activeCode, defaultCode),
      patchChildText(li.children?.[1], "p", body, activeCode, defaultCode),
    ],
  });

  const setItems = (next: HtmlElement[]) => onChange({ children: next });

  const addItem = () =>
    setItems([
      ...items,
      isHeaderList ? makeHeaderListItem() : makePlainListItem(),
    ]);

  const removeItem = (id: string) =>
    setItems(items.filter((li) => li.id !== id));

  const updatePlainItem = (id: string, patch: Record<string, string>) =>
    setItems(items.map((li) => (li.id === id ? { ...li, ...patch } : li)));

  const updateHeaderItemTitle = (id: string, patch: Record<string, string>) =>
    setItems(
      items.map((li) => {
        if (li.id !== id) return li;
        const next = { ...li, ...patch };
        const title = readLocalizedField(next as Record<string, unknown>, "title", activeCode);
        const body = readLocalizedField(next as Record<string, unknown>, "text", activeCode);
        return syncHeaderListItemChildren(next, title, body);
      })
    );

  const updateHeaderItemBody = (id: string, patch: Record<string, string>) =>
    setItems(
      items.map((li) => {
        if (li.id !== id) return li;
        const next = { ...li, ...patch };
        const title = readLocalizedField(next as Record<string, unknown>, "title", activeCode);
        const body = readLocalizedField(next as Record<string, unknown>, "text", activeCode);
        return syncHeaderListItemChildren(next, title, body);
      })
    );

  const toggleListVariant = (variant: "plain" | "withHeader") => {
    if (variant === "withHeader") {
      const upgraded = items.map((li) => {
        const defaultTitle = readLocalizedField(li as Record<string, unknown>, "title", defaultCode);
        const defaultBody = readLocalizedField(li as Record<string, unknown>, "text", defaultCode);
        const activeTitle = readLocalizedField(li as Record<string, unknown>, "title", activeCode);
        const activeBody = readLocalizedField(li as Record<string, unknown>, "text", activeCode);
        const next: HtmlElement = {
          ...li,
          ...patchLocalizedField("title", defaultTitle, defaultCode, defaultCode),
          ...patchLocalizedField("text", defaultBody, defaultCode, defaultCode),
          ...(activeCode !== defaultCode
            ? {
                ...patchLocalizedField("title", activeTitle, activeCode, defaultCode),
                ...patchLocalizedField("text", activeBody, activeCode, defaultCode),
              }
            : {}),
          children: [
            patchChildText(li.children?.[0], "strong", defaultTitle, defaultCode, defaultCode),
            patchChildText(li.children?.[1], "p", defaultBody, defaultCode, defaultCode),
          ],
        };
        if (activeCode === defaultCode) return next;
        return syncHeaderListItemChildren(next, activeTitle, activeBody);
      });
      onChange({
        attributes: { ...(element.attributes ?? {}), listVariant: "withHeader" },
        children: upgraded,
      });
      return;
    }

    const downgraded = items.map((li) => {
      const defaultBody = readLocalizedField(li as Record<string, unknown>, "text", defaultCode);
      const activeBody = readLocalizedField(li as Record<string, unknown>, "text", activeCode);
      return {
        ...li,
        ...patchLocalizedField("text", defaultBody, defaultCode, defaultCode),
        ...(activeCode !== defaultCode
          ? patchLocalizedField("text", activeBody, activeCode, defaultCode)
          : {}),
        children: undefined,
      };
    });
    onChange({
      attributes: { ...(element.attributes ?? {}), listVariant: "plain" },
      children: downgraded,
    });
  };

  return (
    <div className="space-y-2 p-3">
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {element.tag === "ul" ? "Unordered" : "Ordered"} List Items
      </p>
      <div>
        <Label className="text-xs">List type</Label>
        <select
          className="mt-1 h-8 w-full rounded-md border bg-background px-2 text-xs"
          value={isHeaderList ? "withHeader" : "plain"}
          onChange={(e) => toggleListVariant(e.target.value as "plain" | "withHeader")}
        >
          <option value="plain">Standard list</option>
          <option value="withHeader">List with Header</option>
        </select>
      </div>

      {items.length === 0 && (
        <p className="text-xs text-muted-foreground">No items yet.</p>
      )}

      {items.map((li, idx) => {
        if (isHeaderList) {
          return (
            <div key={li.id} className="rounded-md border p-2 space-y-2">
              <div className="flex items-start gap-1">
                <span className="text-xs text-muted-foreground w-5 shrink-0 pt-6">{idx + 1}.</span>
                <div className="flex-1 space-y-2 min-w-0">
                  <LocalizedHtmlInput
                    label="Headline"
                    baseKey="title"
                    values={li as Record<string, unknown>}
                    onChange={(patch) => updateHeaderItemTitle(li.id, patch)}
                    placeholder="Headline"
                  />
                  <LocalizedHtmlInput
                    label="Body"
                    baseKey="text"
                    values={li as Record<string, unknown>}
                    onChange={(patch) => updateHeaderItemBody(li.id, patch)}
                    placeholder="Body text…"
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-destructive mt-5"
                  onClick={() => removeItem(li.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          );
        }

        return (
          <div key={li.id} className="flex items-start gap-1">
            <span className="text-xs text-muted-foreground w-5 shrink-0 pt-6">{idx + 1}.</span>
            <div className="flex-1 min-w-0">
              <LocalizedHtmlInput
                label="List item"
                baseKey="text"
                values={li as Record<string, unknown>}
                onChange={(patch) => updatePlainItem(li.id, patch)}
                placeholder="List item…"
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-destructive mt-5"
              onClick={() => removeItem(li.id)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        );
      })}

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full text-xs gap-1.5 mt-1"
        onClick={addItem}
      >
        <Plus className="h-3 w-3" />
        Add item
      </Button>
    </div>
  );
}
