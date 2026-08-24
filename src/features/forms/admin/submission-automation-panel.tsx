import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { FormTemplateDefinition } from "@/features/forms/types";
import { resolveReceiverEmails } from "@/features/forms/lib/resolve-receiver-emails";

export function SubmissionAutomationPanel({
  definition,
  accountName,
}: {
  definition: FormTemplateDefinition | null | undefined;
  accountName?: string | null;
}) {
  if (!definition) {
    return (
      <Card className="p-4">
        <h3 className="font-medium text-sm">Automation</h3>
        <p className="mt-2 text-xs text-muted-foreground">No form definition available.</p>
      </Card>
    );
  }

  const notifications = definition.notifications;
  const receivers = resolveReceiverEmails(definition);
  const destinations = (definition.destinations ?? []).filter((d) => d.type !== "email");
  const rules = definition.automationRules ?? [];
  const webhooks = definition.webhooks ?? [];
  const pipeline = definition.pipeline;

  return (
    <Card className="p-4 space-y-3">
      <h3 className="font-medium text-sm">Automation</h3>

      <section className="space-y-1">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Email notifications
        </p>
        <dl className="text-xs space-y-1 text-muted-foreground">
          <div className="flex justify-between gap-2">
            <dt>Account</dt>
            <dd className="text-foreground text-right">
              {accountName
                ? accountName
                : notifications?.accountId
                  ? (
                      <code className="text-[10px]">{notifications.accountId.slice(0, 8)}…</code>
                    )
                  : "Site default (env)"}
            </dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt>Receivers</dt>
            <dd className="text-foreground text-right max-w-[60%] break-all">
              {receivers.length ? receivers.join(", ") : "—"}
            </dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt>Visitor auto-reply</dt>
            <dd className="text-foreground">
              {notifications?.sendToSubmitter ? "On" : "Off"}
            </dd>
          </div>
        </dl>
      </section>

      {pipeline && (pipeline.pipelineType || pipeline.defaultAssigneeId || pipeline.defaultTags?.length) && (
        <section className="space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            CRM / pipeline
          </p>
          <dl className="text-xs space-y-1 text-muted-foreground">
            {pipeline.pipelineType && (
              <div className="flex justify-between gap-2">
                <dt>Pipeline</dt>
                <dd className="text-foreground">{pipeline.pipelineType}</dd>
              </div>
            )}
            {pipeline.defaultAssigneeId && (
              <div className="flex justify-between gap-2">
                <dt>Default assignee</dt>
                <dd className="text-foreground truncate max-w-[60%]">{pipeline.defaultAssigneeId}</dd>
              </div>
            )}
            {!!pipeline.defaultTags?.length && (
              <div className="flex flex-wrap gap-1 pt-1">
                {pipeline.defaultTags.map((t) => (
                  <Badge key={t} variant="secondary" className="text-[10px]">
                    {t}
                  </Badge>
                ))}
              </div>
            )}
          </dl>
        </section>
      )}

      {destinations.length > 0 && (
        <section className="space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Destinations
          </p>
          <ul className="text-xs space-y-1">
            {destinations.map((d, i) => (
              <li key={i} className="text-muted-foreground">
                <span className="font-medium text-foreground uppercase">{d.type}</span>
                {d.type === "slack" && d.webhookUrl
                  ? ` · ${d.webhookUrl.replace(/^https?:\/\//, "").slice(0, 40)}…`
                  : null}
              </li>
            ))}
          </ul>
        </section>
      )}

      {webhooks.length > 0 && (
        <section className="space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Webhooks
          </p>
          <ul className="text-xs space-y-1 text-muted-foreground">
            {webhooks.map((w, i) => (
              <li key={i} className="truncate">
                {w.url}
              </li>
            ))}
          </ul>
        </section>
      )}

      {rules.length > 0 && (
        <section className="space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Automation rules
          </p>
          {rules.map((rule) => (
            <div key={rule.id} className="rounded-lg border p-2 text-xs space-y-1">
              <p className="text-muted-foreground">
                On <code className="text-[10px]">{rule.event}</code>
                {rule.condition ? (
                  <>
                    {" "}
                    if <code className="text-[10px]">{rule.condition}</code>
                  </>
                ) : (
                  " (always)"
                )}
              </p>
              <div className="flex flex-wrap gap-1">
                {rule.actions.map((action, idx) => (
                  <Badge key={idx} variant="outline" className="text-[10px]">
                    {action.type}
                    {action.type === "tag" && action.tags?.length
                      ? `: ${action.tags.join(", ")}`
                      : ""}
                    {action.type === "setPipeline" ? `: ${action.pipelineType}` : ""}
                    {action.type === "notify" && action.emails?.length
                      ? `: ${action.emails.join(", ")}`
                      : ""}
                  </Badge>
                ))}
                {rule.actions.length === 0 && (
                  <span className="text-muted-foreground">No actions</span>
                )}
              </div>
            </div>
          ))}
        </section>
      )}

      {!receivers.length &&
        !destinations.length &&
        !webhooks.length &&
        !rules.length &&
        !pipeline?.pipelineType && (
          <p className="text-xs text-muted-foreground">
            No automation configured on this form yet.
          </p>
        )}
    </Card>
  );
}
