"use client";

import type { BlockNode } from "@/types/builder";
import { Label } from "@/components/ui/label";
import type { ProductBuilderOption } from "@/features/builder/blocks/commerce/product-blocks/types";
import { ProductBuilderSelect } from "@/features/builder/blocks/commerce/product-blocks/admin/builder-catalog-selects";
import { LocalizedBlockTitle } from "@/features/builder/block-translation-context";
import { patchBlockSettings } from "@/features/builder/instance/block-instance";
import { newId } from "@/features/builder/blocks/commerce/product-blocks/schemas/product-blocks";
import { ModalRepeatableListEditor } from "@/features/builder/admin/shared/modal-repeatable-list-editor";
import {
  emptyLocalizedItemFields,
  LocalizedItemFields,
} from "@/features/builder/blocks/marketing/admin/localized-item-fields";

type FaqItem = {
  id: string;
  [key: string]: string;
};

type Props = {
  block: BlockNode;
  onChange: (block: BlockNode) => void;
  productOptions?: ProductBuilderOption[];
};

function emptyFaqItem(): FaqItem {
  return {
    id: newId("faq"),
    ...emptyLocalizedItemFields(["question", "answer"]),
  };
}

export function ProductFaqBlockFields({ block, onChange, productOptions = [] }: Props) {
  const items = (block.props.items as FaqItem[]) ?? [];

  const setProp = (key: string, value: unknown) => {
    onChange(patchBlockSettings(block, { [key]: value }));
  };

  const updateItems = (next: FaqItem[]) => setProp("items", next);

  return (
    <div className="space-y-4">
      <LocalizedBlockTitle block={block} />
      <div>
        <Label className="text-xs">Source</Label>
        <select
          className="w-full border rounded-md h-9 px-2 text-sm mt-1"
          value={(block.props.source as string) ?? "manual"}
          onChange={(e) => setProp("source", e.target.value)}
        >
          <option value="manual">Manual Q&A</option>
          <option value="product">Product FAQ field</option>
          <option value="productSections">Product description sections</option>
        </select>
      </div>
      {(block.props.source === "product" || block.props.source === "productSections") && (
        <div>
          <Label className="text-xs">Product</Label>
          <div className="mt-1">
            <ProductBuilderSelect
              id={`${block.id ?? "product-faq"}-product`}
              products={productOptions}
              value={(block.props.productSlug as string) ?? ""}
              onChange={(slug) => setProp("productSlug", slug)}
            />
          </div>
        </div>
      )}
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={Boolean(block.props.searchable)}
          onChange={(e) => setProp("searchable", e.target.checked)}
        />
        Searchable
      </label>
      {(block.props.source as string) === "manual" && (
        <ModalRepeatableListEditor
          items={items}
          onChange={updateItems}
          createEmpty={emptyFaqItem}
          strings={{
            sectionLabel: "FAQ items",
            addButtonLabel: "Add FAQ",
            emptyLabel: "No FAQ items yet. Click Add FAQ to create one.",
            dialogTitleCreate: "Add FAQ",
            dialogTitleEdit: "Edit FAQ",
            saveButtonLabelCreate: "Save FAQ",
            saveButtonLabelEdit: "Save FAQ",
          }}
          renderSummary={(item, index) => ({
            title: ((item.questionEn as string | undefined) ?? "").trim() || `FAQ ${index + 1}`,
            meta: [],
          })}
          renderForm={(draft, onUpdate) => (
            <LocalizedItemFields
              fields={[
                { key: "question", label: "Question" },
                { key: "answer", label: "Answer", multiline: true },
              ]}
              values={draft}
              onChange={(patch) => onUpdate(patch as Partial<FaqItem>)}
            />
          )}
        />
      )}
    </div>
  );
}
