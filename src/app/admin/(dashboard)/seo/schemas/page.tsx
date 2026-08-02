import { AdminPageHeader } from "@/components/admin/layout/admin-shell";
import { SeoDeveloperDetailsPanel } from "@/features/seo/workspace/components/seo-developer-details";
import { schemaRegistry } from "@/features/seo/platform/layers/governance/schema-registry";
import { SEO_PIPELINE_VERSION } from "@/features/seo/workspace/types";
import Link from "next/link";

export default function AdminSeoSchemasPage() {
  const schemas = schemaRegistry.list();
  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="SEO Schemas"
        description="Registered structured-data factories used when generating JSON-LD."
      />
      <p className="text-sm text-muted-foreground">
        Manage site-wide structured data in{" "}
        <Link href="/admin/seo/structured-data" className="text-primary underline-offset-4 hover:underline">
          Structured Data
        </Link>
        .
      </p>
      <ul className="space-y-3 text-sm">
        {schemas.map((s) => (
          <li key={s.id} className="rounded-lg border p-3">
            <p className="font-medium">{s.type}</p>
            <p className="text-xs text-muted-foreground mt-1">Registry id: {s.id}</p>
          </li>
        ))}
      </ul>
      <SeoDeveloperDetailsPanel
        details={{
          analyzerIds: [],
          ruleIds: schemas.map((s) => s.id),
          pipelineVersion: SEO_PIPELINE_VERSION,
        }}
      />
    </div>
  );
}
