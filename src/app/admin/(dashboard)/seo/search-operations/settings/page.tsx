import { AdminPageHeader } from "@/components/admin/layout/admin-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSearchOperationsPlatform } from "@/features/search-intelligence/workspaces/server";
import {
  ActionButton,
  SearchOpsSubnav,
} from "@/features/search-intelligence/workspaces/ui";
import { updateApprovalPolicyAction } from "@/features/search-intelligence/workspaces/actions";
import { OPERATION_DEFINITIONS } from "@/features/search-intelligence/operations";

export const dynamic = "force-dynamic";

export default async function SearchOpsSettingsWorkspace() {
  const platform = await getSearchOperationsPlatform();
  const policy = platform.operations.getPolicy();
  const moderateAuto = platform.operations.getModerateAutoExecute();

  return (
    <div className="space-y-8 max-w-6xl">
      <AdminPageHeader
        title="Settings"
        description="Approval policies, risk thresholds, and environment promotion defaults."
      />
      <SearchOpsSubnav active="Settings" />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Approval Policies</CardTitle>
          <CardDescription>
            Safe auto-executes. Moderate is configurable. High always requires approval. Critical requires
            confirmation + rollback checkpoint.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="rounded-lg border p-3">Safe → {policy.safe}</div>
          <div className="rounded-lg border p-3">
            Moderate → {policy.moderate}{" "}
            <span className="text-muted-foreground">
              (auto execute {moderateAuto ? "on" : "off"})
            </span>
          </div>
          <div className="rounded-lg border p-3">High → {policy.high}</div>
          <div className="rounded-lg border p-3">Critical → {policy.critical}</div>
          <div className="flex gap-2">
            <ActionButton
              formAction={async () => {
                "use server";
                await updateApprovalPolicyAction({
                  moderateAutoExecute: true,
                  moderate: "auto_execute",
                });
              }}
            >
              Moderate: Auto Execute
            </ActionButton>
            <ActionButton
              variant="outline"
              formAction={async () => {
                "use server";
                await updateApprovalPolicyAction({
                  moderateAutoExecute: false,
                  moderate: "optional_approval",
                });
              }}
            >
              Moderate: Require Approval
            </ActionButton>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Environment promotion</CardTitle>
          <CardDescription>draft → development → staging → production</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Schema, entities, metadata, redirects, robots, and automation rules promote through environments with
          approval and rollback checkpoints for high/critical changes.
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Registered operations</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2 text-sm">
          {OPERATION_DEFINITIONS.map((def) => (
            <div key={def.id} className="rounded-lg border p-3">
              <p className="font-medium">{def.label}</p>
              <p className="text-xs text-muted-foreground">
                {def.id} · {def.risk} · {def.category}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
