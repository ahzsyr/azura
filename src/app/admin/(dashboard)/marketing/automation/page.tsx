import { AdminPageHeader } from "@/components/admin/layout/admin-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { automationService } from "@/modules/marketing/automation/service";
import { upsertAutomationRuleAction } from "@/modules/marketing/actions";

export const dynamic = "force-dynamic";

export default async function AdminMarketingAutomationPage() {
  const rules = await automationService.listRules().catch(() => []);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Automation"
        description="Marketing operations rules: spend/CPL thresholds, sync failures, new leads. Social auto-publish is not included."
      />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Create rule</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={upsertAutomationRuleAction} className="grid gap-2 md:grid-cols-3">
            <Input name="name" placeholder="Rule name" required />
            <select name="triggerType" className="h-9 rounded-md border bg-background px-2 text-sm">
              <option value="spend_threshold">Spend threshold</option>
              <option value="cpl_threshold">CPL threshold</option>
              <option value="conversion_rate_drop">Conversion rate drop</option>
              <option value="sync_failure">Sync failure</option>
              <option value="new_lead">New lead</option>
              <option value="campaign_start">Campaign start</option>
              <option value="campaign_end">Campaign end</option>
            </select>
            <Input name="threshold" type="number" placeholder="Threshold" />
            <select name="operator" className="h-9 rounded-md border bg-background px-2 text-sm">
              <option value="gt">Greater than</option>
              <option value="lt">Less than</option>
            </select>
            <select name="actionType" className="h-9 rounded-md border bg-background px-2 text-sm">
              <option value="alert">Internal alert</option>
              <option value="email">Email notification</option>
              <option value="force_sync">Force sync</option>
            </select>
            <Button type="submit">Save rule</Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Rules</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          {rules.length === 0 ? (
            <p className="text-muted-foreground">No automation rules yet.</p>
          ) : (
            rules.map((r) => (
              <div key={r.id} className="flex justify-between border-b py-1">
                <span>
                  {r.name} · {r.triggerType} {r.enabled ? "" : "(disabled)"}
                </span>
                <span className="text-muted-foreground">{r._count.executions} runs</span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
