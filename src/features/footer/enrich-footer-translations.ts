import "server-only";

import { createHash } from "crypto";
import { unstable_cache } from "next/cache";
import { localeService } from "@/features/i18n/locale.service";
import { resolvePrefixToCode } from "@/i18n/locale-config";
import {
  loadWorkspaceTranslations,
  resolveWorkspaceField,
  type WorkspaceTranslationBundle,
} from "@/features/translation/workspace-translation.service";
import {
  makeFooterColumnEntityId,
  makeFooterEntityId,
  makeFooterLinkEntityId,
} from "@/features/translation/workspace-entity-ids";
import type { FooterColumn, FooterLink, FooterWorkspace } from "./types";
import { collectFooterTranslationRefs } from "./footer-translation-refs";

export { collectFooterTranslationRefs };

function localizeLink(
  link: FooterLink,
  columnId: string,
  linkIndex: number,
  languageCode: string,
  enabledLocales: Awaited<ReturnType<typeof localeService.listEnabled>>,
  bundle: WorkspaceTranslationBundle,
  defaultCode?: string
): FooterLink {
  return {
    ...link,
    label:
      resolveWorkspaceField(
        bundle,
        "FooterLink",
        makeFooterLinkEntityId(columnId, String(linkIndex)),
        "label",
        languageCode,
        enabledLocales,
        defaultCode,
        link.label
      ) || link.label,
  };
}

function localizeColumn(
  col: FooterColumn,
  languageCode: string,
  enabledLocales: Awaited<ReturnType<typeof localeService.listEnabled>>,
  bundle: WorkspaceTranslationBundle,
  defaultCode?: string
): FooterColumn {
  const entityId = makeFooterColumnEntityId(col.id);
  return {
    ...col,
    title:
      resolveWorkspaceField(
        bundle,
        "FooterColumn",
        entityId,
        "heading",
        languageCode,
        enabledLocales,
        defaultCode,
        col.title
      ) || col.title,
    body:
      resolveWorkspaceField(
        bundle,
        "FooterColumn",
        entityId,
        "body",
        languageCode,
        enabledLocales,
        defaultCode,
        col.body
      ) || col.body,
    links: (col.links ?? []).map((link, index) =>
      localizeLink(link, col.id, index, languageCode, enabledLocales, bundle, defaultCode)
    ),
  };
}

export async function enrichFooterWorkspaceWithTranslations(
  ws: FooterWorkspace,
  localePrefix: string
): Promise<FooterWorkspace> {
  const enabledLocales = await localeService.listEnabled();
  const bundle = await loadWorkspaceTranslations(collectFooterTranslationRefs(ws));
  const languageCode = resolvePrefixToCode(localePrefix, enabledLocales);
  const defaultCode = enabledLocales.find((l) => l.isDefault)?.code;
  const footerEntityId = makeFooterEntityId();

  return {
    ...ws,
    columns: (ws.columns ?? []).map((col) =>
      localizeColumn(col, languageCode, enabledLocales, bundle, defaultCode)
    ),
    copyright: {
      ...ws.copyright,
      rightsText:
        resolveWorkspaceField(
          bundle,
          "Footer",
          footerEntityId,
          "copyrightText",
          languageCode,
          enabledLocales,
          defaultCode,
          ws.copyright?.rightsText
        ) || ws.copyright?.rightsText,
      suffix:
        resolveWorkspaceField(
          bundle,
          "Footer",
          footerEntityId,
          "tagline",
          languageCode,
          enabledLocales,
          defaultCode,
          ws.copyright?.suffix
        ) || ws.copyright?.suffix,
    },
  };
}

function footerWorkspaceFingerprint(ws: FooterWorkspace): string {
  const payload = JSON.stringify({
    columns: ws.columns,
    copyright: ws.copyright,
  });
  return createHash("sha256").update(payload).digest("hex").slice(0, 24);
}

export async function enrichFooterWorkspaceForSiteCached(
  ws: FooterWorkspace,
  localeCode: string
): Promise<FooterWorkspace> {
  const fingerprint = footerWorkspaceFingerprint(ws);
  return unstable_cache(
    async () => enrichFooterWorkspaceWithTranslations(ws, localeCode),
    ["footer-translations", localeCode, fingerprint],
    { tags: ["footer-workspace", `footer-translations-${localeCode}`], revalidate: 300 }
  )();
}
