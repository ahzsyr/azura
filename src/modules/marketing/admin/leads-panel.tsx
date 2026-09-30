import { AdminPageHeader } from "@/components/admin/layout/admin-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function MarketingLeadsPanel({
  leads,
  attributions,
}: {
  leads: Array<{
    id: string;
    providerId: string;
    externalLeadId: string;
    inquiryId: string | null;
    processingStatus: string;
    createdAt: Date;
  }>;
  attributions: Array<{
    id: string;
    submissionId: string | null;
    inquiryId: string | null;
    utmSource: string | null;
    utmMedium: string | null;
    utmCampaign: string | null;
    landingPagePath: string | null;
    source: { label: string } | null;
    internalCampaign: { name: string } | null;
    createdAt: Date;
  }>;
}) {
  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Leads"
        description="Marketing-attributed leads from forms, inquiries, and platform lead sync — not social-only records."
      />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Attributed leads</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {attributions.length === 0 ? (
            <p className="text-muted-foreground">No attributed leads yet.</p>
          ) : (
            attributions.map((a) => (
              <div key={a.id} className="rounded border px-3 py-2">
                <div className="font-medium">
                  {a.internalCampaign?.name ?? a.utmCampaign ?? "Unassigned campaign"} ·{" "}
                  {a.source?.label ?? a.utmSource ?? "—"}
                </div>
                <div className="text-muted-foreground">
                  {a.utmMedium ?? "—"} · {a.landingPagePath ?? "—"} · submission{" "}
                  {a.submissionId ?? "n/a"} · inquiry {a.inquiryId ?? "n/a"}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Platform lead events</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {leads.length === 0 ? (
            <p className="text-sm text-muted-foreground">No platform lead events yet.</p>
          ) : (
            leads.map((lead) => (
              <div key={lead.id} className="rounded border px-3 py-2 text-sm">
                <div className="font-medium">
                  {lead.providerId} · {lead.externalLeadId} · {lead.processingStatus}
                </div>
                <div className="text-muted-foreground">
                  inquiry {lead.inquiryId ?? "n/a"} · {lead.createdAt.toISOString()}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
