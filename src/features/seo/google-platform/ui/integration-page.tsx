"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type {
  GoogleConnectionSnapshot,
  GoogleHistoryEntry,
  GoogleIntegrationCapabilities,
  GoogleConfigurationSchema,
  GoogleMonitoringSnapshot,
  GoogleOperationalPolicy,
  GoogleOperationDefinition,
  GoogleServiceConfigMap,
  GoogleIntegrationId,
  GoogleDependency,
} from "../types";
import {
  disconnectGoogleIntegrationAction,
  runGoogleOperationAction,
  testGoogleIntegrationAction,
  upsertGoogleServiceConfigAction,
  upsertGoogleServicePolicyAction,
  type GooglePlatformActionResult,
} from "../actions";

type SerializableDefinition = {
  id: GoogleIntegrationId;
  displayName: string;
  icon: string;
  category: string;
  description: string;
  requiredScopes: string[];
  capabilities: GoogleIntegrationCapabilities;
  operations: GoogleOperationDefinition[];
  configurationSchema: GoogleConfigurationSchema;
  defaultPolicy: GoogleOperationalPolicy;
  dependencies: GoogleDependency[];
  contractVersion: number;
  schemaVersion: number;
  migrationVersion: number;
  connectorId?: string;
  tabId: string;
};

type IntegrationPageProps = {
  definition: SerializableDefinition;
  sections: string[];
  connection: GoogleConnectionSnapshot;
  configuration: GoogleServiceConfigMap;
  policy: GoogleOperationalPolicy;
  monitoring: GoogleMonitoringSnapshot;
  history: GoogleHistoryEntry[];
  dependencyMessage?: string;
  canStartOAuth?: boolean;
};

function ActionStatus({ state }: { state: GooglePlatformActionResult | null }) {
  if (!state) return null;
  const data = state.data;
  const detail =
    data && typeof data.performanceScore === "number"
      ? ` · Perf ${data.performanceScore}${
          typeof data.lcpMs === "number" ? ` · LCP ${(Number(data.lcpMs) / 1000).toFixed(1)}s` : ""
        }`
      : data && typeof data.urlCount === "number"
        ? ` · ${data.urlCount} URLs`
        : data && typeof data.indexed === "boolean"
          ? ` · ${data.indexed ? "Indexed" : "Not indexed"}`
          : "";
  return (
    <p
      className={`text-sm ${state.ok ? "text-emerald-700 dark:text-emerald-300" : "text-destructive"}`}
      role="status"
    >
      {state.message}
      {detail}
    </p>
  );
}

function fieldValue(configuration: GoogleServiceConfigMap, key: string): string {
  const value = configuration[key];
  if (value == null) return "";
  if (typeof value === "boolean") return value ? "true" : "false";
  return String(value);
}

export function GoogleIntegrationPage({
  definition,
  sections,
  connection,
  configuration,
  policy,
  monitoring,
  history,
  dependencyMessage,
  canStartOAuth,
}: IntegrationPageProps) {
  const [configState, configAction, configPending] = useActionState(
    upsertGoogleServiceConfigAction,
    null,
  );
  const [policyState, policyAction, policyPending] = useActionState(
    upsertGoogleServicePolicyAction,
    null,
  );
  const [testState, testAction, testPending] = useActionState(testGoogleIntegrationAction, null);
  const [opState, opAction, opPending] = useActionState(runGoogleOperationAction, null);
  const [disconnectState, disconnectAction, disconnectPending] = useActionState(
    disconnectGoogleIntegrationAction,
    null,
  );

  const groups = Array.from(
    new Set(definition.configurationSchema.fields.map((f) => f.group ?? "General")),
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">{definition.displayName}</h2>
        <p className="text-sm text-muted-foreground">{definition.description}</p>
        {dependencyMessage ? (
          <p className="mt-2 text-sm text-amber-700 dark:text-amber-300">{dependencyMessage}</p>
        ) : null}
      </div>

      {sections.includes("connection") ? (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <CardTitle className="text-base">Connection</CardTitle>
                <CardDescription>Status, account, scopes, and connection actions.</CardDescription>
              </div>
              <Badge
                className={
                  connection.state === "connected"
                    ? "bg-emerald-600 text-white border-transparent"
                    : connection.state === "error"
                      ? "bg-destructive text-destructive-foreground border-transparent"
                      : ""
                }
                variant={connection.state === "connected" || connection.state === "error" ? undefined : "outline"}
              >
                {connection.state}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <span className="text-muted-foreground">Last verified</span>
                <div>{connection.lastVerifiedAt ? new Date(connection.lastVerifiedAt).toLocaleString() : "—"}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Account</span>
                <div>{connection.account || "—"}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Project</span>
                <div>{connection.project || "—"}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Auth method</span>
                <div>{connection.authMethod || "none"}</div>
              </div>
            </div>
            <div>
              <span className="text-muted-foreground">OAuth scopes</span>
              <div className="mt-1 flex flex-wrap gap-1">
                {definition.requiredScopes.length === 0 ? (
                  <Badge variant="outline">No OAuth scopes required</Badge>
                ) : (
                  definition.requiredScopes.map((scope) => {
                    const granted = connection.grantedScopes.includes(scope);
                    return (
                      <Badge
                        key={scope}
                        variant={granted ? undefined : "outline"}
                        className={granted ? "bg-emerald-600 text-white border-transparent" : ""}
                      >
                        {scope.replace("https://www.googleapis.com/auth/", "")}
                      </Badge>
                    );
                  })
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              {definition.capabilities.supportsOAuth && canStartOAuth ? (
                <Button asChild size="sm">
                  <Link href={`/api/seo/analytics/google/oauth/start?integration=${definition.id}`}>
                    {connection.state === "connected" ? "Reconnect" : "Connect"}
                  </Link>
                </Button>
              ) : null}
              <form action={testAction}>
                <input type="hidden" name="integrationId" value={definition.id} />
                <Button type="submit" size="sm" variant="outline" disabled={testPending}>
                  Test Connection
                </Button>
              </form>
              <form action={disconnectAction}>
                <input type="hidden" name="integrationId" value={definition.id} />
                <Button type="submit" size="sm" variant="ghost" disabled={disconnectPending}>
                  Disconnect
                </Button>
              </form>
            </div>
            <ActionStatus state={testState} />
            <ActionStatus state={disconnectState} />
          </CardContent>
        </Card>
      ) : null}

      {sections.includes("configuration") ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Configuration</CardTitle>
            <CardDescription>Service-specific settings (rarely changed).</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={configAction} className="space-y-5">
              <input type="hidden" name="integrationId" value={definition.id} />
              {groups.map((group) => (
                <div key={group} className="space-y-3">
                  <h3 className="text-sm font-medium">{group}</h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {definition.configurationSchema.fields
                      .filter((f) => (f.group ?? "General") === group)
                      .map((field) => {
                        const name = `config.${field.key}`;
                        const value = fieldValue(configuration, field.key);
                        if (field.type === "boolean") {
                          return (
                            <label key={field.key} className="flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                name={name}
                                value="true"
                                defaultChecked={value === "true"}
                              />
                              {field.label}
                            </label>
                          );
                        }
                        if (field.type === "textarea" || field.type === "json") {
                          return (
                            <div key={field.key} className="sm:col-span-2 space-y-1">
                              <Label htmlFor={name}>{field.label}</Label>
                              <Textarea
                                id={name}
                                name={name}
                                defaultValue={field.type === "json" ? "" : value}
                                placeholder={
                                  field.type === "json"
                                    ? value
                                      ? "•••• saved — leave blank to keep"
                                      : field.placeholder
                                    : field.placeholder
                                }
                                rows={4}
                              />
                            </div>
                          );
                        }
                        if (field.type === "select") {
                          return (
                            <div key={field.key} className="space-y-1">
                              <Label htmlFor={name}>{field.label}</Label>
                              <select
                                id={name}
                                name={name}
                                defaultValue={value}
                                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                              >
                                <option value="">Select…</option>
                                {(field.options ?? []).map((opt) => (
                                  <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                          );
                        }
                        return (
                          <div key={field.key} className="space-y-1">
                            <Label htmlFor={name}>{field.label}</Label>
                            <Input
                              id={name}
                              name={name}
                              type={field.type === "number" ? "number" : field.type === "secret" ? "password" : "text"}
                              defaultValue={field.type === "secret" ? "" : value}
                              placeholder={
                                field.type === "secret"
                                  ? configuration[`has_${field.key}`]
                                    ? "•••• saved — leave blank to keep"
                                    : field.placeholder
                                  : field.placeholder
                              }
                            />
                          </div>
                        );
                      })}
                  </div>
                </div>
              ))}
              <Button type="submit" disabled={configPending}>
                Save configuration
              </Button>
              <ActionStatus state={configState} />
            </form>
          </CardContent>
        </Card>
      ) : null}

      {sections.includes("operational_policy") ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Operational Policy</CardTitle>
            <CardDescription>Cadence, retries, workers, and runtime controls.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={policyAction} className="grid gap-3 sm:grid-cols-2">
              <input type="hidden" name="integrationId" value={definition.id} />
              {[
                ["cadenceMinutes", "Cadence (minutes)", policy.cadenceMinutes],
                ["retryCount", "Retry count", policy.retryCount],
                ["retryBackoffMs", "Retry backoff (ms)", policy.retryBackoffMs],
                ["timeoutMs", "Timeout (ms)", policy.timeoutMs],
                ["parallelRequests", "Parallel requests", policy.parallelRequests],
                ["rateLimitPerMinute", "Rate limit / minute", policy.rateLimitPerMinute ?? 60],
              ].map(([name, label, value]) => (
                <div key={String(name)} className="space-y-1">
                  <Label htmlFor={String(name)}>{label}</Label>
                  <Input
                    id={String(name)}
                    name={String(name)}
                    type="number"
                    defaultValue={Number(value)}
                  />
                </div>
              ))}
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="workerEnabled" value="true" defaultChecked={policy.workerEnabled} />
                Worker enabled
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="dryRunDefault" value="true" defaultChecked={policy.dryRunDefault} />
                Dry-run by default
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="notificationOnFailure"
                  value="true"
                  defaultChecked={policy.notificationOnFailure}
                />
                Notify on failure
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="notificationOnQuotaWarning"
                  value="true"
                  defaultChecked={policy.notificationOnQuotaWarning}
                />
                Notify on quota warning
              </label>
              <div className="space-y-1">
                <Label htmlFor="errorRecovery">Error recovery</Label>
                <select
                  id="errorRecovery"
                  name="errorRecovery"
                  defaultValue={policy.errorRecovery ?? "auto_retry"}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                >
                  <option value="auto_retry">Auto retry</option>
                  <option value="manual">Manual</option>
                  <option value="skip">Skip</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <Button type="submit" disabled={policyPending}>
                  Save operational policy
                </Button>
                <ActionStatus state={policyState} />
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {sections.includes("validation") ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Validation</CardTitle>
            <CardDescription>Test connection and dry-run validation.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <form action={testAction} className="flex flex-wrap items-center gap-2">
              <input type="hidden" name="integrationId" value={definition.id} />
              {definition.capabilities.supportsDryRun ? (
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="dryRun" value="true" />
                  Dry-run
                </label>
              ) : null}
              <Button type="submit" size="sm" disabled={testPending}>
                Run validation
              </Button>
            </form>
            <ActionStatus state={testState} />
          </CardContent>
        </Card>
      ) : null}

      {sections.includes("operations") ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Operations</CardTitle>
            <CardDescription>Run-now actions from the operations catalog.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {definition.operations.map((operation) => (
              <form
                key={operation.id}
                action={opAction}
                className="rounded-md border p-3 space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-medium text-sm">{operation.title}</div>
                    <div className="text-xs text-muted-foreground">{operation.description}</div>
                  </div>
                  <Button type="submit" size="sm" disabled={opPending}>
                    Run
                  </Button>
                </div>
                <input type="hidden" name="integrationId" value={definition.id} />
                <input type="hidden" name="operationId" value={operation.id} />
                {(operation.parameters ?? []).map((param) => (
                  <div key={param.key} className="space-y-1">
                    <Label htmlFor={`${operation.id}.${param.key}`}>{param.label}</Label>
                    {param.type === "select" ? (
                      <select
                        id={`${operation.id}.${param.key}`}
                        name={`param.${param.key}`}
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                      >
                        {(param.options ?? []).map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <Input
                        id={`${operation.id}.${param.key}`}
                        name={`param.${param.key}`}
                        type={param.type === "number" ? "number" : "text"}
                        required={param.required}
                      />
                    )}
                  </div>
                ))}
                {operation.supportsDryRun ? (
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="dryRun" value="true" />
                    Dry-run
                  </label>
                ) : null}
              </form>
            ))}
            <ActionStatus state={opState} />
          </CardContent>
        </Card>
      ) : null}

      {sections.includes("monitoring") ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Monitoring</CardTitle>
            <CardDescription>Current health, quota, and job pressure.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3 text-sm">
            <div>
              <div className="text-muted-foreground">Health</div>
              <div className="text-lg font-semibold">{monitoring.health.score}%</div>
              <div>{monitoring.health.message}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Quota</div>
              <div className="text-lg font-semibold">
                {monitoring.quota
                  ? `${monitoring.quota.current} / ${monitoring.quota.maximum}`
                  : "—"}
              </div>
              <div>{monitoring.quota?.label ?? "No quota provider"}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Jobs</div>
              <div className="text-lg font-semibold">
                {monitoring.runningJobs} running · {monitoring.pendingJobs} pending
              </div>
              <div>
                Last sync:{" "}
                {monitoring.lastSyncAt ? new Date(monitoring.lastSyncAt).toLocaleString() : "—"}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Auth</div>
              <div>{monitoring.health.authentication}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Worker</div>
              <div>{monitoring.health.workerState}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Errors / warnings</div>
              <div>
                {monitoring.errors} / {monitoring.warnings}
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {sections.includes("permissions") ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Permissions & Scopes</CardTitle>
            <CardDescription>Required scopes versus granted scopes.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {definition.requiredScopes.length === 0 ? (
              <p className="text-muted-foreground">This integration does not require OAuth scopes.</p>
            ) : (
              definition.requiredScopes.map((scope) => {
                const granted = connection.grantedScopes.includes(scope);
                return (
                  <div key={scope} className="flex items-center justify-between gap-2 rounded-md border px-3 py-2">
                    <span className="truncate">{scope}</span>
                    <Badge variant={granted ? undefined : "outline"} className={granted ? "bg-emerald-600 text-white border-transparent" : ""}>
                      {granted ? "granted" : "missing"}
                    </Badge>
                  </div>
                );
              })
            )}
            {connection.missingScopes.length > 0 ? (
              <p className="text-amber-700 dark:text-amber-300">
                Reconnect to grant missing scopes before running blocked operations.
              </p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {sections.includes("history") ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Logs & History</CardTitle>
            <CardDescription>Executed operations, connection changes, and failures.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {history.length === 0 ? (
              <p className="text-sm text-muted-foreground">No history yet.</p>
            ) : (
              history.slice(0, 20).map((entry) => (
                <div key={entry.id} className="rounded-md border px-3 py-2 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{entry.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(entry.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <div className="text-muted-foreground">{entry.detail}</div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
