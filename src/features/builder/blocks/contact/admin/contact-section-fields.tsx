"use client";

import type { BlockNode } from "@/types/builder";
import { ArrowDown, ArrowUp, Columns2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  LocalizedBlockTitle,
  LocalizedBlockInput,
} from "@/features/builder/block-translation-context";
import { patchBlockSettings } from "@/features/builder/instance/block-instance";
import {
  ContactThemeFields,
  SelectField,
} from "@/features/builder/blocks/contact/admin/shared-contact-fields";
import type { ContactTheme } from "@/features/builder/blocks/contact/schemas/common";

type Props = { block: BlockNode; onChange: (block: BlockNode) => void };

function setProp(block: BlockNode, onChange: (b: BlockNode) => void, key: string, value: unknown) {
  onChange(patchBlockSettings(block, { [key]: value }));
}

/**
 * Composition admin: assign child blocks to left/right columns.
 * Children themselves are edited when selected in the page tree.
 */
export function ContactSectionBlockFields({ block, onChange }: Props) {
  const children = block.children ?? [];
  const leftSlotIds = (block.props.leftSlotIds as string[]) ?? [];
  const rightSlotIds = (block.props.rightSlotIds as string[]) ?? [];
  const theme = ((block.props.theme as ContactTheme) ?? {}) as ContactTheme;

  const leftChildren = leftSlotIds
    .map((id) => children.find((c) => c.id === id))
    .filter((c): c is BlockNode => Boolean(c));
  const rightChildren = rightSlotIds
    .map((id) => children.find((c) => c.id === id))
    .filter((c): c is BlockNode => Boolean(c));
  const unassigned = children.filter(
    (c) => !leftSlotIds.includes(c.id) && !rightSlotIds.includes(c.id),
  );

  const moveTo = (id: string, column: "left" | "right") => {
    const nextLeft = leftSlotIds.filter((x) => x !== id);
    const nextRight = rightSlotIds.filter((x) => x !== id);
    if (column === "left") nextLeft.push(id);
    else nextRight.push(id);
    onChange(
      patchBlockSettings(block, {
        leftSlotIds: nextLeft,
        rightSlotIds: nextRight,
      }),
    );
  };

  const reorder = (column: "left" | "right", id: string, dir: -1 | 1) => {
    const list = column === "left" ? [...leftSlotIds] : [...rightSlotIds];
    const idx = list.indexOf(id);
    const target = idx + dir;
    if (idx < 0 || target < 0 || target >= list.length) return;
    [list[idx], list[target]] = [list[target], list[idx]];
    setProp(block, onChange, column === "left" ? "leftSlotIds" : "rightSlotIds", list);
  };

  const labelFor = (child: BlockNode) =>
    ((child.props.title as string) || child.type).trim() || child.type;

  return (
    <Tabs defaultValue="general" className="w-full">
      <TabsList className="grid w-full grid-cols-3 h-auto">
        <TabsTrigger value="general" className="text-xs">
          General
        </TabsTrigger>
        <TabsTrigger value="slots" className="text-xs">
          Layout
        </TabsTrigger>
        <TabsTrigger value="theme" className="text-xs">
          Theme
        </TabsTrigger>
      </TabsList>

      <TabsContent value="general" className="space-y-3 mt-3">
        <LocalizedBlockTitle block={block} />
        <LocalizedBlockInput block={block} field="subtitle" label="Subtitle" />
        <SelectField
          label="Desktop layout"
          value={(block.props.desktopLayout as string) ?? "60/40"}
          onChange={(v) => setProp(block, onChange, "desktopLayout", v)}
          options={[
            { value: "stacked", label: "Stacked" },
            { value: "50/50", label: "50 / 50" },
            { value: "40/60", label: "40 / 60" },
            { value: "60/40", label: "60 / 40" },
            { value: "30/70", label: "30 / 70" },
            { value: "70/30", label: "70 / 30" },
          ]}
        />
        <SelectField
          label="Tablet layout"
          value={(block.props.tabletLayout as string) ?? "sideBySide"}
          onChange={(v) => setProp(block, onChange, "tabletLayout", v)}
          options={[
            { value: "stacked", label: "Stacked" },
            { value: "sideBySide", label: "Side by side" },
          ]}
        />
        <p className="text-xs text-muted-foreground">
          Add child blocks (form, location, phone, social, map) in the page tree, then assign
          them to columns below.
        </p>
      </TabsContent>

      <TabsContent value="slots" className="space-y-4 mt-3">
        {unassigned.length > 0 ? (
          <div className="space-y-2">
            <Label className="text-xs">Unassigned children</Label>
            {unassigned.map((child) => (
              <div
                key={child.id}
                className="flex items-center gap-2 rounded-md border px-2 py-1.5 text-sm"
              >
                <span className="min-w-0 flex-1 truncate">{labelFor(child)}</span>
                <Button type="button" size="sm" variant="outline" onClick={() => moveTo(child.id, "left")}>
                  Left
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => moveTo(child.id, "right")}>
                  Right
                </Button>
              </div>
            ))}
          </div>
        ) : null}

        <SlotColumn
          title="Left column"
          items={leftChildren}
          labelFor={labelFor}
          onMoveRight={(id) => moveTo(id, "right")}
          onUp={(id) => reorder("left", id, -1)}
          onDown={(id) => reorder("left", id, 1)}
        />
        <SlotColumn
          title="Right column"
          items={rightChildren}
          labelFor={labelFor}
          onMoveLeft={(id) => moveTo(id, "left")}
          onUp={(id) => reorder("right", id, -1)}
          onDown={(id) => reorder("right", id, 1)}
        />

        {children.length === 0 ? (
          <div className="flex items-center gap-2 rounded-md border border-dashed p-4 text-xs text-muted-foreground">
            <Columns2 className="h-4 w-4" />
            No child blocks yet. Nest contact blocks under this section in the builder tree.
          </div>
        ) : null}
      </TabsContent>

      <TabsContent value="theme" className="space-y-3 mt-3">
        <ContactThemeFields
          theme={theme}
          onChange={(next) => setProp(block, onChange, "theme", next)}
        />
      </TabsContent>
    </Tabs>
  );
}

function SlotColumn({
  title,
  items,
  labelFor,
  onMoveLeft,
  onMoveRight,
  onUp,
  onDown,
}: {
  title: string;
  items: BlockNode[];
  labelFor: (b: BlockNode) => string;
  onMoveLeft?: (id: string) => void;
  onMoveRight?: (id: string) => void;
  onUp: (id: string) => void;
  onDown: (id: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-xs">{title}</Label>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">Empty</p>
      ) : (
        items.map((child, index) => (
          <div
            key={child.id}
            className="flex items-center gap-1 rounded-md border px-2 py-1.5 text-sm"
          >
            <span className="min-w-0 flex-1 truncate">{labelFor(child)}</span>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              disabled={index === 0}
              onClick={() => onUp(child.id)}
            >
              <ArrowUp className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              disabled={index === items.length - 1}
              onClick={() => onDown(child.id)}
            >
              <ArrowDown className="h-3.5 w-3.5" />
            </Button>
            {onMoveLeft ? (
              <Button type="button" size="sm" variant="ghost" onClick={() => onMoveLeft(child.id)}>
                ←
              </Button>
            ) : null}
            {onMoveRight ? (
              <Button type="button" size="sm" variant="ghost" onClick={() => onMoveRight(child.id)}>
                →
              </Button>
            ) : null}
          </div>
        ))
      )}
    </div>
  );
}
