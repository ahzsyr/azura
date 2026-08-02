import { computeOperationalDashboard } from "@/features/forms/analytics/operational-analytics.service";
import {
  computeBehaviorMetrics,
  computeFieldPerformance,
} from "@/features/forms/behavior-analytics.service";
import { FormsAnalyticsPage } from "@/features/forms/admin/analytics/forms-analytics-page";
import { getFormTemplateById } from "@/features/forms/form-template.service";
import { TemplateAnalyticsStrip } from "@/features/forms/admin/analytics/template-analytics-strip";

type Props = { searchParams: Promise<{ templateId?: string }> };

export default async function FormsAnalyticsRoute({ searchParams }: Props) {
  const { templateId } = await searchParams;
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [operational, behavior] = await Promise.all([
    computeOperationalDashboard(since),
    computeBehaviorMetrics(templateId, since),
  ]);

  let fieldPerformance: Awaited<ReturnType<typeof computeFieldPerformance>> = [];
  let templateName: string | undefined;
  let labelMap: Record<string, string> = {};
  if (templateId) {
    fieldPerformance = await computeFieldPerformance(templateId, since);
    const template = await getFormTemplateById(templateId);
    templateName = template?.name;
    labelMap = Object.fromEntries(
      (template?.definition.fields ?? []).map((f) => [f.id, f.label || f.id]),
    );
  }

  return (
    <div className="space-y-6">
      {templateId ? (
        <TemplateAnalyticsStrip
          behavior={behavior}
          fieldPerformance={fieldPerformance}
          labelMap={labelMap}
          templateName={templateName}
        />
      ) : null}
      <FormsAnalyticsPage operational={operational} behavior={behavior} />
    </div>
  );
}
