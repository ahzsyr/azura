import Link from "next/link";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { cmsRepository } from "@/repositories/cms.repository";
import { localeService } from "@/features/i18n/locale.service";
import { resolveTranslation } from "@/features/translation/translation-resolver";
import { AdminPageHeader } from "@/components/admin/layout/admin-content-area";
import { Button } from "@/components/ui/button";
import { CmsPagesTable, type CmsPageListRow } from "@/features/cms/components/cms-pages-table";

export type LegalPageKind = "policies" | "terms";

const POLICY_SLUGS = new Set([
  "privacy",
  "privacy-policy",
  "cookie-policy",
  "cookies",
  "refund-policy",
  "shipping-policy",
  "return-policy",
  "policies",
]);

const TERMS_SLUGS = new Set([
  "terms",
  "terms-of-service",
  "terms-and-conditions",
  "tos",
  "terms-of-use",
]);

const COPY: Record<
  LegalPageKind,
  { title: string; description: string; empty: string; createLabel: string }
> = {
  policies: {
    title: "Policies",
    description: "Privacy, cookie, and other policy pages shown on the public site.",
    empty: "No policy pages yet. Create a privacy policy or another legal policy page.",
    createLabel: "New policy page",
  },
  terms: {
    title: "Terms & Conditions",
    description: "Terms of service and related legal condition pages.",
    empty: "No terms pages yet. Create a terms & conditions page.",
    createLabel: "New terms page",
  },
};

function matchesKind(slug: string, title: string, kind: LegalPageKind): boolean {
  const haystack = `${slug} ${title}`.toLowerCase();
  if (kind === "policies") {
    return POLICY_SLUGS.has(slug) || /privacy|polic|cookie|gdpr|refund|shipping/.test(haystack);
  }
  return TERMS_SLUGS.has(slug) || /term|condition|\btos\b/.test(haystack);
}

export async function LegalCmsPagesPage({ kind }: { kind: LegalPageKind }) {
  const copy = COPY[kind];
  const pages = await cmsRepository.listPages();
  const enabledLocales = await localeService.listEnabled();
  const defaultCode = enabledLocales.find((locale) => locale.isDefault)?.code ?? "en";
  const translations = pages.length
    ? await prisma.entityTranslation.findMany({
        where: { entityType: "CmsPage", entityId: { in: pages.map((page) => page.id) }, field: "title" },
      })
    : [];
  const byPage = new Map<string, typeof translations>();
  for (const row of translations) {
    const list = byPage.get(row.entityId) ?? [];
    list.push(row);
    byPage.set(row.entityId, list);
  }

  const rows: CmsPageListRow[] = pages
    .map((page) => {
      const displayTitle = resolveTranslation("title", defaultCode, {
        translations: byPage.get(page.id),
      });
      return { ...page, displayTitle };
    })
    .filter((page) => matchesKind(page.slug, page.displayTitle ?? "", kind));

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={copy.title}
        description={copy.description}
        actions={
          <Button asChild>
            <Link href="/admin/pages/new">
              <Plus className="h-4 w-4 me-1" />
              {copy.createLabel}
            </Link>
          </Button>
        }
      />
      <CmsPagesTable pages={rows} emptyMessage={copy.empty} />
    </div>
  );
}
