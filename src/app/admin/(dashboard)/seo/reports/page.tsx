import "@/features/seo/platform/seo-platform.impl";
import { SeoPlatformSection } from "@/features/seo/admin/seo-platform-section";
import { SeoInspector } from "@/features/seo/admin/seo-inspector";
import { getAuditLog, getProvenance } from "@/features/seo/platform/observability/observability";

export default function AdminSeoReportsPage() {
  const audit = getAuditLog(20);
  const latest = audit[audit.length - 1];
  const provenance = latest ? getProvenance(latest.ctx.correlationId) : undefined;

  return (
    <div className="space-y-8">
      <SeoPlatformSection
        title="Reports"
        layer="Observability Layer"
        description="Pipeline audit log and provenance trail from the event bus."
      />

      <SeoInspector
        correlationId={latest?.ctx.correlationId}
        provenance={provenance}
      />

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-left">
              <th className="p-3">Time</th>
              <th className="p-3">Event</th>
              <th className="p-3">Entity</th>
            </tr>
          </thead>
          <tbody>
            {audit.length === 0 ? (
              <tr>
                <td colSpan={3} className="p-3 text-muted-foreground">
                  No pipeline events recorded yet.
                </td>
              </tr>
            ) : (
              audit.map((row) => (
                <tr key={row.id} className="border-b">
                  <td className="p-3 whitespace-nowrap">{row.at}</td>
                  <td className="p-3">{row.event}</td>
                  <td className="p-3">
                    {row.ctx.entityType}:{row.ctx.entityId}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
