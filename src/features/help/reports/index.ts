import { formatHelpCoverageReport, getHelpCoverageReport } from "@/features/help/reports/coverage";
import { getHelpStaleReport } from "@/features/help/reports/stale";
import type { HelpInventoryBundle } from "@/features/help/inventory/types";
import type { HelpEntityDefinition } from "@/features/help/inventory/types";

export function buildHelpReports(
  inventory: HelpInventoryBundle,
  definitions: Map<string, HelpEntityDefinition>
) {
  const stale = getHelpStaleReport(inventory, definitions);
  const coverage = getHelpCoverageReport(inventory, definitions, stale);
  return { stale, coverage, text: formatHelpCoverageReport(coverage) };
}

export { getHelpCoverageReport, formatHelpCoverageReport } from "@/features/help/reports/coverage";
export { getHelpStaleReport } from "@/features/help/reports/stale";
