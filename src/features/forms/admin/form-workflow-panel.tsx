"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type {
  FormAutomationAction,
  FormAutomationRule,
  FormTemplateDefinition,
} from "@/features/forms/types";
import { MergeTagPicker } from "@/features/forms/admin/merge-tag-picker";

type Assignee = { id: string; name: string; email: string };

type Props = {
  definition: FormTemplateDefinition;
  assignees: Assignee[];
  onChange: (definition: FormTemplateDefinition) => void;
};

export function FormWorkflowPanel({ definition, assignees, onChange }: Props) {
  const pipeline = definition.pipeline ?? {};
  const routingRules = definition.routingRules ?? [];
  const destinations = definition.destinations ?? [];
  const automationRules = definition.automationRules ?? [];

  const patch = (patchDef: Partial<FormTemplateDefinition>) => {
    onChange({ ...definition, ...patchDef });
  };

  const leadSourceTag = (pipeline.defaultTags ?? []).find((t) => t.startsWith("source:"))?.replace(/^source:/, "") ?? "";

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="p-4 space-y-3">
        <h3 className="font-medium text-sm">CRM</h3>
        <div>
          <Label className="text-xs">Customer</Label>
          <Input
            className="mt-1"
            placeholder="Customer ID"
            value={pipeline.defaultCustomerId ?? ""}
            onChange={(e) =>
              patch({ pipeline: { ...pipeline, defaultCustomerId: e.target.value || undefined } })
            }
          />
        </div>
        <div>
          <Label className="text-xs">Company</Label>
          <Input
            className="mt-1"
            placeholder="Company ID"
            value={pipeline.defaultCompanyId ?? ""}
            onChange={(e) =>
              patch({ pipeline: { ...pipeline, defaultCompanyId: e.target.value || undefined } })
            }
          />
        </div>
        <div>
          <Label className="text-xs">Campaign</Label>
          <Input
            className="mt-1"
            placeholder="Campaign ID"
            value={pipeline.defaultCampaignId ?? ""}
            onChange={(e) =>
              patch({ pipeline: { ...pipeline, defaultCampaignId: e.target.value || undefined } })
            }
          />
        </div>
      </Card>

      <Card className="p-4 space-y-3">
        <h3 className="font-medium text-sm">Pipeline</h3>
        <div>
          <Label className="text-xs">Owner</Label>
          <select
            className="w-full border rounded-md h-10 px-2 text-sm mt-1"
            value={pipeline.defaultAssigneeId ?? ""}
            onChange={(e) =>
              patch({ pipeline: { ...pipeline, defaultAssigneeId: e.target.value || undefined } })
            }
          >
            <option value="">None</option>
            {assignees.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label className="text-xs">Stage</Label>
          <Input
            className="mt-1"
            placeholder="Pipeline type / stage"
            value={pipeline.pipelineType ?? ""}
            onChange={(e) =>
              patch({ pipeline: { ...pipeline, pipelineType: e.target.value || undefined } })
            }
          />
        </div>
        <div>
          <Label className="text-xs">Tags (comma-separated)</Label>
          <Input
            className="mt-1"
            value={(pipeline.defaultTags ?? []).filter((t) => !t.startsWith("source:")).join(", ")}
            onChange={(e) => {
              const tags = e.target.value
                .split(",")
                .map((t) => t.trim())
                .filter(Boolean);
              const source = leadSourceTag ? [`source:${leadSourceTag}`] : [];
              patch({ pipeline: { ...pipeline, defaultTags: [...tags, ...source] } });
            }}
          />
        </div>
        <div>
          <Label className="text-xs">Lead source</Label>
          <Input
            className="mt-1"
            value={leadSourceTag}
            onChange={(e) => {
              const base = (pipeline.defaultTags ?? []).filter((t) => !t.startsWith("source:"));
              const next = e.target.value.trim() ? [...base, `source:${e.target.value.trim()}`] : base;
              patch({ pipeline: { ...pipeline, defaultTags: next } });
            }}
          />
        </div>
      </Card>

      <Card className="p-4 space-y-3 lg:col-span-2">
        <h3 className="font-medium text-sm">Destinations</h3>
        <p className="text-xs text-muted-foreground">
          Slack and other integrations. Receiver emails are under Email Notifications.
        </p>
        <div>
          <Label className="text-xs">Slack webhook URL</Label>
          <Input
            className="mt-1"
            value={destinations.find((d) => d.type === "slack")?.webhookUrl ?? ""}
            onChange={(e) => {
              const rest = destinations.filter((d) => d.type !== "slack");
              patch({
                destinations: e.target.value
                  ? [...rest, { type: "slack", webhookUrl: e.target.value }]
                  : rest,
              });
            }}
          />
        </div>
        <MergeTagPicker
          onInsert={(token) => {
            void token;
            if (typeof navigator !== "undefined" && navigator.clipboard) {
              void navigator.clipboard.writeText(token);
            }
          }}
        />
        <p className="text-[10px] text-muted-foreground">Click a variable to copy it for Slack templates.</p>
      </Card>

      <Card className="p-4 space-y-3 lg:col-span-2">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-sm">Routing rules</h3>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() =>
              patch({
                routingRules: [
                  ...routingRules,
                  { id: `rule-${Date.now()}`, condition: "score >= 10", pipelineType: "priority" },
                ],
              })
            }
          >
            Add rule
          </Button>
        </div>
        {routingRules.map((rule, index) => (
          <div key={rule.id} className="grid gap-2 md:grid-cols-3 border rounded p-3">
            <Input
              placeholder='Condition e.g. country == "UAE"'
              value={rule.condition}
              onChange={(e) => {
                const next = [...routingRules];
                next[index] = { ...rule, condition: e.target.value };
                patch({ routingRules: next });
              }}
            />
            <Input
              placeholder="Stage / pipeline"
              value={rule.pipelineType ?? ""}
              onChange={(e) => {
                const next = [...routingRules];
                next[index] = { ...rule, pipelineType: e.target.value || undefined };
                patch({ routingRules: next });
              }}
            />
            <select
              className="border rounded h-10 px-2 text-sm"
              value={rule.assigneeId ?? ""}
              onChange={(e) => {
                const next = [...routingRules];
                next[index] = { ...rule, assigneeId: e.target.value || undefined };
                patch({ routingRules: next });
              }}
            >
              <option value="">Owner (optional)</option>
              {assignees.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
            <Input
              placeholder="Customer ID"
              value={rule.customerId ?? ""}
              onChange={(e) => {
                const next = [...routingRules];
                next[index] = { ...rule, customerId: e.target.value || undefined };
                patch({ routingRules: next });
              }}
            />
            <Input
              placeholder="Company ID"
              value={rule.companyId ?? ""}
              onChange={(e) => {
                const next = [...routingRules];
                next[index] = { ...rule, companyId: e.target.value || undefined };
                patch({ routingRules: next });
              }}
            />
            <Input
              placeholder="Campaign ID"
              value={rule.campaignId ?? ""}
              onChange={(e) => {
                const next = [...routingRules];
                next[index] = { ...rule, campaignId: e.target.value || undefined };
                patch({ routingRules: next });
              }}
            />
          </div>
        ))}
      </Card>

      <Card className="p-4 space-y-3 lg:col-span-2">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-sm">Automation rules</h3>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() =>
              patch({
                automationRules: [
                  ...automationRules,
                  {
                    id: `auto-${Date.now()}`,
                    event: "interaction.submitted",
                    condition: "",
                    actions: [{ type: "tag", tags: ["lead"] }],
                  },
                ],
              })
            }
          >
            Add rule
          </Button>
        </div>
        {automationRules.map((rule, index) => (
          <AutomationRuleEditor
            key={rule.id}
            rule={rule}
            assignees={assignees}
            onChange={(nextRule) => {
              const next = [...automationRules];
              next[index] = nextRule;
              patch({ automationRules: next });
            }}
            onRemove={() => patch({ automationRules: automationRules.filter((_, i) => i !== index) })}
          />
        ))}
      </Card>

      <Card className="p-4 space-y-3 lg:col-span-2">
        <h3 className="font-medium text-sm">Access control</h3>
        <Label className="text-xs">Allowed admin user IDs (comma-separated, empty = all admins)</Label>
        <Input
          className="mt-1"
          value={(definition.allowedAdminIds ?? []).join(", ")}
          onChange={(e) =>
            patch({
              allowedAdminIds: e.target.value
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean),
            })
          }
        />
      </Card>
    </div>
  );
}

function AutomationRuleEditor({
  rule,
  assignees,
  onChange,
  onRemove,
}: {
  rule: FormAutomationRule;
  assignees: Assignee[];
  onChange: (rule: FormAutomationRule) => void;
  onRemove: () => void;
}) {
  const action = rule.actions[0] as FormAutomationAction | undefined;
  const actionType = action?.type ?? "tag";

  const setAction = (next: FormAutomationAction) => {
    onChange({ ...rule, actions: [next] });
  };

  return (
    <div className="border rounded p-3 space-y-2">
      <div className="flex gap-2 items-end">
        <div className="flex-1">
          <Label className="text-xs">Condition (optional)</Label>
          <Input
            className="mt-1"
            placeholder='e.g. score >= 20'
            value={rule.condition ?? ""}
            onChange={(e) => onChange({ ...rule, condition: e.target.value || undefined })}
          />
        </div>
        <div>
          <Label className="text-xs">Action</Label>
          <select
            className="block border rounded-md h-10 px-2 text-sm mt-1"
            value={actionType}
            onChange={(e) => {
              const t = e.target.value as FormAutomationAction["type"];
              if (t === "tag") setAction({ type: "tag", tags: ["lead"] });
              if (t === "assign") setAction({ type: "assign", assigneeId: assignees[0]?.id ?? "" });
              if (t === "setPipeline") setAction({ type: "setPipeline", pipelineType: "qualified" });
              if (t === "notify") setAction({ type: "notify", emails: [] });
            }}
          >
            <option value="tag">Tag</option>
            <option value="assign">Assign</option>
            <option value="setPipeline">Set pipeline</option>
            <option value="notify">Notify</option>
          </select>
        </div>
        <Button type="button" size="sm" variant="ghost" onClick={onRemove}>
          Remove
        </Button>
      </div>
      {actionType === "tag" && (
        <Input
          placeholder="Tags (comma-separated)"
          value={action && action.type === "tag" ? action.tags.join(", ") : ""}
          onChange={(e) =>
            setAction({
              type: "tag",
              tags: e.target.value
                .split(",")
                .map((t) => t.trim())
                .filter(Boolean),
            })
          }
        />
      )}
      {actionType === "assign" && (
        <select
          className="border rounded h-10 px-2 text-sm w-full"
          value={action && action.type === "assign" ? action.assigneeId : ""}
          onChange={(e) => setAction({ type: "assign", assigneeId: e.target.value })}
        >
          {assignees.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      )}
      {actionType === "setPipeline" && (
        <Input
          placeholder="Pipeline type"
          value={action && action.type === "setPipeline" ? action.pipelineType : ""}
          onChange={(e) => setAction({ type: "setPipeline", pipelineType: e.target.value })}
        />
      )}
      {actionType === "notify" && (
        <div className="space-y-2">
          <Input
            placeholder="Emails (comma-separated)"
            value={action && action.type === "notify" ? action.emails.join(", ") : ""}
            onChange={(e) =>
              setAction({
                type: "notify",
                emails: e.target.value
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean),
              })
            }
          />
          <MergeTagPicker onInsert={(token) => void navigator.clipboard?.writeText(token)} />
        </div>
      )}
    </div>
  );
}
