"use client";

import { useState } from "react";
import type { SchemaDocument } from "../schema/schema-document";
import type { ValueBinding } from "../schema/value-binding";
import type { PropertyFieldDefinition, PropertyGroupDefinition } from "../manifests/types";
import { propertyRegistry } from "../registry/property-registry";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Selection } from "./document-commands";
import { findNode } from "./designer-utils";
import { ChevronDown } from "lucide-react";
import { IconNameSelect } from "@/features/builder/blocks/marketing/admin/icon-name-select";

type OptionItem = { value: string; label: string };

const INSPECTOR_SECTIONS = [
  { id: "general", label: "General", groupIds: ["general", "content"] },
  { id: "appearance", label: "Appearance", groupIds: ["layout", "appearance"] },
  { id: "validation", label: "Validation", groupIds: ["validation"] },
  { id: "logic", label: "Logic", groupIds: ["behavior"] },
  { id: "data", label: "Data", groupIds: ["data"] },
  { id: "advanced", label: "Advanced", groupIds: ["advanced"] },
] as const;

function OptionsEditor({
  value,
  onChange,
}: {
  value: OptionItem[];
  onChange: (next: OptionItem[]) => void;
}) {
  const options = value ?? [];
  return (
    <div className="space-y-2">
      {options.map((opt, index) => (
        <div key={`${opt.value}-${index}`} className="flex gap-1">
          <Input
            className="text-xs"
            placeholder="Label"
            value={opt.label}
            onChange={(e) => {
              const next = [...options];
              const label = e.target.value;
              next[index] = {
                label,
                value: opt.value || label.toLowerCase().replace(/\s+/g, "-"),
              };
              onChange(next);
            }}
          />
          <button
            type="button"
            className="text-xs border rounded-lg px-2"
            onClick={() => onChange(options.filter((_, i) => i !== index))}
          >
            ×
          </button>
        </div>
      ))}
      <button
        type="button"
        className="text-xs border rounded-lg px-2 py-1"
        onClick={() =>
          onChange([...options, { value: `option-${options.length + 1}`, label: `Option ${options.length + 1}` }])
        }
      >
        + Add option
      </button>
    </div>
  );
}

function FieldControl({
  field,
  value,
  onChange,
}: {
  field: PropertyFieldDefinition;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  if (field.type === "boolean") {
    return (
      <label className="flex items-center gap-2 text-sm mt-1">
        <input type="checkbox" checked={value === true} onChange={(e) => onChange(e.target.checked)} />
        {field.label}
      </label>
    );
  }
  if (field.type === "options") {
    return <OptionsEditor value={(value as OptionItem[]) ?? []} onChange={onChange} />;
  }
  if (field.type === "textarea") {
    return (
      <Textarea
        className="mt-1"
        rows={3}
        value={String(value ?? "")}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }
  if (field.type === "icon") {
    return (
      <div className="mt-1">
        <IconNameSelect
          label=""
          value={String(value ?? "")}
          onChange={(v) => onChange(v)}
        />
      </div>
    );
  }
  if (field.type === "select") {
    return (
      <select
        className="mt-1 w-full rounded-md border h-9 px-2 text-sm"
        value={String(value ?? "")}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Select…</option>
        {(field.options ?? []).map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    );
  }
  return (
    <Input
      className="mt-1"
      type={field.type === "number" ? "number" : "text"}
      value={String(value ?? "")}
      onChange={(e) =>
        onChange(field.type === "number" ? (e.target.value === "" ? "" : Number(e.target.value)) : e.target.value)
      }
    />
  );
}

function PropertyGroups({
  groups,
  getValue,
  setValue,
}: {
  groups: PropertyGroupDefinition[];
  getValue: (field: PropertyFieldDefinition) => unknown;
  setValue: (field: PropertyFieldDefinition, value: unknown) => void;
}) {
  return (
    <div className="space-y-3 px-1 pb-3">
      {groups.map((group) => (
        <div key={group.id} className="space-y-2">
          {groups.length > 1 ? <h4 className="text-xs font-medium text-muted-foreground">{group.label}</h4> : null}
          {group.fields.map((field) => (
            <div key={field.key}>
              {field.type !== "boolean" ? <Label className="text-xs">{field.label}</Label> : null}
              <FieldControl field={field} value={getValue(field)} onChange={(v) => setValue(field, v)} />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function AccordionSection({
  title,
  open,
  onToggle,
  children,
  empty,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  empty?: boolean;
}) {
  if (empty) return null;
  return (
    <div className="border-b last:border-b-0">
      <button
        type="button"
        className="sticky top-0 z-10 flex w-full items-center justify-between bg-background/95 py-2.5 text-sm font-medium backdrop-blur"
        onClick={onToggle}
      >
        {title}
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "" : "-rotate-90"}`} />
      </button>
      {open ? children : null}
    </div>
  );
}

function AccordionPropertyGroups({
  groups,
  getValue,
  setValue,
  bindingId,
}: {
  groups: PropertyGroupDefinition[];
  getValue: (field: PropertyFieldDefinition) => unknown;
  setValue: (field: PropertyFieldDefinition, value: unknown) => void;
  bindingId?: string;
}) {
  const [openIds, setOpenIds] = useState<Set<string>>(
    () => new Set(["general", "validation"]),
  );

  const leftover = groups.filter(
    (g) => !INSPECTOR_SECTIONS.some((s) => (s.groupIds as readonly string[]).includes(g.id)),
  );

  const sections = INSPECTOR_SECTIONS.map((s) => ({
    ...s,
    groups:
      s.id === "advanced"
        ? [...groups.filter((g) => (s.groupIds as readonly string[]).includes(g.id)), ...leftover]
        : groups.filter((g) => (s.groupIds as readonly string[]).includes(g.id)),
  }));

  const toggle = (id: string) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-1">
      {bindingId ? (
        <div className="mb-3">
          <Label className="text-xs">Field ID</Label>
          <Input className="mt-1 font-mono text-xs" value={bindingId} readOnly />
        </div>
      ) : null}
      {sections.map((s) => (
        <AccordionSection
          key={s.id}
          title={s.label}
          open={openIds.has(s.id)}
          onToggle={() => toggle(s.id)}
          empty={s.groups.length === 0}
        >
          <PropertyGroups groups={s.groups} getValue={getValue} setValue={setValue} />
        </AccordionSection>
      ))}
    </div>
  );
}

export function NodeInspector({
  document,
  selection,
  onUpdateBinding,
  onUpdateNodeProps,
}: {
  document: SchemaDocument;
  selection: Selection;
  onUpdateBinding: (binding: ValueBinding) => void;
  onUpdateNodeProps: (nodeId: string, props: Record<string, unknown>) => void;
}) {
  if (!selection) {
    return (
      <div className="flex h-40 flex-col items-center justify-center gap-2 px-2 text-center">
        <p className="text-sm font-medium">Select a field or block</p>
        <p className="text-xs text-muted-foreground">Properties appear here when something is selected on the canvas.</p>
      </div>
    );
  }

  if (selection.type === "binding") {
    const binding = document.bindings.find((b) => b.bindingId === selection.id) ?? null;
    if (!binding) return <p className="text-sm text-muted-foreground">Binding not found.</p>;
    const manifest = propertyRegistry.get(binding.componentType, binding.version);
    const groups = manifest
      ? propertyRegistry.getPropertyGroups(binding.componentType, binding.version)
      : [];
    if (!manifest) {
      return <p className="text-sm text-muted-foreground">Unknown component: {binding.componentType}</p>;
    }
    return (
      <div className="space-y-2">
        <div>
          <p className="text-sm font-semibold">{manifest.name}</p>
          <p className="text-xs text-muted-foreground">v{binding.version}</p>
        </div>
        <AccordionPropertyGroups
          groups={groups}
          bindingId={binding.bindingId}
          getValue={(field) => binding[field.namespace][field.key]}
          setValue={(field, value) =>
            onUpdateBinding({
              ...binding,
              [field.namespace]: { ...binding[field.namespace], [field.key]: value },
            })
          }
        />
      </div>
    );
  }

  const node = findNode(document.nodes, selection.id);
  if (!node || node.kind === "binding") {
    return <p className="text-sm text-muted-foreground">Node not found.</p>;
  }
  const manifest = propertyRegistry.get(node.type);
  const groups = manifest?.properties.groups ?? [];
  if (!manifest) {
    return <p className="text-sm text-muted-foreground">Unknown component: {node.type}</p>;
  }
  return (
    <div className="space-y-2">
      <div>
        <p className="text-sm font-semibold">{manifest.name}</p>
        <p className="text-xs text-muted-foreground">{node.id}</p>
      </div>
      <AccordionPropertyGroups
        groups={groups}
        getValue={(field) => node.props[field.key]}
        setValue={(field, value) => onUpdateNodeProps(node.id, { [field.key]: value })}
      />
    </div>
  );
}

/** @deprecated Use NodeInspector */
export function PropertyInspector({
  binding,
  onChange,
}: {
  binding: ValueBinding | null;
  onChange: (binding: ValueBinding) => void;
}) {
  if (!binding) {
    return <p className="text-sm text-muted-foreground">Select a field to edit properties.</p>;
  }
  return (
    <NodeInspector
      document={{
        definitionVersion: 2,
        nodes: [],
        bindings: [binding],
      }}
      selection={{ type: "binding", id: binding.bindingId }}
      onUpdateBinding={onChange}
      onUpdateNodeProps={() => {}}
    />
  );
}

// Re-exports for compatibility
export { ComponentPalette } from "./component-palette";
export { buildDocumentTree, type TreeRow } from "./structure-panel";
export { selectionEquals, resolveInsertParentId } from "./designer-utils";
export type { SchemaDocument as SchemaDesignerDocument };
