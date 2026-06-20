"use client";

import type { ContentFieldDefinition } from "@/features/content/types";
import type {
  ComparisonAttributeOverride,
  ContentTypeComparisonConfig,
  ComparisonMode,
} from "@/features/comparison/types";
import { LocalizedItemFields } from "@/features/marketing-blocks/admin/localized-item-fields";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ComparisonSortableFields } from "@/features/content/admin/comparison-sortable-fields";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Props = {
  fieldSchema: ContentFieldDefinition[];
  comparison: ContentTypeComparisonConfig;
  onComparisonChange: (next: ContentTypeComparisonConfig) => void;
  onFieldSchemaChange: (fields: ContentFieldDefinition[]) => void;
};

function getOverride(
  attributes: ComparisonAttributeOverride[] | undefined,
  key: string
): ComparisonAttributeOverride | undefined {
  return attributes?.find((a) => a.key === key);
}

function setOverride(
  attributes: ComparisonAttributeOverride[] | undefined,
  patch: ComparisonAttributeOverride
): ComparisonAttributeOverride[] {
  const list = [...(attributes ?? [])];
  const idx = list.findIndex((a) => a.key === patch.key);
  const hasValues =
    patch.labelEn ||
    patch.labelAr ||
    patch.compareOrder != null ||
    patch.compareGroup ||
    patch.highlightDifferences != null;

  if (!hasValues) {
    if (idx >= 0) list.splice(idx, 1);
    return list;
  }

  if (idx >= 0) list[idx] = { ...list[idx], ...patch };
  else list.push(patch);
  return list;
}

export function ContentTypeComparisonPanel({
  fieldSchema,
  comparison,
  onComparisonChange,
  onFieldSchemaChange,
}: Props) {
  const settings = comparison.comparisonSettings;
  const compareFields = fieldSchema.filter((f) => f.compare === true);

  const updateField = (index: number, patch: Partial<ContentFieldDefinition>) => {
    const next = [...fieldSchema];
    next[index] = { ...next[index], ...patch };
    onFieldSchemaChange(next);
  };

  const toggleComparableField = (index: number, compare: boolean) => {
    const field = fieldSchema[index];
    updateField(index, {
      compare,
      compareOrder: compare ? (field.compareOrder ?? index * 10) : undefined,
      compareGroup: compare ? (field.compareGroup ?? field.group ?? "General") : undefined,
      compareLabelEn: compare ? field.compareLabelEn : undefined,
      compareLabelAr: compare ? field.compareLabelAr : undefined,
    });
  };

  const updateSettingsAttributes = (attributes: ComparisonAttributeOverride[]) => {
    onComparisonChange({
      ...comparison,
      comparisonSettings: { ...settings, attributes },
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Comparison</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={comparison.isComparable}
            onChange={(e) =>
              onComparisonChange({
                ...comparison,
                isComparable: e.target.checked,
              })
            }
          />
          Enable comparison for this content type
        </label>

        {comparison.isComparable ? (
          <>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.enabled}
                onChange={(e) =>
                  onComparisonChange({
                    ...comparison,
                    comparisonSettings: { ...settings, enabled: e.target.checked },
                  })
                }
              />
              Comparison active (storefront)
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Comparison group (hub)</Label>
                <Input
                  value={comparison.comparisonGroup ?? ""}
                  onChange={(e) =>
                    onComparisonChange({
                      ...comparison,
                      comparisonGroup: e.target.value || undefined,
                    })
                  }
                  placeholder="e.g. Travel catalog"
                />
              </div>
              <div>
                <Label>Display priority</Label>
                <Input
                  type="number"
                  value={comparison.comparisonPriority ?? settings.comparisonPriority ?? 0}
                  onChange={(e) =>
                    onComparisonChange({
                      ...comparison,
                      comparisonPriority: Number(e.target.value),
                      comparisonSettings: {
                        ...settings,
                        comparisonPriority: Number(e.target.value),
                      },
                    })
                  }
                />
              </div>
              <div>
                <Label>Maximum items</Label>
                <Input
                  type="number"
                  min={2}
                  max={12}
                  value={settings.maxItems}
                  onChange={(e) =>
                    onComparisonChange({
                      ...comparison,
                      comparisonSettings: {
                        ...settings,
                        maxItems: Number(e.target.value) || 4,
                      },
                    })
                  }
                />
              </div>
              <div>
                <Label>Display mode</Label>
                <select
                  className="flex h-10 w-full rounded-lg border bg-background px-3 text-sm"
                  value={settings.comparisonMode}
                  onChange={(e) =>
                    onComparisonChange({
                      ...comparison,
                      comparisonSettings: {
                        ...settings,
                        comparisonMode: e.target.value as ComparisonMode,
                      },
                    })
                  }
                >
                  <option value="hybrid">Hybrid (cards + table)</option>
                  <option value="table">Table only</option>
                  <option value="cards">Cards only</option>
                </select>
              </div>
            </div>

            <Tabs defaultValue="fields">
              <TabsList>
                <TabsTrigger value="fields">Comparable fields</TabsTrigger>
                <TabsTrigger value="advanced">Advanced overrides</TabsTrigger>
              </TabsList>
              <TabsContent value="fields" className="space-y-2 mt-4">
                <p className="text-xs text-muted-foreground">
                  Drag to reorder compare rows. Labels override storefront column headers.
                </p>
                {fieldSchema.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Add fields in the schema editor first.</p>
                ) : (
                  <>
                    <div className="space-y-2 max-h-[16rem] overflow-y-auto">
                      {fieldSchema.map((field, index) =>
                        field.compare ? null : (
                          <label
                            key={`${field.key}-${index}`}
                            className="flex items-center gap-2 rounded-lg border p-2 text-sm"
                          >
                            <input
                              type="checkbox"
                              checked={false}
                              onChange={(e) => toggleComparableField(index, e.target.checked)}
                            />
                            <span>
                              {field.labelEn} ({field.key})
                            </span>
                          </label>
                        )
                      )}
                    </div>
                    <ComparisonSortableFields
                      fieldSchema={fieldSchema}
                      onFieldSchemaChange={onFieldSchemaChange}
                      renderFieldEditor={(field, index) => (
                        <div className="rounded-lg border p-3 text-sm space-y-2">
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={field.compare === true}
                              onChange={(e) => toggleComparableField(index, e.target.checked)}
                            />
                            <span className="font-medium">{field.labelEn}</span>
                            <span className="text-muted-foreground">({field.key})</span>
                          </label>
                          <LocalizedItemFields
                            fields={[{ key: "compareLabel", label: "Compare label" }]}
                            values={{
                              compareLabelEn: field.compareLabelEn ?? "",
                              compareLabelAr: field.compareLabelAr ?? "",
                            }}
                            onChange={(patch) =>
                              updateField(index, {
                                compareLabelEn: patch.compareLabelEn || undefined,
                                compareLabelAr: patch.compareLabelAr || undefined,
                              })
                            }
                          />
                          <div>
                            <Label className="text-xs">Group</Label>
                            <Input
                              className="h-8"
                              value={field.compareGroup ?? field.group ?? ""}
                              onChange={(e) =>
                                updateField(index, { compareGroup: e.target.value || undefined })
                              }
                              placeholder="General"
                            />
                          </div>
                          <label className="flex items-center gap-1 text-xs">
                            <input
                              type="checkbox"
                              checked={field.highlightDifferences !== false}
                              onChange={(e) =>
                                updateField(index, { highlightDifferences: e.target.checked })
                              }
                            />
                            Highlight differences
                          </label>
                        </div>
                      )}
                    />
                  </>
                )}
              </TabsContent>
              <TabsContent value="advanced" className="mt-4">

                {compareFields.length > 0 ? (
                  <div className="space-y-3">
                    <p className="text-xs text-muted-foreground">
                      Optional per-field overrides merged at runtime.
                    </p>
                    {compareFields.map((field) => {
                      const ov = getOverride(settings.attributes, field.key);
                      return (
                        <div key={field.key} className="space-y-2 text-sm border-t pt-2">
                          <span className="font-medium text-muted-foreground">{field.key}</span>
                          <LocalizedItemFields
                            fields={[{ key: "label", label: "Override label" }]}
                            values={{
                              labelEn: ov?.labelEn ?? "",
                              labelAr: ov?.labelAr ?? "",
                            }}
                            onChange={(patch) =>
                              updateSettingsAttributes(
                                setOverride(settings.attributes, {
                                  key: field.key,
                                  labelEn: patch.labelEn || undefined,
                                  labelAr: patch.labelAr || undefined,
                                })
                              )
                            }
                          />
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Enable comparable fields first.</p>
                )}
              </TabsContent>
            </Tabs>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
