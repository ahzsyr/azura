import type { FieldProvenance, ProvenanceChain } from "@/features/seo/platform/types";
import { explainField } from "@/features/seo/platform/observability/observability";

type SeoInspectorProps = {
  correlationId?: string;
  provenance?: FieldProvenance;
  fields?: string[];
};

function ProvenanceSteps({ chain }: { chain: ProvenanceChain }) {
  if (!chain.length) return <p className="text-sm text-muted-foreground">No provenance recorded.</p>;
  return (
    <ol className="space-y-2 text-sm">
      {chain.map((step, i) => (
        <li key={`${step.label}-${i}`} className="flex gap-2">
          <span className="text-muted-foreground">{i + 1}.</span>
          <span>
            <span className="font-medium">{step.label}</span>
            {step.detail ? <span className="text-muted-foreground"> — {step.detail}</span> : null}
          </span>
        </li>
      ))}
    </ol>
  );
}

export function SeoInspector({
  correlationId,
  provenance,
  fields = ["metaTitle", "metaDescription", "ogTitle", "focusKeywords"],
}: SeoInspectorProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">SEO Inspector</h2>
        <p className="text-sm text-muted-foreground">
          Provenance chain per field — how each metadata value was derived.
        </p>
        {correlationId ? (
          <p className="mt-1 font-mono text-xs text-muted-foreground">{correlationId}</p>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {fields.map((field) => {
          const chain =
            provenance?.[field] ??
            (correlationId ? explainField(correlationId, field) : undefined);
          return (
            <div key={field} className="rounded-xl border p-4">
              <h3 className="text-sm font-medium">{field}</h3>
              <div className="mt-3">
                <ProvenanceSteps chain={chain ?? []} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
