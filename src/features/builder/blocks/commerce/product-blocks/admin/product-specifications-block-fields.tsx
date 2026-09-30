"use client";

import type { BlockNode } from "@/types/builder";
import { Label } from "@/components/ui/label";
import { LocalizedBlockTitle } from "@/features/builder/block-translation-context";
import { patchBlockSettings } from "@/features/builder/instance/block-instance";
import type { ProductBuilderOption } from "@/features/builder/blocks/commerce/product-blocks/types";
import { ProductBuilderSelect } from "@/features/builder/blocks/commerce/product-blocks/admin/builder-catalog-selects";
import { ModalRepeatableListEditor } from "@/features/builder/admin/shared/modal-repeatable-list-editor";
import { newId } from "@/features/builder/blocks/commerce/product-blocks/schemas/product-blocks";

type Props = {
  block: BlockNode;
  onChange: (block: BlockNode) => void;
  productOptions?: ProductBuilderOption[];
};

export function ProductSpecificationsBlockFields({
  block,
  onChange,
  productOptions = [],
}: Props) {
  const setProp = (key: string, value: unknown) => {
    onChange(patchBlockSettings(block, { [key]: value }));
  };

  const blockId = block.id ?? "product-specifications";
  const manualGroups =
    (block.props.manualGroups as { id: string; title: string; rows: { id: string; name: string; value: string }[] }[]) ?? [];

  return (
    <div className="space-y-4">
      <LocalizedBlockTitle block={block} />
      <div>
        <Label className="text-xs">Product</Label>
        <div className="mt-1">
          <ProductBuilderSelect
            id={`${blockId}-product`}
            products={productOptions}
            value={(block.props.productSlug as string) ?? ""}
            onChange={(slug) => setProp("productSlug", slug)}
          />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Leave product empty to render manual groups only.
      </p>
      <ModalRepeatableListEditor
        items={manualGroups}
        onChange={(next) => setProp("manualGroups", next)}
        createEmpty={() => ({ id: newId("specgrp"), title: "", rows: [] })}
        strings={{
          sectionLabel: "Manual groups",
          addButtonLabel: "Add group",
          emptyLabel: "No manual groups yet. Click Add group to create one.",
          dialogTitleCreate: "Add group",
          dialogTitleEdit: "Edit group",
          saveButtonLabelCreate: "Save group",
          saveButtonLabelEdit: "Save group",
        }}
        renderSummary={(group, index) => ({
          title: group.title || `Group ${index + 1}`,
          meta: [`${group.rows.length} row(s)`],
        })}
        renderForm={(draft, onUpdate) => (
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Group title</Label>
              <input
                className="w-full border rounded-md h-9 px-2 text-sm mt-1"
                value={draft.title}
                onChange={(e) => onUpdate({ title: e.target.value })}
              />
            </div>
            <ModalRepeatableListEditor
              items={draft.rows}
              onChange={(rows) => onUpdate({ rows })}
              createEmpty={() => ({ id: newId("specrow"), name: "", value: "" })}
              strings={{
                sectionLabel: "Rows",
                addButtonLabel: "Add row",
                emptyLabel: "No rows yet. Click Add row to create one.",
                dialogTitleCreate: "Add row",
                dialogTitleEdit: "Edit row",
                saveButtonLabelCreate: "Save row",
                saveButtonLabelEdit: "Save row",
              }}
              renderSummary={(row, index) => ({
                title: row.name || `Row ${index + 1}`,
                meta: row.value ? [`Value: ${row.value}`] : [],
              })}
              renderForm={(rowDraft, onRowUpdate) => (
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs">Name</Label>
                    <input
                      className="w-full border rounded-md h-9 px-2 text-sm mt-1"
                      value={rowDraft.name}
                      onChange={(e) => onRowUpdate({ name: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Value</Label>
                    <input
                      className="w-full border rounded-md h-9 px-2 text-sm mt-1"
                      value={rowDraft.value}
                      onChange={(e) => onRowUpdate({ value: e.target.value })}
                    />
                  </div>
                </div>
              )}
            />
          </div>
        )}
      />
    </div>
  );
}
