import "server-only";

import type { Locale } from "@/i18n/routing";
import { getPublishedPackagesCached } from "@/services/data-loaders";
import { contentPublicService } from "@/features/content/content-public.service";
import { loadComparePropsFromContentTypeView } from "@/features/comparison/load-compare-props";
import { resolveCalculatorForBlock } from "@/presets/pricing/calculators/resolve-calculator-for-block";
import { resolveKnowledgeArticlesForBlock } from "@/presets/knowledge/resolve-knowledge-articles-for-block";
import { resolveDocumentationForBlock } from "@/modules/documentation/resolve-documentation-for-block";
import { resolveStatusBoardForBlock } from "@/modules/status-page/resolve-status-board-for-block";
import { resolveTeamMembersForBlock } from "@/presets/team-member/resolve-team-members-for-block";
import { resolvePartnersForBlock } from "@/presets/partner/resolve-partners-for-block";
import { resolvePricingPlansForBlock } from "@/presets/pricing/resolve-pricing-plans-for-block";
import {
  documentationNavPropsSchema,
  knowledgeBasePropsSchema,
  partnerDirectoryPropsSchema,
  pricingCalculatorPropsSchema,
  statusDashboardPropsSchema,
  teamDirectoryPropsSchema,
} from "@/features/builder/blocks/portal/schemas/portal-blocks";
import { pricingPropsSchema } from "@/presets/pricing/schemas/pricing-blocks";
import { safeParseProps } from "@/lib/zod/safe-parse-props";
import { PricingCalculatorView } from "@/features/builder/blocks/portal/components/pricing-calculator-view";
import { KnowledgeBaseView } from "@/features/builder/blocks/portal/components/knowledge-base-view";
import { DocumentationNavView } from "@/features/builder/blocks/portal/components/documentation-nav-view";
import { StatusDashboardView } from "@/features/builder/blocks/portal/components/status-dashboard-view";
import { TeamDirectoryView } from "@/features/builder/blocks/portal/components/team-directory-view";
import { PartnerDirectoryView } from "@/features/builder/blocks/portal/components/partner-directory-view";
import { PricingTableView } from "@/presets/pricing/components/pricing-table-view";
import { Section, SectionHeader } from "@/components/marketing/section";
import { pickLocale } from "@/features/builder/blocks/portal/lib/pick-locale";
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
  const activeLocale = locale as Locale;
  const title = loc("title") || pickLocale(p, "title", activeLocale);
  const subtitle = loc("subtitle") || pickLocale(p, "subtitle", activeLocale);

  const resolved = await resolveKnowledgeArticlesForBlock(
    {
      knowledgeBaseSlug: p.knowledgeBaseSlug,
      categorySlug: p.categorySlug || undefined,
      limit: p.limit || undefined,
      presetId: p.presetId,
      templateId: p.templateId,
    },
    {
      locale: activeLocale,
      localePrefix: activeLocale,
    },
  );

  if (!resolved) {
    return (
      <Section>
        <p className="text-muted-foreground text-sm">Select a knowledge base in block settings.</p>
      </Section>
    );
  }

  return (
    <Section>
      <KnowledgeBaseView
        locale={activeLocale}
        title={title}
        subtitle={subtitle}
        layout={p.layout}
        showSearch={p.showSearch}
        showCategories={p.showCategories}
        showRatings={p.showRatings}
        knowledgeBaseSlug={resolved.knowledgeBaseSlug}
        categories={resolved.categories}
        articleViewModels={resolved.articleViewModels}
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
  const activeLocale = locale as Locale;
  const title = loc("title") || pickLocale(p, "title", activeLocale);
  const subtitle = loc("subtitle") || pickLocale(p, "subtitle", activeLocale);

  const resolved = await resolveTeamMembersForBlock(
    {
      teamDirectorySlug: p.teamDirectorySlug,
      departmentId: p.departmentId || undefined,
      limit: p.limit || undefined,
      presetId: p.presetId,
      templateId: p.templateId,
    },
    { locale: activeLocale, localePrefix: activeLocale },
  );

  if (!resolved) {
    return (
      <Section>
        <p className="text-muted-foreground text-sm">Select a team directory in block settings.</p>
      </Section>
    );
  }

  return (
    <Section>
      <TeamDirectoryView
        locale={activeLocale}
        title={title}
        subtitle={subtitle}
        layout={p.layout}
        showSearch={p.showSearch}
        showDepartments={p.showDepartments}
        teamDirectorySlug={resolved.teamDirectorySlug}
        departments={resolved.departments}
        memberViewModels={resolved.memberViewModels}
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
  const activeLocale = locale as Locale;
  const title = loc("title") || pickLocale(p, "title", activeLocale);
  const subtitle = loc("subtitle") || pickLocale(p, "subtitle", activeLocale);

  const resolved = await resolvePartnersForBlock(
    {
      partnerProgramSlug: p.partnerProgramSlug,
      categorySlug: p.categorySlug || undefined,
      locationFilter: p.locationFilter || undefined,
      limit: p.limit || undefined,
      presetId: p.presetId,
      templateId: p.templateId,
    },
    { locale: activeLocale, localePrefix: activeLocale },
  );

  if (!resolved) {
    return (
      <Section>
        <p className="text-muted-foreground text-sm">Select a partner program in block settings.</p>
      </Section>
    );
  }

  return (
    <Section>
      <PartnerDirectoryView
        locale={activeLocale}
        title={title}
        subtitle={subtitle}
        layout={p.layout}
        showSearch={p.showSearch}
        showMap={p.showMap}
        partnerProgramSlug={resolved.partnerProgramSlug}
        categories={resolved.categories}
        partnerViewModels={resolved.partnerViewModels}
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
    const resolved = await resolvePricingPlansForBlock(
      {
        planSetSlug: p.planSetSlug,
        limit: p.limit > 0 ? p.limit : undefined,
        presetId: p.presetId,
        templateId: p.templateId,
        highlightedPlanId: p.highlightedPlanId,
      },
      { locale: activeLocale, localePrefix: activeLocale },
    );
    if (!resolved || resolved.planViewModels.length === 0) {
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
          planViewModels={resolved.planViewModels}
          features={resolved.features}
          currency={resolved.currency}
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
