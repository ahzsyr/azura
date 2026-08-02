// @ts-nocheck
import type { Product, ProductConditionOption, ProductVariation } from "@/features/products/types";
import type { ProductVariationCombination } from "@/features/products/lib/product-page-display";
import {
  buildVariationDimensions,
  formatCombinationLabel,
  mergeVariationCombinations,
} from "@/features/products/lib/product-variation-pricing";
import {
  createConditionVariationGroup,
  needsConditionGroupMigration,
  variationsForAdminEditor,
} from "@/features/products/lib/product-variation-admin";

type Props = {
  product: Product;
  onChange: (patch: Partial<Product>) => void;
};

const PRESETS: { label: string; group: ProductVariation }[] = [
  { label: "Plug", group: { type: "Plug", options: ["EU", "UK", "US"], default: "EU" } },
  { label: "Color", group: { type: "Color", options: ["Red", "Blue"], default: "Red" } },
  { label: "Size", group: { type: "Size", options: ["S", "M", "L"], default: "M" } },
  {
    label: "Condition",
    group: createConditionVariationGroup(["new", "used", "refurbished"]),
  },
];

const COMBO_META = new Set(["sku", "price", "old_price", "price_adjustment"]);

function comboSelected(combo: ProductVariationCombination): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(combo)) {
    if (COMBO_META.has(k)) continue;
    if (typeof v === "string") out[k] = v;
  }
  return out;
}

function parseOptionsCsv(raw: string): string[] {
  return raw
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
}

export function ProductVariationsEditor({ product, onChange }: Props) {
  const displayVariations = variationsForAdminEditor(product);
  const dimensions = buildVariationDimensions({
    ...product,
    variations: displayVariations,
  });
  const combos = product.variation_combinations ?? [];
  const showConditionMigrate = needsConditionGroupMigration(product);
  const groups = product.variations ?? [];
  const basePrice = product.price?.value ?? 0;
  const baseCompare = product.old_price;
  const pricePlaceholder =
    basePrice > 0 ? String(basePrice) : "Default";
  const comparePlaceholder =
    baseCompare != null && baseCompare > 0 ? String(baseCompare) : "—";

  const patchVariations = (next: ProductVariation[]) => {
    onChange({ variations: next });
  };

  const updateGroup = (idx: number, patch: Partial<ProductVariation>) => {
    const copy = [...groups];
    copy[idx] = { ...copy[idx], ...patch };
    if (patch.options) {
      const opts = patch.options;
      const def = copy[idx]!.default;
      if (!def || !opts.includes(def)) {
        copy[idx] = { ...copy[idx], default: opts[0] ?? "" };
      }
    }
    patchVariations(copy);
  };

  const removeGroup = (idx: number) => {
    patchVariations(groups.filter((_, i) => i !== idx));
  };

  const addGroup = (seed?: ProductVariation) => {
    patchVariations([...groups, seed ?? { type: "", options: [], default: "" }]);
  };

  const setOptionsFromCsv = (groupIdx: number, raw: string) => {
    const opts = parseOptionsCsv(raw);
    updateGroup(groupIdx, { options: opts });
  };

  const migrateConditionGroup = () => {
    const legacy = (product.condition_options ?? ["new"]) as ProductConditionOption[];
    onChange({
      variations: [...groups, createConditionVariationGroup(legacy)],
    });
  };

  const regenerateMix = () => {
    const withDisplayVariations = { ...product, variations: displayVariations };
    onChange({
      variation_combinations: mergeVariationCombinations(
        withDisplayVariations,
        product.variation_combinations,
      ),
    });
  };

  const updateCombo = (idx: number, patch: Partial<ProductVariationCombination>) => {
    const copy = [...combos];
    const row = { ...copy[idx], ...patch };
    if ("price" in patch && patch.price === undefined) delete row.price;
    if ("old_price" in patch && patch.old_price === undefined) delete row.old_price;
    copy[idx] = row;
    onChange({ variation_combinations: copy });
  };

  const clearAllPrices = () => {
    onChange({
      variation_combinations: combos.map((combo) => {
        const { price, old_price, ...rest } = combo;
        return rest;
      }),
    });
  };

  return (
    <div className="pve">
      {showConditionMigrate ? (
        <div className="pve-banner">
          <p>Condition options exist without a Condition group.</p>
          <button type="button" className="pve-btn pve-btn--sm" onClick={migrateConditionGroup}>
            Add Condition group
          </button>
        </div>
      ) : null}

      <div className="pve-layout">
        <section className="pve-section pve-section--groups">
          <div className="pve-toolbar">
            <h3 className="pve-section__title">Groups</h3>
            <div className="pve-toolbar__actions">
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  className="pve-btn pve-btn--sm pve-btn--ghost"
                  onClick={() => addGroup({ ...p.group })}
                >
                  +{p.label}
                </button>
              ))}
              <button type="button" className="pve-btn pve-btn--sm" onClick={() => addGroup()}>
                + Custom
              </button>
            </div>
          </div>

          {groups.length === 0 ? (
            <p className="pve-empty">Add a group, then regenerate the mix to set prices.</p>
          ) : (
            <div className="pve-groups">
              <div className="pve-groups__head" aria-hidden>
                <span>Type</span>
                <span>Options</span>
                <span>Default</span>
                <span />
              </div>
              {groups.map((group, groupIdx) => {
                const opts = (group.options ?? []).filter(Boolean);
                return (
                  <div key={`vg-${groupIdx}`} className="pve-group-row">
                    <input
                      className="pve-group-row__type"
                      value={group.type ?? ""}
                      placeholder="Type"
                      aria-label="Variation type"
                      onChange={(e) => updateGroup(groupIdx, { type: e.target.value })}
                    />
                    <input
                      className="pve-group-row__options"
                      value={(group.options ?? []).join(", ")}
                      placeholder="EU, UK, US"
                      aria-label="Options comma separated"
                      onChange={(e) => setOptionsFromCsv(groupIdx, e.target.value)}
                    />
                    <select
                      className="pve-group-row__default"
                      value={group.default ?? ""}
                      aria-label="Default option"
                      onChange={(e) => updateGroup(groupIdx, { default: e.target.value })}
                    >
                      {opts.length === 0 ? <option value="">—</option> : null}
                      {opts.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="pve-group-row__remove"
                      onClick={() => removeGroup(groupIdx)}
                      aria-label={`Remove ${group.type || "group"}`}
                      title="Remove group"
                    >
                      ×
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="pve-section pve-section--mix">
          <div className="pve-toolbar">
            <div className="pve-toolbar__title-row">
              <h3 className="pve-section__title">Mix &amp; prices</h3>
              {combos.length > 0 ? <span className="pve-badge">{combos.length}</span> : null}
            </div>
            <div className="pve-toolbar__actions">
              <button
                type="button"
                className="pve-btn pve-btn--sm"
                onClick={regenerateMix}
                disabled={dimensions.length === 0}
                title="Rebuild rows from groups"
              >
                Regenerate
              </button>
              {combos.length > 0 ? (
                <button type="button" className="pve-btn pve-btn--sm pve-btn--ghost" onClick={clearAllPrices}>
                  Clear prices
                </button>
              ) : null}
            </div>
          </div>

          <p className="pve-hint">
            Empty price → default <strong>{basePrice}</strong>
            {product.price?.currency ? ` ${product.price.currency}` : ""} from Pricing &amp; Stock.
          </p>

          {dimensions.length === 0 ? (
            <p className="pve-empty">Add a group with options first.</p>
          ) : combos.length === 0 ? (
            <p className="pve-empty">Click Regenerate to create rows, then tab through prices.</p>
          ) : (
            <div className="pve-mix-scroll">
              <table className="pve-mix-table">
                <thead>
                  <tr>
                    <th className="pve-mix-table__mix-col">Mix</th>
                    <th className="pve-mix-table__sku-col">SKU</th>
                    <th className="pve-mix-table__price-col">Price</th>
                    <th className="pve-mix-table__price-col">Compare</th>
                  </tr>
                </thead>
                <tbody>
                  {combos.map((combo, idx) => {
                    const selected = comboSelected(combo);
                    const label = formatCombinationLabel(selected, dimensions);
                    const hasCustomPrice =
                      typeof combo.price === "number" && Number.isFinite(combo.price);
                    return (
                      <tr key={`combo-${idx}`} className={hasCustomPrice ? "pve-mix-table__row--priced" : ""}>
                        <td className="pve-mix-table__mix" title={label}>
                          {label}
                        </td>
                        <td>
                          <input
                            className="pve-mix-table__input pve-mix-table__input--sku"
                            value={combo.sku ?? ""}
                            placeholder="—"
                            onChange={(e) => updateCombo(idx, { sku: e.target.value })}
                          />
                        </td>
                        <td>
                          <input
                            className="pve-mix-table__input pve-mix-table__input--price"
                            type="number"
                            inputMode="decimal"
                            step="any"
                            placeholder={pricePlaceholder}
                            value={combo.price ?? ""}
                            onChange={(e) => {
                              const raw = e.target.value;
                              updateCombo(idx, { price: raw === "" ? undefined : Number(raw) });
                            }}
                          />
                        </td>
                        <td>
                          <input
                            className="pve-mix-table__input pve-mix-table__input--price"
                            type="number"
                            inputMode="decimal"
                            step="any"
                            placeholder={comparePlaceholder}
                            value={combo.old_price ?? ""}
                            onChange={(e) => {
                              const raw = e.target.value;
                              updateCombo(idx, { old_price: raw === "" ? undefined : Number(raw) });
                            }}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
