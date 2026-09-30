import { SeoPlatformSection } from "@/features/seo/admin/seo-platform-section";
import { DEFAULT_PIPELINES } from "@/features/seo/platform/pipelines/pipeline-loader";

export default function AdminSeoAutomationPage() {
  return (
    <div className="space-y-8">
      <SeoPlatformSection
        title="Automation"
        layer="Automation Layer"
        description="Declarative pipelines orchestrate analysis → generation → validation → recommendations → publishing. Bulk fill runs the standard-bulk pipeline."
      />
      <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
        {DEFAULT_PIPELINES.map((p) => (
          <li key={p.id}>
            <span className="font-medium text-foreground">{p.id}</span>
            {p.trigger ? ` — trigger: ${p.trigger}` : ""} ({p.steps.length} steps)
          </li>
        ))}
      </ul>
    </div>
  );
}
