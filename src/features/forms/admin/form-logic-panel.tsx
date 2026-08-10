"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { buildSimpleRuleExpression } from "@/features/forms/compiler/compile-fields";
import type { FormFieldConditional, FormScoringRule } from "@/features/forms/types";
import type { SchemaDocument, RuleDefinition } from "@/platform/schema-ui/schema/schema-document";
import { parseSimpleRuleExpression } from "@/features/forms/compiler/compile-fields";

type Props = {
  document: SchemaDocument;
  scoringRules: FormScoringRule[];
  onDocumentChange: (document: SchemaDocument) => void;
  onScoringChange: (rules: FormScoringRule[]) => void;
};

const OPERATORS: Array<{ value: FormFieldConditional["operator"]; label: string }> = [
  { value: "equals", label: "equals" },
  { value: "notEquals", label: "does not equal" },
  { value: "contains", label: "contains" },
  { value: "notEmpty", label: "is not empty" },
];

const ACTIONS: Array<{ value: FormFieldConditional["action"]; label: string }> = [
  { value: "show", label: "Show" },
  { value: "hide", label: "Hide" },
  { value: "require", label: "Require" },
];

export function FormLogicPanel({
  document,
  scoringRules,
  onDocumentChange,
  onScoringChange,
}: Props) {
  const rules = document.rules ?? [];
  const bindings = document.bindings;

  const updateRules = (next: RuleDefinition[]) => {
    onDocumentChange({ ...document, rules: next.length ? next : undefined });
  };

  const addRule = () => {
    const source = bindings[0]?.bindingId ?? "field";
    const target = bindings[1]?.bindingId ?? bindings[0]?.bindingId ?? "field";
    const id = `rule-${Date.now()}`;
    updateRules([
      ...rules,
      {
        id,
        expression: buildSimpleRuleExpression(source, "equals", ""),
        actions: [{ type: "show", bindingId: target }],
      },
    ]);
  };

  const patchRule = (index: number, patch: Partial<RuleDefinition>) => {
    updateRules(rules.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  };

  const updateRuleFromUi = (
    index: number,
    fieldId: string,
    operator: FormFieldConditional["operator"],
    value: string,
    action: FormFieldConditional["action"],
    targetId: string,
  ) => {
    patchRule(index, {
      expression: buildSimpleRuleExpression(fieldId, operator, value),
      actions: [{ type: action, bindingId: targetId }],
    });
  };

  return (
    <div className="space-y-6">
      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-sm">Conditional logic</h3>
            <p className="text-xs text-muted-foreground">IF / THEN rules mapped into the runtime definition on save.</p>
          </div>
          <Button type="button" size="sm" variant="outline" onClick={addRule} disabled={bindings.length === 0}>
            Add rule
          </Button>
        </div>

        {rules.length === 0 && (
          <p className="text-sm text-muted-foreground">No rules yet. Example: IF Service equals Sales THEN Show Budget.</p>
        )}

        {rules.map((rule, index) => {
          const parsed = parseSimpleRuleExpression(rule.expression);
          const action = rule.actions[0];
          const fieldId = parsed?.fieldId ?? bindings[0]?.bindingId ?? "";
          const operator = parsed?.operator ?? "equals";
          const value = parsed?.value ?? "";
          const actionType = (action?.type as FormFieldConditional["action"]) ?? "show";
          const targetId = action?.bindingId ?? bindings[0]?.bindingId ?? "";

          return (
            <div key={rule.id} className="border rounded-md p-3 space-y-2">
              <div className="flex flex-wrap items-end gap-2 text-sm">
                <span className="text-xs font-medium text-muted-foreground pb-2">IF</span>
                <div>
                  <Label className="text-xs">Field</Label>
                  <select
                    className="block border rounded-md h-9 px-2 text-sm min-w-[8rem]"
                    value={fieldId}
                    onChange={(e) =>
                      updateRuleFromUi(index, e.target.value, operator, value, actionType, targetId)
                    }
                  >
                    {bindings.map((b) => (
                      <option key={b.bindingId} value={b.bindingId}>
                        {String(b.presentation.label ?? b.bindingId)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label className="text-xs">Operator</Label>
                  <select
                    className="block border rounded-md h-9 px-2 text-sm"
                    value={operator}
                    onChange={(e) =>
                      updateRuleFromUi(
                        index,
                        fieldId,
                        e.target.value as FormFieldConditional["operator"],
                        value,
                        actionType,
                        targetId,
                      )
                    }
                  >
                    {OPERATORS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                {operator !== "notEmpty" && (
                  <div>
                    <Label className="text-xs">Value</Label>
                    <Input
                      className="h-9"
                      value={value}
                      onChange={(e) =>
                        updateRuleFromUi(index, fieldId, operator, e.target.value, actionType, targetId)
                      }
                    />
                  </div>
                )}
              </div>
              <div className="flex flex-wrap items-end gap-2 text-sm">
                <span className="text-xs font-medium text-muted-foreground pb-2">THEN</span>
                <div>
                  <Label className="text-xs">Action</Label>
                  <select
                    className="block border rounded-md h-9 px-2 text-sm"
                    value={actionType}
                    onChange={(e) =>
                      updateRuleFromUi(
                        index,
                        fieldId,
                        operator,
                        value,
                        e.target.value as FormFieldConditional["action"],
                        targetId,
                      )
                    }
                  >
                    {ACTIONS.map((a) => (
                      <option key={a.value} value={a.value}>
                        {a.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label className="text-xs">Target field</Label>
                  <select
                    className="block border rounded-md h-9 px-2 text-sm min-w-[8rem]"
                    value={targetId}
                    onChange={(e) =>
                      updateRuleFromUi(index, fieldId, operator, value, actionType, e.target.value)
                    }
                  >
                    {bindings.map((b) => (
                      <option key={b.bindingId} value={b.bindingId}>
                        {String(b.presentation.label ?? b.bindingId)}
                      </option>
                    ))}
                  </select>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="ms-auto"
                  onClick={() => updateRules(rules.filter((_, i) => i !== index))}
                >
                  Remove
                </Button>
              </div>
            </div>
          );
        })}
      </Card>

      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-sm">Scoring</h3>
            <p className="text-xs text-muted-foreground">Award points when a field value matches a pattern.</p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() =>
              onScoringChange([
                ...scoringRules,
                { fieldId: bindings[0]?.bindingId ?? "", match: ".+", points: 10 },
              ])
            }
            disabled={bindings.length === 0}
          >
            Add rule
          </Button>
        </div>
        {scoringRules.map((rule, index) => (
          <div key={`${rule.fieldId}-${index}`} className="flex flex-wrap gap-2 items-end">
            <div>
              <Label className="text-xs">Field</Label>
              <select
                className="block border rounded-md h-9 px-2 text-sm"
                value={rule.fieldId}
                onChange={(e) =>
                  onScoringChange(
                    scoringRules.map((r, i) => (i === index ? { ...r, fieldId: e.target.value } : r)),
                  )
                }
              >
                {bindings.map((b) => (
                  <option key={b.bindingId} value={b.bindingId}>
                    {String(b.presentation.label ?? b.bindingId)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs">Match</Label>
              <Input
                className="h-9"
                value={rule.match}
                onChange={(e) =>
                  onScoringChange(
                    scoringRules.map((r, i) => (i === index ? { ...r, match: e.target.value } : r)),
                  )
                }
              />
            </div>
            <div>
              <Label className="text-xs">Points</Label>
              <Input
                className="h-9 w-20"
                type="number"
                value={rule.points}
                onChange={(e) =>
                  onScoringChange(
                    scoringRules.map((r, i) =>
                      i === index ? { ...r, points: Number(e.target.value) || 0 } : r,
                    ),
                  )
                }
              />
            </div>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => onScoringChange(scoringRules.filter((_, i) => i !== index))}
            >
              Remove
            </Button>
          </div>
        ))}
      </Card>
    </div>
  );
}
