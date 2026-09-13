import { AdminPageHeader } from "@/components/admin/layout/admin-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSearchOperationsPlatform } from "@/features/search-intelligence/workspaces/server";
import {
  ActionButton,
  SearchOpsSubnav,
} from "@/features/search-intelligence/workspaces/ui";
import {
  runAutomationRuleAction,
  toggleAutomationRuleAction,
} from "@/features/search-intelligence/workspaces/actions";

export const dynamic = "force-dynamic";

export default async function SearchOpsAutomationWorkspace() {
  const platform = await getSearchOperationsPlatform();
  const rules = platform.automation.listRules();
  const runs = platform.automation.listRuns();

  return (
    <div className="space-y-8 max-w-6xl">
      <AdminPageHeader
        title="Automation"
        description="Event-driven SEO workflows: publish triggers, company syncs, and scheduled remediation."
      />
      <SearchOpsSubnav active="Automation" />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Rules</CardTitle>
          <CardDescription>Zapier-style SEO automations backed by the operations engine.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {rules.map((rule) => {
            const ruleId = rule.id;
            const nextEnabled = !rule.enabled;
            return (
            <div key={rule.id} className="rounded-lg border p-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium">
                    {rule.name}{" "}
                    <span className="text-xs text-muted-foreground">
                      {rule.enabled ? "enabled" : "disabled"} · {rule.trigger}
                    </span>
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {rule.steps.map((s) => s.definitionId).join(" → ")}
                  </p>
                </div>
                <div className="flex gap-2">
                  <ActionButton
                    formAction={async () => {
                      "use server";
                      await runAutomationRuleAction(ruleId);
                    }}
                  >
                    Run
                  </ActionButton>
                  <ActionButton
                    variant="outline"
                    formAction={async () => {
                      "use server";
                      await toggleAutomationRuleAction(ruleId, nextEnabled);
                    }}
                  >
                    {rule.enabled ? "Disable" : "Enable"}
                  </ActionButton>
                </div>
              </div>
            </div>
          );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Run history</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {runs.length === 0 ? (
            <p className="text-muted-foreground">No automation runs yet.</p>
          ) : (
            runs.slice(0, 15).map((run) => (
              <div key={run.id} className="rounded-lg border p-3">
                <p className="font-medium">
                  {run.status} · {run.operationIds.length} operations
                </p>
                <p className="text-xs text-muted-foreground">
                  started {run.startedAt}
                  {run.error ? ` · ${run.error}` : ""}
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
