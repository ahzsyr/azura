import "server-only";

import type { Locale } from "@/i18n/routing";
import { getPublishedPackagesCached } from "@/services/data-loaders";
import { contentPublicService } from "@/features/content/content-public.service";
import { loadComparePropsFromContentTypeView } from "@/features/comparison/load-compare-props";
import { resolveCalculatorForBlock } from "@/features/pricing-calculators/resolve-calculator-for-block";
import { resolveKnowledgeBaseForBlock } from "@/features/knowledge-base/resolve-knowledge-base-for-block";
import { resolveDocumentationForBlock } from "@/features/documentation/resolve-documentation-for-block";
import { resolveStatusBoardForBlock } from "@/features/status/resolve-status-board-for-block";
import { resolveTeamDirectoryForBlock } from "@/features/team/resolve-team-directory-for-block";
import { resolvePartnerProgramForBlock } from "@/features/partners/resolve-partner-program-for-block";
import { resolvePricingPlanSetForBlock } from "@/features/pricing-plans/resolve-pricing-plan-set-for-block";
import {
  documentationNavPropsSchema,
  knowledgeBasePropsSchema,
  partnerDirectoryPropsSchema,
  pricingCalculatorPropsSchema,
  statusDashboardPropsSchema,
  teamDirectoryPropsSchema,
} from "@/features/portal-blocks/schemas/portal-blocks";
import { pricingPropsSchema } from "@/features/pricing-plans/schemas/pricing-blocks";
import { safeParseProps } from "@/lib/zod/safe-parse-props";
import { PricingCalculatorView } from "@/features/portal-blocks/components/pricing-calculator-view";
import { KnowledgeBaseView } from "@/features/portal-blocks/components/knowledge-base-view";
import { DocumentationNavView } from "@/features/portal-blocks/components/documentation-nav-view";
import { StatusDashboardView } from "@/features/portal-blocks/components/status-dashboard-view";
import { TeamDirectoryView } from "@/features/portal-blocks/components/team-directory-view";
import { PartnerDirectoryView } from "@/features/portal-blocks/components/partner-directory-view";
import { PricingTableView } from "@/features/pricing-plans/components/pricing-table-view";
import { Section, SectionHeader } from "@/components/marketing/section";
import { pickLocale } from "@/features/portal-blocks/lib/pick-locale";
import type { BlockNode } from "@/types/builder";
import type { BlockOverflowContext } from "@/features/builder/components/marketing-items-overflow";

type RenderCtx = {
  locale: string;
  props: Record<string, unknown>;
  loc: (key: string) => string;
  previewMode?: boolean;
  block?: BlockNode;
  overflow?: BlockOverflowContext;
};

const DEFAULT_PRICING_CALCULATOR = pricingCalculatorPropsSchema.parse({});
const DEFAULT_KNOWLEDGE_BASE = knowledgeBasePropsSchema.parse({});
const DEFAULT_DOCUMENTATION_NAV = documentationNavPropsSchema.parse({});
const DEFAULT_STATUS_DASHBOARD = statusDashboardPropsSchema.parse({});
const DEFAULT_TEAM_DIRECTORY = teamDirectoryPropsSchema.parse({});
const DEFAULT_PARTNER_DIRECTORY = partnerDirectoryPropsSchema.parse({});
const DEFAULT_PRICING_TABLE = pricingPropsSchema.parse({});

export async function PricingCalculatorBlockRenderer({ locale, props, loc }: RenderCtx) {
  const p = safeParseProps(
    pricingCalculatorPropsSchema,
    props,
    DEFAULT_PRICING_CALCULATOR,
    "PricingCalculatorBlockRenderer",
  );
  const calculator = await resolveCalculatorForBlock({ pricingCalculatorSlug: p.pricingCalculatorSlug });
  if (!calculator) {
    return (
      <Section>
        <p className="text-muted-foreground text-sm">Select a pricing calculator in block settings.</p>
      </Section>
    );
  }
  const activeLocale = locale as Locale;
  const title = loc("title") || pickLocale(p, "title", activeLocale);
  const subtitle = loc("subtitle") || pickLocale(p, "subtitle", activeLocale);
  return (
    <Section>
      <PricingCalculatorView
        locale={activeLocale}
        calculator={calculator}
        title={title}
        subtitle={subtitle}
        showDescription={p.showDescription}
        layout={p.layout}
      />
    </Section>
  );
}

export async function KnowledgeBaseBlockRenderer({ locale, props, loc }: RenderCtx) {
  const p = safeParseProps(
    knowledgeBasePropsSchema,
    props,
    DEFAULT_KNOWLEDGE_BASE,
    "KnowledgeBaseBlockRenderer",
  );
  const kb = await resolveKnowledgeBaseForBlock({
    knowledgeBaseSlug: p.knowledgeBaseSlug,
    categorySlug: p.categorySlug || undefined,
    limit: p.limit || undefined,
  });
  if (!kb) {
    return (
      <Section>
        <p className="text-muted-foreground text-sm">Select a knowledge base in block settings.</p>
      </Section>
    );
  }
  const activeLocale = locale as Locale;
  return (
    <Section>
      <KnowledgeBaseView
        locale={activeLocale}
        knowledgeBase={kb}
        title={loc("title") || pickLocale(p, "title", activeLocale)}
        subtitle={loc("subtitle") || pickLocale(p, "subtitle", activeLocale)}
        layout={p.layout}
        showSearch={p.showSearch}
        showCategories={p.showCategories}
        showRatings={p.showRatings}
      />
    </Section>
  );
}

export async function DocumentationNavBlockRenderer({ locale, props, loc }: RenderCtx) {
  const p = safeParseProps(
    documentationNavPropsSchema,
    props,
    DEFAULT_DOCUMENTATION_NAV,
    "DocumentationNavBlockRenderer",
  );
  const portal = await resolveDocumentationForBlock({
    docPortalSlug: p.docPortalSlug,
    versionSlug: p.versionSlug || undefined,
    rootSectionSlug: p.rootSectionSlug || undefined,
  });
  if (!portal) {
    return (
      <Section>
        <p className="text-muted-foreground text-sm">Select a documentation portal in block settings.</p>
      </Section>
    );
  }
  const activeLocale = locale as Locale;
  return (
    <Section>
      <DocumentationNavView
        locale={activeLocale}
        portal={portal}
        title={loc("title") || pickLocale(p, "title", activeLocale)}
        subtitle={loc("subtitle") || pickLocale(p, "subtitle", activeLocale)}
        layout={p.layout}
        showBreadcrumbs={p.showBreadcrumbs}
        showToc={p.showToc}
      />
    </Section>
  );
}

export async function StatusDashboardBlockRenderer({ locale, props, loc }: RenderCtx) {
  const p = safeParseProps(
    statusDashboardPropsSchema,
    props,
    DEFAULT_STATUS_DASHBOARD,
    "StatusDashboardBlockRenderer",
  );
  const board = await resolveStatusBoardForBlock({ statusBoardSlug: p.statusBoardSlug });
  if (!board) {
    return (
      <Section>
        <p className="text-muted-foreground text-sm">Select a status board in block settings.</p>
      </Section>
    );
  }
  const refreshUrl = p.statusBoardSlug
    ? `/api/status-boards/${encodeURIComponent(p.statusBoardSlug)}`
    : undefined;
  const activeLocale = locale as Locale;
  return (
    <Section>
      <StatusDashboardView
        locale={activeLocale}
        board={board}
        title={loc("title") || pickLocale(p, "title", activeLocale)}
        subtitle={loc("subtitle") || pickLocale(p, "subtitle", activeLocale)}
        layout={p.layout}
        showUptime={p.showUptime}
        showIncidents={p.showIncidents}
        showMaintenance={p.showMaintenance}
        pollingIntervalMs={p.pollingIntervalMs}
        refreshUrl={refreshUrl}
      />
    </Section>
  );
}

export async function TeamDirectoryBlockRenderer({ locale, props, loc }: RenderCtx) {
  const p = safeParseProps(
    teamDirectoryPropsSchema,
    props,
    DEFAULT_TEAM_DIRECTORY,
    "TeamDirectoryBlockRenderer",
  );
  const directory = await resolveTeamDirectoryForBlock({
    teamDirectorySlug: p.teamDirectorySlug,
    departmentId: p.departmentId || undefined,
    limit: p.limit || undefined,
  });
  if (!directory) {
    return (
      <Section>
        <p className="text-muted-foreground text-sm">Select a team directory in block settings.</p>
      </Section>
    );
  }
  const activeLocale = locale as Locale;
  return (
    <Section>
      <TeamDirectoryView
        locale={activeLocale}
        directory={directory}
        title={loc("title") || pickLocale(p, "title", activeLocale)}
        subtitle={loc("subtitle") || pickLocale(p, "subtitle", activeLocale)}
        layout={p.layout}
        showSearch={p.showSearch}
        showDepartments={p.showDepartments}
      />
    </Section>
  );
}

export async function PartnerDirectoryBlockRenderer({ locale, props, loc }: RenderCtx) {
  const p = safeParseProps(
    partnerDirectoryPropsSchema,
    props,
    DEFAULT_PARTNER_DIRECTORY,
    "PartnerDirectoryBlockRenderer",
  );
  const program = await resolvePartnerProgramForBlock({
    partnerProgramSlug: p.partnerProgramSlug,
    categorySlug: p.categorySlug || undefined,
    locationFilter: p.locationFilter || undefined,
    limit: p.limit || undefined,
  });
  if (!program) {
    return (
      <Section>
        <p className="text-muted-foreground text-sm">Select a partner program in block settings.</p>
      </Section>
    );
  }
  const activeLocale = locale as Locale;
  return (
    <Section>
      <PartnerDirectoryView
        locale={activeLocale}
        program={program}
        title={loc("title") || pickLocale(p, "title", activeLocale)}
        subtitle={loc("subtitle") || pickLocale(p, "subtitle", activeLocale)}
        layout={p.layout}
        showSearch={p.showSearch}
        showMap={p.showMap}
      />
    </Section>
  );
}

export async function PricingTableBlockRenderer({ locale, props, loc, block, overflow }: RenderCtx) {
  const p = safeParseProps(
    pricingPropsSchema,
    props,
    DEFAULT_PRICING_TABLE,
    "PricingTableBlockRenderer",
  );
  const activeLocale = locale as Locale;
  const title = loc("title") || pickLocale(p, "title", activeLocale);

  if (p.source === "planSet") {
    const planSet = await resolvePricingPlanSetForBlock({ planSetSlug: p.planSetSlug });
    if (!planSet) {
      return (
        <Section>
          <p className="text-muted-foreground text-sm">Select a pricing plan set in block settings.</p>
        </Section>
      );
    }
    return (
      <Section>
        {title ? <SectionHeader title={title} align="start" /> : null}
        <PricingTableView
          locale={activeLocale}
          source="planSet"
          layout={p.layout}
          showBillingToggle={p.showBillingToggle}
          defaultBillingPeriod={p.defaultBillingPeriod}
          highlightedPlanId={p.highlightedPlanId}
          planSet={planSet}
          block={block}
          overflow={overflow}
        />
      </Section>
    );
  }

  await contentPublicService.ensureReady();
  const [packages, catalogType] = await Promise.all([
    getPublishedPackagesCached(p.packageCategorySlug || undefined),
    contentPublicService.getTypeBySlug("catalog-items"),
  ]);
  const filtered = (p.showFeaturedOnly ? packages.filter((x) => x.isFeatured) : packages).slice(
    0,
    p.limit > 0 ? p.limit : packages.length
  );
  const packageCompare = catalogType
    ? loadComparePropsFromContentTypeView(catalogType, locale)
    : undefined;
  return (
    <Section>
      {title ? <SectionHeader title={title} align="start" /> : null}
      <PricingTableView
        locale={activeLocale}
        source="packages"
        layout={p.layout}
        packages={filtered}
        packageCompare={packageCompare}
        block={block}
        overflow={overflow}
      />
    </Section>
  );
}
