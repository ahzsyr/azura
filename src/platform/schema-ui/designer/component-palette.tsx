"use client";

import { useMemo, useState } from "react";
import { schemaRegistry } from "../registry/schema-registry";
import { Input } from "@/components/ui/input";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import {
  Type,
  Mail,
  Phone,
  Hash,
  Calendar,
  AlignLeft,
  List,
  CircleDot,
  CheckSquare,
  Paperclip,
  EyeOff,
  Star,
  Gauge,
  LayoutGrid,
  Rows3,
  Heading,
  Minus,
  Square,
  Image,
  Component,
  ChevronDown,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const INPUT_TYPES = new Set(["textField", "emailField", "phoneField", "numberField", "dateField", "textareaField"]);
const CHOICE_TYPES = new Set(["selectField", "radioField", "checkboxField"]);
const ADVANCED_TYPES = new Set(["fileField", "hiddenField", "ratingField", "npsField"]);

const ICONS: Record<string, LucideIcon> = {
  textField: Type,
  emailField: Mail,
  phoneField: Phone,
  numberField: Hash,
  dateField: Calendar,
  textareaField: AlignLeft,
  selectField: List,
  radioField: CircleDot,
  checkboxField: CheckSquare,
  fileField: Paperclip,
  hiddenField: EyeOff,
  ratingField: Star,
  npsField: Gauge,
  section: Rows3,
  grid: LayoutGrid,
  heading: Heading,
  divider: Minus,
  card: Square,
  hero: Image,
};

function PaletteItem({
  id,
  name,
  kind,
  onAdd,
}: {
  id: string;
  name: string;
  kind: "binding" | "layout";
  onAdd: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `palette:${kind}:${id}`,
    data: { source: "palette", kind, componentType: id },
  });
  const Icon = ICONS[id] ?? Component;
  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <button
      ref={setNodeRef}
      type="button"
      style={style}
      className="flex w-full items-center gap-2.5 rounded-xl border bg-background px-2.5 py-2 text-left text-sm shadow-sm transition-colors hover:bg-muted/60 cursor-grab active:cursor-grabbing"
      onClick={onAdd}
      {...listeners}
      {...attributes}
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border bg-muted/40 text-muted-foreground">
        <Icon className="h-4 w-4" />
      </span>
      <span className="truncate font-medium">{name}</span>
    </button>
  );
}

function CollapsibleGroup({
  title,
  items,
  kind,
  onAdd,
  defaultOpen = true,
}: {
  title: string;
  items: Array<{ id: string; name: string }>;
  kind: "binding" | "layout";
  onAdd: (id: string) => void;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  if (!items.length) return null;
  return (
    <div className="space-y-1.5">
      <button
        type="button"
        className="flex w-full items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
        onClick={() => setOpen((v) => !v)}
      >
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "" : "-rotate-90"}`} />
        {title}
      </button>
      {open ? (
        <div className="space-y-1.5">
          {items.map((c) => (
            <PaletteItem key={c.id} id={c.id} name={c.name} kind={kind} onAdd={() => onAdd(c.id)} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function ComponentPalette({
  onAddBinding,
  onAddLayout,
}: {
  onAddBinding: (componentType: string) => void;
  onAddLayout: (componentType: string) => void;
}) {
  const [query, setQuery] = useState("");
  const components = useMemo(() => schemaRegistry.listComponents(), []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return components;
    return components.filter(
      (c) => c.id.toLowerCase().includes(q) || c.name.toLowerCase().includes(q),
    );
  }, [components, query]);

  const fields = filtered.filter((c) => c.category === "binding");
  const layout = filtered.filter((c) => c.category === "layout");
  const content = filtered.filter((c) => c.category === "content");

  const inputs = fields.filter((c) => INPUT_TYPES.has(c.id));
  const choices = fields.filter((c) => CHOICE_TYPES.has(c.id));
  const advanced = fields.filter(
    (c) => ADVANCED_TYPES.has(c.id) || (!INPUT_TYPES.has(c.id) && !CHOICE_TYPES.has(c.id)),
  );

  return (
    <div className="space-y-3">
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search components…"
        className="h-9 text-sm"
      />
      <div className="space-y-4">
        <CollapsibleGroup title="Inputs" items={inputs} kind="binding" onAdd={onAddBinding} />
        <CollapsibleGroup title="Choices" items={choices} kind="binding" onAdd={onAddBinding} />
        <CollapsibleGroup title="Layout" items={layout} kind="layout" onAdd={onAddLayout} />
        <CollapsibleGroup title="Advanced" items={advanced} kind="binding" onAdd={onAddBinding} defaultOpen={false} />
        <CollapsibleGroup title="Content" items={content} kind="layout" onAdd={onAddLayout} defaultOpen={false} />
      </div>
      {filtered.length === 0 ? (
        <p className="text-xs text-muted-foreground px-1">No components match “{query}”.</p>
      ) : null}
    </div>
  );
}
