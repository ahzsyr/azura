"use client";

import type { BlockNode } from "@/types/builder";
import { Label } from "@/components/ui/label";
import { patchBlockSettings } from "@/features/builder/instance/block-instance";
import { ShowcaseHeaderFields } from "@/features/builder/blocks/commerce/commerce-showcase/admin/showcase-shared-fields";
import { ModalRepeatableListEditor } from "@/features/builder/admin/shared/modal-repeatable-list-editor";
import { newShowcaseId } from "@/features/builder/blocks/commerce/commerce-showcase/schemas/showcase-blocks";

export function CategoryShowcaseBlockFields({
  block,
  onChange,
}: {
  block: BlockNode;
  onChange: (block: BlockNode) => void;
}) {
  const setProp = (key: string, value: unknown) => onChange(patchBlockSettings(block, { [key]: value }));
  const source = (block.props.source as string) ?? "collections";
  const manualNodes =
    (block.props.manualNodes as {
      id: string;
      label: string;
      href: string;
      imageUrl?: string;
      iconUrl?: string;
      description?: string;
      children?: unknown[];
    }[]) ?? [];

  return (
    <div className="space-y-4">
      <ShowcaseHeaderFields block={block} onChange={onChange} />
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Source</Label>
          <select
            className="w-full border rounded-md h-9 px-2 text-sm mt-1"
            value={source}
            onChange={(e) => setProp("source", e.target.value)}
          >
            <option value="collections">Collections</option>
            <option value="productCategories">Product categories</option>
            <option value="manual">Manual</option>
          </select>
        </div>
        <div>
          <Label className="text-xs">Layout</Label>
          <select
            className="w-full border rounded-md h-9 px-2 text-sm mt-1"
            value={(block.props.layout as string) ?? "grid"}
            onChange={(e) => setProp("layout", e.target.value)}
          >
            <option value="grid">Grid</option>
            <option value="slider">Slider</option>
            <option value="carousel">Carousel</option>
            <option value="masonry">Masonry</option>
            <option value="list">List</option>
            <option value="cards">Cards</option>
            <option value="megaTiles">Mega tiles</option>
            <option value="banner">Banner</option>
            <option value="icons">Icons</option>
            <option value="nestedTree">Nested tree</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={block.props.showImages !== false}
            onChange={(e) => setProp("showImages", e.target.checked)}
          />
          Show images
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={block.props.showCounts !== false}
            onChange={(e) => setProp("showCounts", e.target.checked)}
          />
          Show counts
        </label>
      </div>
      <div>
        <Label className="text-xs">Limit</Label>
        <input
          type="number"
          min={1}
          max={48}
          className="w-full border rounded-md h-9 px-2 text-sm mt-1"
          value={(block.props.limit as number) ?? 12}
          onChange={(e) => setProp("limit", Number(e.target.value))}
        />
      </div>
      {source === "manual" ? (
        <ModalRepeatableListEditor
          items={manualNodes}
          onChange={(next) => setProp("manualNodes", next)}
          createEmpty={() => ({
            id: newShowcaseId("cat"),
            label: "",
            href: "",
            imageUrl: "",
            iconUrl: "",
            description: "",
            children: [],
          })}
          strings={{
            sectionLabel: "Manual nodes",
            addButtonLabel: "Add node",
            emptyLabel: "No manual nodes yet. Click Add node to create one.",
            dialogTitleCreate: "Add node",
            dialogTitleEdit: "Edit node",
            saveButtonLabelCreate: "Save node",
            saveButtonLabelEdit: "Save node",
          }}
          renderSummary={(node, index) => ({
            title: node.label || `Node ${index + 1}`,
            meta: node.href ? [`Href: ${node.href}`] : [],
          })}
          renderForm={(draft, onUpdate) => (
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Label</Label>
                <input
                  className="w-full border rounded-md h-9 px-2 text-sm mt-1"
                  value={draft.label}
                  onChange={(e) => onUpdate({ label: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs">Href</Label>
                <input
                  className="w-full border rounded-md h-9 px-2 text-sm mt-1"
                  value={draft.href}
                  onChange={(e) => onUpdate({ href: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs">Description</Label>
                <input
                  className="w-full border rounded-md h-9 px-2 text-sm mt-1"
                  value={draft.description ?? ""}
                  onChange={(e) => onUpdate({ description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Image URL</Label>
                  <input
                    className="w-full border rounded-md h-9 px-2 text-sm mt-1"
                    value={draft.imageUrl ?? ""}
                    onChange={(e) => onUpdate({ imageUrl: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="text-xs">Icon URL</Label>
                  <input
                    className="w-full border rounded-md h-9 px-2 text-sm mt-1"
                    value={draft.iconUrl ?? ""}
                    onChange={(e) => onUpdate({ iconUrl: e.target.value })}
                  />
                </div>
              </div>
            </div>
          )}
        />
      ) : null}
    </div>
  );
}
