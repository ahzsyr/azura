"use client";

import { useMemo, useState, useTransition } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  acknowledgeOwnershipExceptionAction,
  deletePageSearchTargetAction,
  retirePageSearchTargetAction,
  upsertPageSearchTargetAction,
  updatePriorityEntitiesAction,
} from "./actions";
import type { OwnershipFinding } from "./ownership-findings";
import type {
  PageSearchTarget,
  PageTargetEntityRef,
  PageTargetSiteConfig,
  SearchIntent,
} from "./page-search-target";
import { PAGE_TARGET_ENTITY_TYPES, SEARCH_INTENTS } from "./page-search-target";

type LocaleOption = { code: string; label: string; isDefault: boolean };

type Props = {
  siteKey: string;
  locales: LocaleOption[];
  config: PageTargetSiteConfig;
  ownershipFindings: OwnershipFinding[];
  unassignedByLocale: Record<string, PageTargetEntityRef[]>;
};

export function PageTargetsPanel({
  siteKey,
  locales,
  config,
  ownershipFindings,
  unassignedByLocale,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [entityType, setEntityType] = useState<string>("pageKey");
  const [entityId, setEntityId] = useState("home");
  const [locale, setLocale] = useState(locales.find((l) => l.isDefault)?.code ?? locales[0]?.code ?? "en");
  const [primaryTopic, setPrimaryTopic] = useState("");
  const [supporting, setSupporting] = useState("");
  const [intent, setIntent] = useState<SearchIntent>("informational");
  const [priorityText, setPriorityText] = useState("");
  const [exceptionReason, setExceptionReason] = useState("Intentional overlap reviewed");
  const [priorityDraft, setPriorityDraft] = useState(
    config.priorityEntities.map((e) => `${e.type}:${e.id}`).join("\n"),
  );

  const openFindings = useMemo(
    () => ownershipFindings.filter((f) => f.status === "open"),
    [ownershipFindings],
  );

  function run(label: string, fn: () => Promise<unknown>) {
    setMessage(null);
    startTransition(async () => {
      try {
        const result = await fn();
        if (result && typeof result === "object" && "ok" in result && (result as { ok: boolean }).ok === false) {
          const errors = (result as { errors?: Array<{ message: string }>; message?: string }).errors;
          setMessage(errors?.map((e) => e.message).join("; ") ?? (result as { message?: string }).message ?? "Failed");
          return;
        }
        setMessage(label);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Request failed");
      }
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Page search targets</CardTitle>
          <CardDescription>
            Site-scoped planning ({siteKey}). Assigns primary topic and intent without changing public{" "}
            <code className="text-xs">&lt;head&gt;</code> metadata.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="entityType">Entity type</Label>
              <select
                id="entityType"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                value={entityType}
                onChange={(e) => setEntityType(e.target.value)}
              >
                {PAGE_TARGET_ENTITY_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="entityId">Entity id</Label>
              <Input id="entityId" value={entityId} onChange={(e) => setEntityId(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="locale">Locale</Label>
              <select
                id="locale"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                value={locale}
                onChange={(e) => setLocale(e.target.value)}
              >
                {locales.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.label} ({l.code})
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="primaryTopic">Primary topic</Label>
              <Input
                id="primaryTopic"
                value={primaryTopic}
                onChange={(e) => setPrimaryTopic(e.target.value)}
                placeholder="wireless networking UAE"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="intent">Intent</Label>
              <select
                id="intent"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                value={intent}
                onChange={(e) => setIntent(e.target.value as SearchIntent)}
              >
                {SEARCH_INTENTS.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="supporting">Supporting topics (comma-separated, max 5)</Label>
              <Input
                id="supporting"
                value={supporting}
                onChange={(e) => setSupporting(e.target.value)}
                placeholder="access points, Wi‑Fi 6"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="priority">Priority (optional)</Label>
              <Input
                id="priority"
                value={priorityText}
                onChange={(e) => setPriorityText(e.target.value)}
                placeholder="10"
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              disabled={pending}
              onClick={() =>
                run("Target saved", () =>
                  upsertPageSearchTargetAction({
                    entityType,
                    entityId,
                    locale,
                    primaryTopic,
                    supportingTopics: supporting
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean),
                    intent,
                    status: "active",
                    priority: priorityText.trim() ? Number(priorityText) : undefined,
                  }),
                )
              }
            >
              Save active target
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={pending}
              onClick={() =>
                run("Draft saved", () =>
                  upsertPageSearchTargetAction({
                    entityType,
                    entityId,
                    locale,
                    primaryTopic,
                    supportingTopics: supporting
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean),
                    intent,
                    status: "draft",
                    priority: priorityText.trim() ? Number(priorityText) : undefined,
                  }),
                )
              }
            >
              Save as draft
            </Button>
          </div>
          {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Assigned targets</CardTitle>
            <CardDescription>Lifecycle is independent of page publication.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {config.targets.length === 0 ? (
              <p className="text-muted-foreground">No targets yet.</p>
            ) : (
              config.targets.map((target) => (
                <TargetRow
                  key={target.id}
                  target={target}
                  pending={pending}
                  onRetire={() => run("Target retired", () => retirePageSearchTargetAction(target.id))}
                  onDelete={() => run("Target deleted", () => deletePageSearchTargetAction(target.id))}
                />
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ownership review</CardTitle>
            <CardDescription>
              Possible topic overlaps for review — not write blockers.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {ownershipFindings.length === 0 ? (
              <p className="text-muted-foreground">No overlapping primary topics.</p>
            ) : (
              ownershipFindings.map((finding) => (
                <div key={finding.id} className="rounded-lg border p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium">{finding.primaryTopicSample}</p>
                    <span className="text-xs uppercase tracking-wide text-muted-foreground">
                      {finding.status}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {finding.locale} · {finding.targets.length} targets · {finding.normalizedTopic}
                  </p>
                  <ul className="text-xs font-mono text-muted-foreground space-y-0.5">
                    {finding.targets.map((t) => (
                      <li key={t.id}>
                        {t.entity.type}:{t.entity.id}
                      </li>
                    ))}
                  </ul>
                  {finding.status === "open" ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={pending}
                      onClick={() =>
                        run("Exception saved", () =>
                          acknowledgeOwnershipExceptionAction({
                            locale: finding.locale,
                            normalizedTopic: finding.normalizedTopic,
                            entityIds: finding.targets.map((t) => t.entity),
                            reason: exceptionReason,
                          }),
                        )
                      }
                    >
                      Acknowledge with reason
                    </Button>
                  ) : null}
                </div>
              ))
            )}
            {openFindings.length > 0 ? (
              <div className="space-y-1.5">
                <Label htmlFor="exceptionReason">Exception reason</Label>
                <Input
                  id="exceptionReason"
                  value={exceptionReason}
                  onChange={(e) => setExceptionReason(e.target.value)}
                />
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Unassigned priority entities</CardTitle>
            <CardDescription>
              From site priority list (seeded from priority indexable page keys).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {locales.map((l) => {
              const rows = unassignedByLocale[l.code] ?? [];
              return (
                <div key={l.code}>
                  <p className="font-medium">{l.label}</p>
                  {rows.length === 0 ? (
                    <p className="text-xs text-muted-foreground">All priority entities have a target.</p>
                  ) : (
                    <ul className="mt-1 font-mono text-xs text-muted-foreground space-y-0.5">
                      {rows.slice(0, 12).map((ref) => (
                        <li key={`${l.code}-${ref.type}-${ref.id}`}>
                          {ref.type}:{ref.id}
                        </li>
                      ))}
                      {rows.length > 12 ? (
                        <li>+{rows.length - 12} more</li>
                      ) : null}
                    </ul>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Priority entities</CardTitle>
            <CardDescription>One `type:id` per line. Defines the unassigned pool.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <textarea
              className="min-h-40 w-full rounded-md border border-input bg-transparent px-3 py-2 font-mono text-xs"
              value={priorityDraft}
              onChange={(e) => setPriorityDraft(e.target.value)}
            />
            <Button
              type="button"
              disabled={pending}
              onClick={() => {
                const entities = priorityDraft
                  .split("\n")
                  .map((line) => line.trim())
                  .filter(Boolean)
                  .map((line) => {
                    const idx = line.indexOf(":");
                    if (idx <= 0) return null;
                    return {
                      type: line.slice(0, idx).trim(),
                      id: line.slice(idx + 1).trim(),
                    };
                  })
                  .filter(Boolean) as PageTargetEntityRef[];
                run("Priority list updated", () => updatePriorityEntitiesAction(entities));
              }}
            >
              Save priority list
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function TargetRow({
  target,
  pending,
  onRetire,
  onDelete,
}: {
  target: PageSearchTarget;
  pending: boolean;
  onRetire: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="rounded-lg border p-3 space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium">{target.primaryTopic}</p>
          <p className="text-xs text-muted-foreground">
            {target.entity.type}:{target.entity.id} · {target.locale} · {target.intent} ·{" "}
            {target.status}
            {typeof target.priority === "number" ? ` · p${target.priority}` : ""}
          </p>
          {target.supportingTopics.length > 0 ? (
            <p className="mt-1 text-xs text-muted-foreground">
              Supporting: {target.supportingTopics.join(", ")}
            </p>
          ) : null}
        </div>
        <div className="flex gap-1">
          {target.status !== "retired" ? (
            <Button type="button" size="sm" variant="outline" disabled={pending} onClick={onRetire}>
              Retire
            </Button>
          ) : null}
          <Button type="button" size="sm" variant="ghost" disabled={pending} onClick={onDelete}>
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}
