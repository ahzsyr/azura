import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/layout/admin-shell";
import { seoWorkspaceService } from "@/features/seo/workspace/seo-workspace.service";
import { SeoSnapshotBanner } from "@/features/seo/workspace/components/seo-snapshot-banner";
import { SeoDeveloperDetailsPanel } from "@/features/seo/workspace/components/seo-developer-details";
import { cn } from "@/lib/utils";

type Props = {
  searchParams?: Promise<{ snapshotId?: string }>;
};

export default async function AdminSeoTechnicalAuditPage({ searchParams }: Props) {
  const params = searchParams ? await searchParams : {};
  const vm = await seoWorkspaceService.getTechnicalAudit(params.snapshotId);

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Technical Audit"
        description="Results from the latest site audit. This page never re-runs the crawler."
      />

      <SeoSnapshotBanner snapshot={vm.snapshot} />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {vm.cards.map((card) => {
          const href = `/admin/seo/issues?category=${card.category}${
            vm.snapshot ? `&snapshotId=${encodeURIComponent(vm.snapshot.id)}` : ""
          }`;
          return (
            <Link
              key={card.id}
              href={href}
              className={cn(
                "rounded-lg border p-4 transition-colors hover:bg-muted/30",
                card.status === "healthy" && "border-emerald-200",
                card.status === "warn" && "border-amber-200",
                card.status === "fail" && "border-red-200",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium">{card.label}</p>
                <span className="text-xs uppercase tracking-wide text-muted-foreground capitalize">
                  {card.status}
                </span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{card.summary}</p>
            </Link>
          );
        })}
      </div>

      <SeoDeveloperDetailsPanel details={vm.developer} />
    </div>
  );
}
