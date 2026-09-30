"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type {
  FormAutomationAction,
  FormAutomationRule,
  FormDestinationConfig,
  FormTemplateDefinition,
} from "@/features/forms/types";

type Assignee = { id: string; name: string; email: string };

type Props = {
  definition: FormTemplateDefinition;
  assignees: Assignee[];
  onChange: (definition: FormTemplateDefinition) => void;
};

/** Linear automation canvas: Trigger → Condition → Actions → Destinations. */
export function AutomationCanvasPanel({ definition, assignees, onChange }: Props) {
  const rules = definition.automationRules ?? [];
  const rule = rules[0];
  const destinations = definition.destinations ?? [];

  const patchRule = (next: FormAutomationRule | null) => {
    onChange({
      ...definition,
      automationRules: next ? [next, ...rules.slice(1)] : rules.slice(1),
    });
  };

  const ensureRule = (): FormAutomationRule =>
    rule ?? {
      id: `auto-${Date.now()}`,
      event: "interaction.submitted",
      condition: "",
      actions: [],
    };

  const actions = rule?.actions ?? [];

  const updateAction = (index: number, action: FormAutomationAction) => {
    const current = ensureRule();
    const nextActions = [...(current.actions.length ? current.actions : actions)];
    nextActions[index] = action;
    patchRule({ ...current, actions: nextActions });
  };

  const addAction = () => {
    const current = ensureRule();
    patchRule({
      ...current,
      actions: [...current.actions, { type: "tag", tags: ["lead"] }],
    });
  };

  const setDestinations = (next: FormDestinationConfig[]) => {
    onChange({ ...definition, destinations: next });
  };

  return (
    <Card className="p-4 space-y-0">
      <h3 className="font-medium text-sm mb-4">Automation canvas</h3>
      <div className="space-y-0 max-w-lg">
        <ChainNode title="Trigger" subtitle="Form submitted" />
        <ChainArrow />
        <ChainNode title="Condition">
          <Input
            placeholder="Optional e.g. score >= 20"
            value={rule?.condition ?? ""}
            onChange={(e) => {
              const current = ensureRule();
              patchRule({ ...current, condition: e.target.value || undefined });
            }}
          />
        </ChainNode>
        {actions.map((action, index) => (
          <div key={index}>
            <ChainArrow />
            <ChainNode title={`Action ${index + 1}`}>
              <div className="space-y-2">
                <select
                  className="w-full border rounded-md h-9 px-2 text-sm"
                  value={action.type}
                  onChange={(e) => {
                    const t = e.target.value as FormAutomationAction["type"];
                    if (t === "tag") updateAction(index, { type: "tag", tags: ["lead"] });
                    if (t === "assign")
                      updateAction(index, { type: "assign", assigneeId: assignees[0]?.id ?? "" });
                    if (t === "setPipeline")
                      updateAction(index, { type: "setPipeline", pipelineType: "qualified" });
                    if (t === "notify") updateAction(index, { type: "notify", emails: [] });
                  }}
                >
                  <option value="tag">Tag</option>
                  <option value="assign">Assign</option>
                  <option value="setPipeline">Set pipeline</option>
                  <option value="notify">Notify</option>
                </select>
                {action.type === "tag" && (
                  <Input
                    value={action.tags.join(", ")}
                    onChange={(e) =>
                      updateAction(index, {
                        type: "tag",
                        tags: e.target.value
                          .split(",")
                          .map((s) => s.trim())
                          .filter(Boolean),
                      })
                    }
                  />
                )}
                {action.type === "assign" && (
                  <select
                    className="w-full border rounded-md h-9 px-2 text-sm"
                    value={action.assigneeId}
                    onChange={(e) => updateAction(index, { type: "assign", assigneeId: e.target.value })}
                  >
                    {assignees.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                )}
                {action.type === "setPipeline" && (
                  <Input
                    value={action.pipelineType}
                    onChange={(e) =>
                      updateAction(index, { type: "setPipeline", pipelineType: e.target.value })
                    }
                  />
                )}
                {action.type === "notify" && (
                  <Input
                    placeholder="Emails"
                    value={action.emails.join(", ")}
                    onChange={(e) =>
                      updateAction(index, {
                        type: "notify",
                        emails: e.target.value
                          .split(",")
                          .map((s) => s.trim())
                          .filter(Boolean),
                      })
                    }
                  />
                )}
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    const current = ensureRule();
                    patchRule({
                      ...current,
                      actions: current.actions.filter((_, i) => i !== index),
                    });
                  }}
                >
                  Remove action
                </Button>
              </div>
            </ChainNode>
          </div>
        ))}
        <div className="py-2">
          <Button type="button" size="sm" variant="outline" onClick={addAction}>
            + Add action
          </Button>
        </div>
        <ChainArrow />
        <ChainNode title="Destinations" subtitle="Slack / webhook">
          <div className="space-y-2">
            <div>
              <Label className="text-xs">Slack webhook</Label>
              <Input
                className="mt-1"
                value={destinations.find((d) => d.type === "slack")?.webhookUrl ?? ""}
                onChange={(e) => {
                  const rest = destinations.filter((d) => d.type !== "slack");
                  setDestinations(
                    e.target.value ? [...rest, { type: "slack", webhookUrl: e.target.value }] : rest,
                  );
                }}
              />
            </div>
          </div>
        </ChainNode>
      </div>
    </Card>
  );
}

function ChainNode({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="border rounded-lg p-3 bg-muted/20">
      <p className="text-sm font-medium">{title}</p>
      {subtitle ? <p className="text-xs text-muted-foreground mb-2">{subtitle}</p> : null}
      {children}
    </div>
  );
}

function ChainArrow() {
  return <div className="flex justify-center py-1 text-muted-foreground text-xs">↓</div>;
}
