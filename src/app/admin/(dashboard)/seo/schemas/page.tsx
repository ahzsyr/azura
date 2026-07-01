import { SeoPlatformSection } from "@/features/seo/admin/seo-platform-section";
import { schemaRegistry } from "@/features/seo/platform/layers/governance/schema-registry";

export default function AdminSeoSchemasPage() {
  const schemas = schemaRegistry.list();
  return (
    <div className="space-y-8">
      <SeoPlatformSection
        title="Schemas"
        layer="Governance Layer"
        description="JSON-LD factories registered via Plugin SDK."
        relatedLinks={[{ href: "/admin/seo/structured-data", label: "Structured Data (legacy)" }]}
      />
      <ul className="space-y-3 text-sm">
        {schemas.map((s) => (
          <li key={s.id} className="rounded-lg border p-3">
            <p className="font-medium">{s.id}</p>
            <p className="text-muted-foreground">@type: {s.type}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
