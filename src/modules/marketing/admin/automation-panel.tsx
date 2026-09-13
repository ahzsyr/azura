import { AdminPageHeader } from "@/components/admin/layout/admin-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function MarketingAutomationPanel() {
  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Automation"
        description="Event-driven marketing workflows wired to the internal marketing event bus."
      />
      <Card>
        <CardHeader>
          <CardTitle>Active hooks</CardTitle>
          <CardDescription>
            CMS publish, form submission, and lead-created events can enqueue publish/tracking jobs when
            capability flags are enabled.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div>CMS_POST_PUBLISHED → auto publish job (flag: marketing.publishing)</div>
          <div>FORM_SUBMITTED → FormSubmitted tracking dispatch (flag: marketing.tracking)</div>
          <div>LEAD_CREATED → LeadGenerated tracking dispatch (flag: marketing.tracking)</div>
        </CardContent>
      </Card>
    </div>
  );
}
