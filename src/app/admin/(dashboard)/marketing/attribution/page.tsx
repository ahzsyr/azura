import { AdminPageHeader } from "@/components/admin/layout/admin-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminMarketingAttributionPage() {
  const [touches, sources] = await Promise.all([
    prisma.marketingTouch
      .findMany({
        take: 50,
        orderBy: { occurredAt: "desc" },
        include: { source: true, internalCampaign: true },
      })
      .catch(() => []),
    prisma.marketingSource.findMany({ orderBy: { sortOrder: "asc" } }).catch(() => []),
  ]);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Traffic & Attribution"
        description="Raw touch history is the attribution source of truth. First/last/session models are computed from these rows."
      />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sources</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2 text-sm">
          {sources.map((s) => (
            <span key={s.id} className="rounded-full border px-2 py-0.5">
              {s.label} <span className="text-muted-foreground">({s.category})</span>
            </span>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent touches</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          {touches.length === 0 ? (
            <p className="text-muted-foreground">No touches captured yet.</p>
          ) : (
            touches.map((t) => (
              <div key={t.id} className="flex flex-wrap justify-between gap-2 border-b py-1">
                <span>
                  {t.touchType} · {t.source?.label ?? "—"} · {t.medium ?? "—"}
                </span>
                <span className="text-muted-foreground">
                  {t.internalCampaign?.name ?? t.utmCampaign ?? "—"} · {t.landingPagePath ?? "—"}
                </span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
