"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MergeTagPicker } from "@/features/forms/admin/merge-tag-picker";
import {
  getFormEmailDeliveryStatusAction,
  sendFormNotificationTestAction,
} from "@/features/forms/actions";
import { listEmailAccountsAction } from "@/features/email/email-accounts.actions";
import type { EmailAccountPublic } from "@/features/email/email-accounts.types";
import { resolveReceiverEmails } from "@/features/forms/lib/resolve-receiver-emails";
import type {
  FormAutomationAction,
  FormAutomationRule,
  FormDestinationConfig,
  FormTemplateDefinition,
} from "@/features/forms/types";
import {
  ChevronDown,
  Plus,
  Slack,
  Webhook,
  Tag,
  UserPlus,
  GitBranch,
  Bell,
  Trash2,
  Mail,
} from "lucide-react";

const AUTOMATION_TABS = [
  { id: "trigger", label: "Trigger" },
  { id: "conditions", label: "Conditions" },
  { id: "actions", label: "Actions" },
  { id: "destinations", label: "Destinations" },
  { id: "crm", label: "CRM" },
  { id: "notifications", label: "Email Notifications" },
  { id: "routing", label: "Routing" },
  { id: "access", label: "Access control" },
] as const;

type Assignee = { id: string; name: string; email: string };

type EmailDeliveryStatus = {
  configured: boolean;
  provider: "resend" | "smtp" | "none";
  from: string;
  source?: "account" | "env" | "none";
  accountId?: string;
  accountName?: string;
  message?: string;
};

type Props = {
  definition: FormTemplateDefinition;
  assignees: Assignee[];
  templateName?: string;
  onChange: (definition: FormTemplateDefinition) => void;
};

export function AutomationFlowPanel({ definition, assignees, templateName, onChange }: Props) {
  const rules = definition.automationRules ?? [];
  const rule = rules[0];
  const destinations = definition.destinations ?? [];
  const pipeline = definition.pipeline ?? {};
  const routingRules = definition.routingRules ?? [];
  const notifications = definition.notifications ?? {
    receiverEmails: [],
    sendToSubmitter: false,
  };
  const webhooks = definition.webhooks ?? [];
  const receiverEmails = resolveReceiverEmails(definition);
  const accountId = notifications.accountId ?? "";

  const [emailStatus, setEmailStatus] = useState<EmailDeliveryStatus | null>(null);
  const [emailAccounts, setEmailAccounts] = useState<EmailAccountPublic[]>([]);
  const [testBusy, setTestBusy] = useState(false);
  const [testMessage, setTestMessage] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    void listEmailAccountsAction().then((res) => {
      if (cancelled || !res.success || !res.data) return;
      setEmailAccounts(res.data.accounts);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void getFormEmailDeliveryStatusAction(accountId || null).then((res) => {
      if (cancelled || !res.success || !res.data) return;
      setEmailStatus(res.data);
    });
    return () => {
      cancelled = true;
    };
  }, [accountId]);

  const patch = (patchDef: Partial<FormTemplateDefinition>) => {
    onChange({ ...definition, ...patchDef });
  };

  const patchNotifications = (next: {
    receiverEmails: string[];
    sendToSubmitter: boolean;
    accountId?: string;
  }) => {
    patch({
      notifications: {
        receiverEmails: next.receiverEmails,
        sendToSubmitter: next.sendToSubmitter,
        ...(next.accountId ? { accountId: next.accountId } : {}),
      },
    });
  };

  const patchRule = (next: FormAutomationRule | null) => {
    patch({
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
    const nextActions = [...current.actions];
    nextActions[index] = action;
    patchRule({ ...current, actions: nextActions });
  };

  const addAction = (type: FormAutomationAction["type"]) => {
    const current = ensureRule();
    let action: FormAutomationAction;
    if (type === "tag") action = { type: "tag", tags: ["lead"] };
    else if (type === "assign") action = { type: "assign", assigneeId: assignees[0]?.id ?? "" };
    else if (type === "setPipeline") action = { type: "setPipeline", pipelineType: "qualified" };
    else action = { type: "notify", emails: [] };
    patchRule({ ...current, actions: [...current.actions, action] });
  };

  const setDestinations = (next: FormDestinationConfig[]) => {
    patch({ destinations: next });
  };

  const leadSourceTag =
    (pipeline.defaultTags ?? []).find((t) => t.startsWith("source:"))?.replace(/^source:/, "") ?? "";

  const slackUrl = destinations.find((d) => d.type === "slack")?.webhookUrl ?? "";
  const webhookUrl = webhooks[0]?.url ?? "";

  const setReceiverAt = (index: number, value: string) => {
    const next = [...receiverEmails];
    next[index] = value;
    patchNotifications({
      receiverEmails: next,
      sendToSubmitter: notifications.sendToSubmitter ?? false,
      accountId: accountId || undefined,
    });
  };

  const addReceiver = () => {
    patchNotifications({
      receiverEmails: [...receiverEmails, ""],
      sendToSubmitter: notifications.sendToSubmitter ?? false,
      accountId: accountId || undefined,
    });
  };

  const removeReceiver = (index: number) => {
    patchNotifications({
      receiverEmails: receiverEmails.filter((_, i) => i !== index),
      sendToSubmitter: notifications.sendToSubmitter ?? false,
      accountId: accountId || undefined,
    });
  };

  const sendTestEmail = async () => {
    const emails = receiverEmails.map((e) => e.trim()).filter((e) => e.includes("@"));
    setTestBusy(true);
    setTestMessage(null);
    const res = await sendFormNotificationTestAction({
      emails,
      templateName,
      accountId: accountId || null,
    });
    setTestBusy(false);
    if (!res.success) {
      setTestMessage({ ok: false, text: res.error ?? "Email delivery failed." });
      return;
    }
    setTestMessage({ ok: true, text: "Test email sent. Check the inbox." });
  };

  return (
    <Tabs defaultValue="trigger" className="mx-auto w-full max-w-3xl">
      <TabsList className="h-auto w-full flex-wrap justify-start gap-1 rounded-lg bg-muted/50 p-1">
        {AUTOMATION_TABS.map((tab) => (
          <TabsTrigger key={tab.id} value={tab.id} className="text-xs sm:text-sm">
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value="trigger" className="mt-4 rounded-xl border bg-background p-4 shadow-sm">
        <p className="mb-1 text-sm font-semibold">Trigger</p>
        <p className="text-xs text-muted-foreground mb-3">When form submitted</p>
        <p className="text-sm text-muted-foreground">
          Runs on <code className="text-xs">interaction.submitted</code>
        </p>
      </TabsContent>

      <TabsContent value="conditions" className="mt-4 rounded-xl border bg-background p-4 shadow-sm">
        <p className="mb-1 text-sm font-semibold">Conditions</p>
        <p className="text-xs text-muted-foreground mb-3">
          {rule?.condition ? rule.condition : "Always"}
        </p>
        <Label className="text-xs">Condition expression</Label>
        <Input
          className="mt-1"
          placeholder='Optional e.g. score >= 20'
          value={rule?.condition ?? ""}
          onChange={(e) => {
            const current = ensureRule();
            patchRule({ ...current, condition: e.target.value || undefined });
          }}
        />
      </TabsContent>

      <TabsContent value="actions" className="mt-4 rounded-xl border bg-background p-4 shadow-sm">
        <p className="mb-1 text-sm font-semibold">Actions</p>
        <p className="text-xs text-muted-foreground mb-3">
          {actions.length} action{actions.length === 1 ? "" : "s"}
        </p>
        <div className="space-y-3">
          {actions.map((action, index) => (
            <ActionCard
              key={index}
              action={action}
              assignees={assignees}
              onChange={(next) => updateAction(index, next)}
              onRemove={() => {
                const current = ensureRule();
                patchRule({
                  ...current,
                  actions: current.actions.filter((_, i) => i !== index),
                });
              }}
            />
          ))}
          <AddActionMenu onAdd={addAction} />
        </div>
      </TabsContent>

      <TabsContent value="destinations" className="mt-4 rounded-xl border bg-background p-4 shadow-sm">
        <p className="mb-1 text-sm font-semibold">Destinations</p>
        <p className="text-xs text-muted-foreground mb-3">
          Third-party integrations. Form email copies are configured under Email Notifications.
        </p>
        <div className="space-y-2">
          <ConnectionCard
            icon={<Slack className="h-4 w-4" />}
            name="Slack"
            status={slackUrl ? "connected" : "disconnected"}
          >
            <Label className="text-xs">Webhook URL</Label>
            <Input
              className="mt-1"
              value={slackUrl}
              placeholder="https://hooks.slack.com/…"
              onChange={(e) => {
                const rest = destinations.filter((d) => d.type !== "slack");
                setDestinations(
                  e.target.value ? [...rest, { type: "slack", webhookUrl: e.target.value }] : rest,
                );
              }}
            />
          </ConnectionCard>
          <ConnectionCard
            icon={<Webhook className="h-4 w-4" />}
            name="Webhook"
            status={webhookUrl ? "connected" : "configure"}
          >
            <Label className="text-xs">Endpoint URL</Label>
            <Input
              className="mt-1"
              value={webhookUrl}
              placeholder="https://…"
              onChange={(e) =>
                patch({
                  webhooks: e.target.value ? [{ url: e.target.value, events: ["submit"] as const }] : [],
                })
              }
            />
          </ConnectionCard>
        </div>
      </TabsContent>

      <TabsContent value="crm" className="mt-4 rounded-xl border bg-background p-4 shadow-sm">
        <p className="mb-1 text-sm font-semibold">CRM</p>
        <p className="text-xs text-muted-foreground mb-3">Field mappings</p>
        <div className="space-y-3">
          <MappingRow
            label="Customer"
            value={pipeline.defaultCustomerId ?? ""}
            placeholder="Customer ID"
            onChange={(v) => patch({ pipeline: { ...pipeline, defaultCustomerId: v || undefined } })}
          />
          <MappingRow
            label="Company"
            value={pipeline.defaultCompanyId ?? ""}
            placeholder="Company ID"
            onChange={(v) => patch({ pipeline: { ...pipeline, defaultCompanyId: v || undefined } })}
          />
          <MappingRow
            label="Campaign"
            value={pipeline.defaultCampaignId ?? ""}
            placeholder="Campaign ID"
            onChange={(v) => patch({ pipeline: { ...pipeline, defaultCampaignId: v || undefined } })}
          />
          <div>
            <p className="mb-1 text-sm font-medium">Owner</p>
            <div className="rounded-xl border px-3 py-2">
              <select
                className="w-full bg-transparent text-sm outline-none"
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
          </div>
          <MappingRow
            label="Lead source"
            value={leadSourceTag}
            placeholder="Website"
            onChange={(v) => {
              const base = (pipeline.defaultTags ?? []).filter((t) => !t.startsWith("source:"));
              const next = v.trim() ? [...base, `source:${v.trim()}`] : base;
              patch({ pipeline: { ...pipeline, defaultTags: next } });
            }}
          />
          <MappingRow
            label="Stage"
            value={pipeline.pipelineType ?? ""}
            placeholder="Pipeline stage"
            onChange={(v) => patch({ pipeline: { ...pipeline, pipelineType: v || undefined } })}
          />
          <MappingRow
            label="Tags"
            value={(pipeline.defaultTags ?? []).filter((t) => !t.startsWith("source:")).join(", ")}
            placeholder="lead, inbound"
            onChange={(v) => {
              const tags = v
                .split(",")
                .map((t) => t.trim())
                .filter(Boolean);
              const source = leadSourceTag ? [`source:${leadSourceTag}`] : [];
              patch({ pipeline: { ...pipeline, defaultTags: [...tags, ...source] } });
            }}
          />
        </div>
      </TabsContent>

      <TabsContent value="notifications" className="mt-4 rounded-xl border bg-background p-4 shadow-sm">
        <div className="mb-3 flex items-start gap-2">
          <Mail className="mt-0.5 h-4 w-4 text-muted-foreground" />
          <div>
            <p className="mb-0.5 text-sm font-semibold">Email Notifications</p>
            <p className="text-xs text-muted-foreground">
              Receive a copy of every form submission. Choose an email account for this form (or use
              the site env fallback).
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Label className="text-xs">Email account</Label>
              <Link
                href="/admin/settings/email-accounts"
                className="text-xs text-muted-foreground underline"
              >
                Manage accounts
              </Link>
            </div>
            <select
              className="flex h-9 w-full rounded-md border bg-background px-3 text-sm"
              value={accountId}
              onChange={(e) =>
                patchNotifications({
                  receiverEmails,
                  sendToSubmitter: notifications.sendToSubmitter ?? false,
                  accountId: e.target.value || undefined,
                })
              }
            >
              <option value="">Site default (env RESEND / SMTP)</option>
              {emailAccounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.provider === "resend" ? "Resend" : "SMTP"})
                </option>
              ))}
            </select>
            {emailAccounts.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No accounts yet. Create one under Settings → Email Accounts.
              </p>
            )}
          </div>

          <div
            className={`rounded-xl border p-3 ${
              emailStatus?.configured ? "border-emerald-500/40 bg-emerald-500/5" : "border-amber-500/40 bg-amber-500/5"
            }`}
          >
            <p className="text-sm font-medium">
              {emailStatus == null
                ? "Email delivery"
                : emailStatus.configured
                  ? "Email configured"
                  : "Email not configured"}
            </p>
            {emailStatus && (
              <dl className="mt-2 space-y-1 text-xs text-muted-foreground">
                {emailStatus.accountName && (
                  <div className="flex gap-2">
                    <dt className="w-16 shrink-0">Account</dt>
                    <dd className="font-medium text-foreground">{emailStatus.accountName}</dd>
                  </div>
                )}
                <div className="flex gap-2">
                  <dt className="w-16 shrink-0">Provider</dt>
                  <dd className="font-medium text-foreground">
                    {emailStatus.provider === "none"
                      ? "None"
                      : emailStatus.provider === "resend"
                        ? "Resend"
                        : "SMTP"}
                    {emailStatus.source === "env" ? " (env)" : ""}
                  </dd>
                </div>
                <div className="flex gap-2">
                  <dt className="w-16 shrink-0">Status</dt>
                  <dd className="font-medium text-foreground">
                    {emailStatus.configured ? "Ready" : "Not configured"}
                  </dd>
                </div>
                {emailStatus.configured && (
                  <div className="flex gap-2">
                    <dt className="w-16 shrink-0">From</dt>
                    <dd className="font-medium text-foreground">{emailStatus.from}</dd>
                  </div>
                )}
                {!emailStatus.configured && (
                  <p className="pt-1">
                    {emailStatus.message ??
                      "Select an email account or configure one under Settings → Email Accounts."}
                  </p>
                )}
              </dl>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Receiver email(s)</Label>
            {(receiverEmails.length ? receiverEmails : [""]).map((email, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  type="email"
                  value={email}
                  placeholder="sales@example.com"
                  onChange={(e) => {
                    if (!receiverEmails.length && index === 0) {
                      patchNotifications({
                        receiverEmails: [e.target.value],
                        sendToSubmitter: notifications.sendToSubmitter ?? false,
                        accountId: accountId || undefined,
                      });
                      return;
                    }
                    setReceiverAt(index, e.target.value);
                  }}
                />
                {receiverEmails.length > 1 && (
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    onClick={() => removeReceiver(index)}
                    aria-label="Remove receiver"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" variant="outline" onClick={addReceiver}>
                <Plus className="mr-1 h-3.5 w-3.5" />
                Add another
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={testBusy || !receiverEmails.some((e) => e.includes("@"))}
                onClick={() => void sendTestEmail()}
              >
                {testBusy ? "Sending…" : "Send Test Email"}
              </Button>
            </div>
            {testMessage && (
              <p
                className={`text-xs ${testMessage.ok ? "text-emerald-700 dark:text-emerald-400" : "text-destructive"}`}
              >
                {testMessage.text}
              </p>
            )}
          </div>

          <label className="flex items-start gap-2 rounded-xl border p-3 text-sm">
            <input
              type="checkbox"
              className="mt-1"
              checked={notifications.sendToSubmitter ?? false}
              onChange={(e) =>
                patchNotifications({
                  receiverEmails,
                  sendToSubmitter: e.target.checked,
                  accountId: accountId || undefined,
                })
              }
            />
            <span>
              <span className="font-medium">Send confirmation to visitor</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                Email field: Visitor Email (<code className="text-[10px]">email</code>)
              </span>
            </span>
          </label>
        </div>
      </TabsContent>

      <TabsContent value="routing" className="mt-4 rounded-xl border bg-background p-4 shadow-sm">
        <p className="mb-1 text-sm font-semibold">Routing</p>
        <p className="text-xs text-muted-foreground mb-3">
          {routingRules.length} rule{routingRules.length === 1 ? "" : "s"}
        </p>
        <div className="space-y-3">
          {routingRules.map((r, index) => (
            <div key={r.id} className="rounded-xl border p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 space-y-2">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      If
                    </p>
                    <Input
                      className="mt-1"
                      placeholder='country == "UAE"'
                      value={r.condition}
                      onChange={(e) => {
                        const next = [...routingRules];
                        next[index] = { ...r, condition: e.target.value };
                        patch({ routingRules: next });
                      }}
                    />
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Then
                    </p>
                    <select
                      className="mt-1 w-full rounded-md border h-9 px-2 text-sm"
                      value={r.assigneeId ?? ""}
                      onChange={(e) => {
                        const next = [...routingRules];
                        next[index] = { ...r, assigneeId: e.target.value || undefined };
                        patch({ routingRules: next });
                      }}
                    >
                      <option value="">Assign owner…</option>
                      {assignees.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))}
                    </select>
                    <Input
                      className="mt-2"
                      placeholder="Stage / pipeline"
                      value={r.pipelineType ?? ""}
                      onChange={(e) => {
                        const next = [...routingRules];
                        next[index] = { ...r, pipelineType: e.target.value || undefined };
                        patch({ routingRules: next });
                      }}
                    />
                  </div>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    patch({ routingRules: routingRules.filter((_, i) => i !== index) })
                  }
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
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
            <Plus className="h-3.5 w-3.5 me-1" />
            Add routing rule
          </Button>
        </div>
      </TabsContent>

      <TabsContent value="access" className="mt-4 rounded-xl border bg-background p-4 shadow-sm">
        <p className="mb-1 text-sm font-semibold">Access control</p>
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
      </TabsContent>
    </Tabs>
  );
}

function MappingRow({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <p className="mb-1 text-sm font-medium">{label}</p>
      <div className="rounded-xl border px-3 py-2">
        <Input
          className="h-8 border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </div>
  );
}

function ConnectionCard({
  icon,
  name,
  status,
  children,
}: {
  icon: React.ReactNode;
  name: string;
  status: "connected" | "disconnected" | "configure";
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(status !== "connected");
  return (
    <div className="rounded-xl border">
      <button
        type="button"
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="text-muted-foreground">{icon}</span>
        <span className="flex-1 text-sm font-medium">{name}</span>
        <Badge
          variant={status === "connected" ? "default" : status === "configure" ? "outline" : "secondary"}
          className="text-[10px]"
        >
          {status === "connected" ? "Connected" : status === "configure" ? "Configure" : "Disconnected"}
        </Badge>
        <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground ${open ? "" : "-rotate-90"}`} />
      </button>
      {open ? <div className="border-t px-3 py-2.5">{children}</div> : null}
    </div>
  );
}

function ActionCard({
  action,
  assignees,
  onChange,
  onRemove,
}: {
  action: FormAutomationAction;
  assignees: Assignee[];
  onChange: (action: FormAutomationAction) => void;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(true);
  const meta = actionMeta(action);
  return (
    <div className="rounded-xl border">
      <button
        type="button"
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="text-muted-foreground">{meta.icon}</span>
        <span className="flex-1 text-sm font-medium">{meta.title}</span>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
        <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground ${open ? "" : "-rotate-90"}`} />
      </button>
      {open ? (
        <div className="space-y-2 border-t px-3 py-2.5">
          <select
            className="w-full rounded-md border h-9 px-2 text-sm"
            value={action.type}
            onChange={(e) => {
              const t = e.target.value as FormAutomationAction["type"];
              if (t === "tag") onChange({ type: "tag", tags: ["lead"] });
              if (t === "assign") onChange({ type: "assign", assigneeId: assignees[0]?.id ?? "" });
              if (t === "setPipeline") onChange({ type: "setPipeline", pipelineType: "qualified" });
              if (t === "notify") onChange({ type: "notify", emails: [] });
            }}
          >
            <option value="tag">Tag contact</option>
            <option value="assign">Assign owner</option>
            <option value="setPipeline">Set pipeline</option>
            <option value="notify">Notify</option>
          </select>
          {action.type === "tag" && (
            <Input
              value={action.tags.join(", ")}
              onChange={(e) =>
                onChange({
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
              className="w-full rounded-md border h-9 px-2 text-sm"
              value={action.assigneeId}
              onChange={(e) => onChange({ type: "assign", assigneeId: e.target.value })}
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
              onChange={(e) => onChange({ type: "setPipeline", pipelineType: e.target.value })}
            />
          )}
          {action.type === "notify" && (
            <div className="space-y-2">
              <Input
                placeholder="Emails"
                value={action.emails.join(", ")}
                onChange={(e) =>
                  onChange({
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
      ) : null}
    </div>
  );
}

function actionMeta(action: FormAutomationAction) {
  if (action.type === "tag")
    return { title: "Tag contact", icon: <Tag className="h-4 w-4" /> };
  if (action.type === "assign")
    return { title: "Assign owner", icon: <UserPlus className="h-4 w-4" /> };
  if (action.type === "setPipeline")
    return { title: "Set pipeline", icon: <GitBranch className="h-4 w-4" /> };
  return { title: "Notify", icon: <Bell className="h-4 w-4" /> };
}

function AddActionMenu({ onAdd }: { onAdd: (type: FormAutomationAction["type"]) => void }) {
  const [open, setOpen] = useState(false);
  const items: Array<{ type: FormAutomationAction["type"]; label: string; icon: React.ReactNode }> = [
    { type: "tag", label: "Tag contact", icon: <Tag className="h-3.5 w-3.5" /> },
    { type: "assign", label: "Assign owner", icon: <UserPlus className="h-3.5 w-3.5" /> },
    { type: "setPipeline", label: "Set pipeline", icon: <GitBranch className="h-3.5 w-3.5" /> },
    { type: "notify", label: "Notify", icon: <Bell className="h-3.5 w-3.5" /> },
  ];
  return (
    <div className="relative">
      <Button type="button" size="sm" variant="outline" onClick={() => setOpen((v) => !v)}>
        <Plus className="h-3.5 w-3.5 me-1" />
        Add action
      </Button>
      {open ? (
        <div className="absolute z-20 mt-1 w-48 rounded-xl border bg-background p-1 shadow-lg">
          {items.map((item) => (
            <button
              key={item.type}
              type="button"
              className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-muted"
              onClick={() => {
                onAdd(item.type);
                setOpen(false);
              }}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
