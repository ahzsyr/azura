import { AdminPageHeader } from "@/components/admin/layout/admin-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function MarketingLeadsPanel({
  leads,
}: {
  leads: Array<{
    id: string;
    providerId: string;
    externalLeadId: string;
    inquiryId: string | null;
    processingStatus: string;
    createdAt: Date;
  }>;
}) {
  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Leads"
        description="Lead events synced from social forms into AZURA inquiries."
      />
      <Card>
        <CardHeader><CardTitle>Lead events</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {leads.length === 0 ? (
            <p className="text-sm text-muted-foreground">No lead events yet.</p>
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
