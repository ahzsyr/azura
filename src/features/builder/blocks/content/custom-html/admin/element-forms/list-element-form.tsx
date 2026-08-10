"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAdminEditingLocaleContextOptional } from "@/components/admin/admin-editing-locale-provider";
import { DEFAULT_ADMIN_LOCALE, getContentFieldSuffix } from "@/i18n/locale-config";
import { newId } from "@/features/builder/blocks/content/schemas/content-blocks";
import type { HtmlElement } from "../../types";

type Props = {
  element: HtmlElement;
  onChange: (patch: Partial<HtmlElement>) => void;
};

export function ListElementForm({ element, onChange }: Props) {
  const adminLocale = useAdminEditingLocaleContextOptional();
  const activeCode = adminLocale?.activeLocaleCode ?? DEFAULT_ADMIN_LOCALE.code;
  const defaultCode = adminLocale?.defaultCode ?? DEFAULT_ADMIN_LOCALE.code;
  const isDefault = activeCode === defaultCode;
  const suffix = getContentFieldSuffix(activeCode);
  const textKey = `text${suffix}`;
  const titleKey = `title${suffix}`;

  const items = (element.children ?? []) as HtmlElement[];
  const isHeaderList = element.attributes?.listVariant === "withHeader";

  const makePlainListItem = (text = ""): HtmlElement => ({
    id: newId("li"),
    tag: "li" as const,
    text,
  });

  const makeHeaderListItem = (title = "", body = ""): HtmlElement => ({
    id: newId("li"),
    tag: "li" as const,
    title,
    text: body,
    children: [
      { id: newId("strong"), tag: "strong" as const, text: title },
      { id: newId("p"), tag: "p" as const, text: body },
    ],
  });

  const syncHeaderListItemChildren = (
    li: HtmlElement,
    title: string,
    body: string
  ): HtmlElement => ({
    ...li,
    children: [
      { id: li.children?.[0]?.id ?? newId("strong"), tag: "strong", text: title },
      { id: li.children?.[1]?.id ?? newId("p"), tag: "p", text: body },
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

  const updatePlainItem = (id: string, value: string) =>
    setItems(
      items.map((li) =>
        li.id === id
          ? isDefault
            ? { ...li, text: value, [textKey]: value }
            : { ...li, [textKey]: value }
          : li
      )
    );

  const updateHeaderItemTitle = (id: string, value: string) =>
    setItems(
      items.map((li) => {
        if (li.id !== id) return li;
        const body = ((li[textKey] as string | undefined) ?? li.text ?? "") as string;
        const base = isDefault ? { ...li, title: value, [titleKey]: value } : { ...li, [titleKey]: value };
        return syncHeaderListItemChildren(base, value, body);
      })
    );

  const updateHeaderItemBody = (id: string, value: string) =>
    setItems(
      items.map((li) => {
        if (li.id !== id) return li;
        const title = ((li[titleKey] as string | undefined) ?? (li["title"] as string | undefined) ?? "") as string;
        const base = isDefault ? { ...li, text: value, [textKey]: value } : { ...li, [textKey]: value };
        return syncHeaderListItemChildren(base, title, value);
      })
    );

  const toggleListVariant = (variant: "plain" | "withHeader") => {
    if (variant === "withHeader") {
      const upgraded = items.map((li) => {
        const body = ((li[textKey] as string | undefined) ?? li.text ?? "") as string;
        const title = ((li[titleKey] as string | undefined) ?? (li["title"] as string | undefined) ?? "") as string;
        const next = {
          ...li,
          title,
          text: body,
          [titleKey]: title,
          [textKey]: body,
        };
        return syncHeaderListItemChildren(next, title, body);
      });
      onChange({
        attributes: { ...(element.attributes ?? {}), listVariant: "withHeader" },
        children: upgraded,
      });
      return;
    }

    const downgraded = items.map((li) => {
      const body = ((li[textKey] as string | undefined) ?? li.text ?? "") as string;
      return {
        ...li,
        text: body,
        [textKey]: body,
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
        const body = (li[textKey] as string | undefined) ?? (isDefault ? (li.text ?? "") : "");
        const bodyFallback = li.text ?? "";
        const title = (li[titleKey] as string | undefined) ?? (isDefault ? ((li["title"] as string | undefined) ?? "") : "");
        const titleFallback = ((li["title"] as string | undefined) ?? "");

        if (isHeaderList) {
          return (
            <div key={li.id} className="rounded-md border p-2 space-y-2">
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground w-5 shrink-0">{idx + 1}.</span>
                <Input
                  className="h-8 text-xs font-medium"
                  value={title}
                  placeholder={
                    !isDefault && !title && titleFallback
                      ? titleFallback.slice(0, 40)
                      : "Headline"
                  }
                  onChange={(e) => updateHeaderItemTitle(li.id, e.target.value)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-destructive"
                  onClick={() => removeItem(li.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
              <Input
                className="h-8 text-xs"
                value={body}
                placeholder={
                  !isDefault && !body && bodyFallback
                    ? bodyFallback.slice(0, 40)
                    : "Body text…"
                }
                onChange={(e) => updateHeaderItemBody(li.id, e.target.value)}
              />
            </div>
          );
        }

        return (
          <div key={li.id} className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground w-5 shrink-0">{idx + 1}.</span>
            <Input
              className="h-8 text-xs flex-1"
              value={body}
              placeholder={
                !isDefault && !body && bodyFallback
                  ? bodyFallback.slice(0, 40)
                  : "List item…"
              }
              onChange={(e) => updatePlainItem(li.id, e.target.value)}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-destructive"
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
