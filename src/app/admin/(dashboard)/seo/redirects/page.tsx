import { seoRepository } from "@/repositories/seo.repository";
import { RedirectsSettingsPanel } from "@/features/seo/admin/redirects-settings-panel";
import { listPublicRouteCatalog } from "@/features/seo/admin/route-catalog.service";
import { SeoHealthLayout } from "@/features/seo/operator/components/seo-health-layout";

export default async function RedirectsPage() {
  const [redirects, routeCatalog] = await Promise.all([
    seoRepository.listRedirects(false),
    listPublicRouteCatalog().catch(() => []),
  ]);

  const livePaths = new Set(routeCatalog.map((entry) => entry.path));
  const permanent = redirects.filter((row) => row.type !== "TEMPORARY" && row.isActive).length;
  const temporary = redirects.filter((row) => row.type === "TEMPORARY" && row.isActive).length;
  const broken = redirects.filter(
    (row) => row.isActive && row.toPath.startsWith("/") && !livePaths.has(row.toPath),
  ).length;

  return (
    <SeoHealthLayout
      title="Redirects"
      status={broken > 0 ? "attention" : "healthy"}
      stats={[
        { label: "301 redirects", value: String(permanent) },
        { label: "302 redirects", value: String(temporary) },
        { label: "Broken targets", value: String(broken) },
      ]}
      attention={
        broken > 0 ? [`${broken} redirect${broken === 1 ? "" : "s"} point to missing pages.`] : []
      }
      advanced={<RedirectsSettingsPanel redirects={redirects} routeCatalog={routeCatalog} embedded />}
    />
  );
}
