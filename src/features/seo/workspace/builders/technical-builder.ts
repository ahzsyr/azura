import type {
  SeoAuditSnapshotRecord,
  SeoDeveloperDetails,
  SeoIssueCategory,
  SeoTechnicalAuditVm,
  SeoTechnicalCard,
} from "../types";
import { SEO_PIPELINE_VERSION } from "../types";

type CardDef = {
  id: string;
  label: string;
  category: SeoIssueCategory;
  match: (title: string, message: string) => boolean;
};

const CARD_DEFS: CardDef[] = [
  {
    id: "canonicals",
    label: "Canonicals",
    category: "technical",
    match: (t, m) => `${t} ${m}`.toLowerCase().includes("canonical"),
  },
  {
    id: "redirects",
    label: "Redirects",
    category: "technical",
    match: (t, m) => `${t} ${m}`.toLowerCase().includes("redirect"),
  },
  {
    id: "broken-links",
    label: "Broken Links",
    category: "technical",
    match: (t, m) => {
      const h = `${t} ${m}`.toLowerCase();
      return h.includes("broken") || h.includes("404");
    },
  },
  {
    id: "schema",
    label: "Schema",
    category: "schema",
    match: (t, m) => {
      const h = `${t} ${m}`.toLowerCase();
      return h.includes("schema") || h.includes("json-ld") || h.includes("structured");
    },
  },
  {
    id: "hreflang",
    label: "Hreflang",
    category: "technical",
    match: (t, m) => `${t} ${m}`.toLowerCase().includes("hreflang"),
  },
  {
    id: "robots",
    label: "Robots",
    category: "technical",
    match: (t, m) => `${t} ${m}`.toLowerCase().includes("robots"),
  },
  {
    id: "sitemap",
    label: "Sitemap",
    category: "technical",
    match: (t, m) => `${t} ${m}`.toLowerCase().includes("sitemap"),
  },
];

function cardStatus(
  issueCount: number,
  critical: number,
): SeoTechnicalCard["status"] {
  if (critical > 0) return "fail";
  if (issueCount > 0) return "warn";
  return "healthy";
}

export function buildTechnicalAuditVm(
  record: SeoAuditSnapshotRecord | null,
): SeoTechnicalAuditVm {
  if (!record) {
    const developer: SeoDeveloperDetails = {
      analyzerIds: [],
      ruleIds: [],
      pipelineVersion: SEO_PIPELINE_VERSION,
    };
    return {
      snapshot: null,
      cards: CARD_DEFS.map((def) => ({
        id: def.id,
        label: def.label,
        status: "unknown" as const,
        summary: "Run a site audit to see results",
        issueCount: 0,
        category: def.category,
      })),
      developer,
    };
  }

  const open = record.issues.filter((i) => i.status === "open");
  const cards: SeoTechnicalCard[] = CARD_DEFS.map((def) => {
    const matched = open.filter((i) => def.match(i.title, i.message));
    const critical = matched.filter((i) => i.severity === "critical").length;
    const status = cardStatus(matched.length, critical);
    return {
      id: def.id,
      label: def.label,
      status,
      summary:
        matched.length === 0
          ? "No issues detected"
          : `${matched.length} issue${matched.length === 1 ? "" : "s"}`,
      issueCount: matched.length,
      category: def.category,
    };
  });

  return {
    snapshot: record.snapshot,
    cards,
    developer: {
      correlationId: record.snapshot.correlationId,
      analyzerIds: record.snapshot.analyzerIds,
      ruleIds: record.snapshot.ruleIds,
      executionTimeMs: record.snapshot.durationMs,
      snapshotId: record.snapshot.id,
      pipelineVersion: record.snapshot.pipelineVersion,
    },
  };
}
