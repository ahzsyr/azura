"use client";

import type { BlockNode } from "@/types/builder";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LocalizedBlockTitle } from "@/features/builder/block-translation-context";
import { patchBlockSettings } from "@/features/builder/instance/block-instance";

type Props = { block: BlockNode; onChange: (block: BlockNode) => void };

function setProp(block: BlockNode, onChange: (b: BlockNode) => void, key: string, value: unknown) {
  onChange(patchBlockSettings(block, { [key]: value }));
}

export function PricingBlockFields({ block, onChange }: Props) {
  const source = (block.props.source as string) ?? "packages";

  return (
    <div className="space-y-3">
      <LocalizedBlockTitle block={block} />
      <div>
        <Label className="text-xs">Source</Label>
        <select
          className="w-full border rounded-md h-9 px-2 text-sm mt-1"
          value={source}
          onChange={(e) => setProp(block, onChange, "source", e.target.value)}
        >
          <option value="packages">Catalog packages</option>
          <option value="planSet">Pricing plan set</option>
        </select>
      </div>
      {source === "planSet" ? (
        <Input
          placeholder="Plan set slug"
          value={(block.props.planSetSlug as string) ?? ""}
          onChange={(e) => setProp(block, onChange, "planSetSlug", e.target.value)}
        />
      ) : (
        <Input
          placeholder="Package category slug"
          value={(block.props.packageCategorySlug as string) ?? ""}
          onChange={(e) => setProp(block, onChange, "packageCategorySlug", e.target.value)}
        />
      )}
      <div>
        <Label className="text-xs">Layout</Label>
        <select
          className="w-full border rounded-md h-9 px-2 text-sm mt-1"
          value={(block.props.layout as string) ?? "cards"}
          onChange={(e) => setProp(block, onChange, "layout", e.target.value)}
        >
          <option value="cards">Cards</option>
          <option value="table">Table</option>
          <option value="comparison">Comparison</option>
        </select>
      </div>
      {source === "planSet" && (
        <>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={block.props.showBillingToggle !== false}
              onChange={(e) => setProp(block, onChange, "showBillingToggle", e.target.checked)}
            />
            Show billing toggle
          </label>
          <div>
            <Label className="text-xs">Default billing period</Label>
            <select
              className="w-full border rounded-md h-9 px-2 text-sm mt-1"
              value={(block.props.defaultBillingPeriod as string) ?? "monthly"}
              onChange={(e) => setProp(block, onChange, "defaultBillingPeriod", e.target.value)}
            >
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
          <Input
            placeholder="Highlighted plan ID"
            value={(block.props.highlightedPlanId as string) ?? ""}
            onChange={(e) => setProp(block, onChange, "highlightedPlanId", e.target.value)}
          />
        </>
      )}
      <Input
        type="number"
        placeholder="Limit"
        value={String(block.props.limit ?? 3)}
        onChange={(e) => setProp(block, onChange, "limit", Number(e.target.value))}
      />
      {source === "packages" && (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={Boolean(block.props.showFeaturedOnly)}
            onChange={(e) => setProp(block, onChange, "showFeaturedOnly", e.target.checked)}
          />
          Featured packages only
        </label>
      )}
    </div>
  );
}
