"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { SeoSitemapConfig, SeoSitemapPreviewEntry } from "@/features/seo/types";
import { upsertSeoSitemapAction } from "@/features/seo/actions";
import {
  formatPathForDisplay,
  normalizeAbsoluteSitemapUrl,
  normalizeSitemapPath,
  pathFromSitemapUrl,
} from "@/features/seo/sitemap-path-utils";
import { useAdminFormDirtySync } from "@/hooks/use-admin-form";
import { useAdminUiStore } from "@/stores/admin-ui-store";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type StaticPageOption = {
  pageKey: string;
  label: string;
  path: string;
};

type Props = {
  config: SeoSitemapConfig;
  sitemapUrl: string;
  siteOrigin: string;
  localePrefixes: string[];
  entries: SeoSitemapPreviewEntry[];
  sitemapXml: string;
  staticPages: StaticPageOption[];
};

function linesToList(text: string): string[] {
  const out: string[] = [];
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (!out.includes(trimmed)) out.push(trimmed);
  }
  return out;
}

function listToLines(list: string[]): string {
  return list.map(formatPathForDisplay).join("\n");
}

function normalizeExcludeDisplay(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return normalizeAbsoluteSitemapUrl(trimmed);
  return formatPathForDisplay(normalizeSitemapPath(trimmed));
}

export function SitemapSettingsClient({
  config,
  sitemapUrl,
  siteOrigin,
  localePrefixes,
  entries,
  sitemapXml,
  staticPages,
}: Props) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const registerPageActions = useAdminUiStore((s) => s.registerPageActions);
  const clearPageActions = useAdminUiStore((s) => s.clearPageActions);
  const markSaved = useAdminUiStore((s) => s.markSaved);
  const setSaveStatus = useAdminUiStore((s) => s.setSaveStatus);
  const markUnsaved = useAdminUiStore((s) => s.markUnsaved);

  const [excludeText, setExcludeText] = useState(listToLines(config.excludePaths ?? []));
  const [extraText, setExtraText] = useState(listToLines(config.extraPaths ?? []));
  const [previewFilter, setPreviewFilter] = useState("");
  const [previewMode, setPreviewMode] = useState<"urls" | "xml">("urls");

  useEffect(() => {
    setExcludeText(listToLines(config.excludePaths ?? []));
    setExtraText(listToLines(config.extraPaths ?? []));
  }, [config.excludePaths, config.extraPaths]);

  useAdminFormDirtySync(formRef);

  const excludeSet = useMemo(() => {
    const set = new Set<string>();
    for (const line of linesToList(excludeText)) {
      const display = normalizeExcludeDisplay(line);
      set.add(display);
      if (display === "/") set.add("");
      if (/^https?:\/\//i.test(line)) {
        set.add(normalizeAbsoluteSitemapUrl(line));
      } else {
        set.add(normalizeSitemapPath(line));
      }
    }
    return set;
  }, [excludeText]);

  const filteredEntries = useMemo(() => {
    const q = previewFilter.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter((e) => e.url.toLowerCase().includes(q));
  }, [entries, previewFilter]);

  const addExclude = useCallback(
    (value: string) => {
      const display = normalizeExcludeDisplay(value);
      if (!display && value.trim() !== "/" && value.trim() !== "") return;
      const current = linesToList(excludeText).map(normalizeExcludeDisplay);
      if (current.includes(display)) return;
      setExcludeText(listToLines([...current, display === "/" ? "" : display]));
      markUnsaved();
    },
    [excludeText, markUnsaved],
  );

  const handleSave = useCallback(async () => {
    formRef.current?.requestSubmit();
  }, []);

  const handleCancel = useCallback(() => {
    setExcludeText(listToLines(config.excludePaths ?? []));
    setExtraText(listToLines(config.extraPaths ?? []));
    formRef.current?.reset();
  }, [config.excludePaths, config.extraPaths]);

  useEffect(() => {
    registerPageActions({
      onSave: handleSave,
      onCancel: handleCancel,
      selfManagedSaveStatus: true,
    });
    return () => clearPageActions();
  }, [registerPageActions, clearPageActions, handleSave, handleCancel]);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <Link href="/admin/seo/metadata" className="text-sm text-primary hover:underline">
          ← SEO Dashboard
        </Link>
        <h1 className="font-heading mt-2 text-3xl font-semibold">Sitemap</h1>
        <p className="mt-1 text-muted-foreground">
          Preview the live <code>/sitemap.xml</code>, exclude paths/URLs/pages, or add extra
          entries. Relative paths expand for every enabled locale; absolute{" "}
          <code>https://</code> URLs are treated as exact matches.
        </p>
      </div>

      <section className="space-y-3 rounded-xl border p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Current sitemap</h2>
            <p className="text-sm text-muted-foreground">
              {entries.length} URL{entries.length === 1 ? "" : "s"} ·{" "}
              <a
                href={sitemapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-primary hover:underline"
              >
                {sitemapUrl}
              </a>
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant={previewMode === "urls" ? "default" : "outline"}
              size="sm"
              onClick={() => setPreviewMode("urls")}
            >
              URLs
            </Button>
            <Button
              type="button"
              variant={previewMode === "xml" ? "default" : "outline"}
              size="sm"
              onClick={() => setPreviewMode("xml")}
            >
              XML
            </Button>
          </div>
        </div>

        {previewMode === "urls" ? (
          <>
            <Input
              value={previewFilter}
              onChange={(e) => setPreviewFilter(e.target.value)}
              placeholder="Filter URLs…"
              className="max-w-md"
            />
            <div className="max-h-[28rem] overflow-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-muted/90 backdrop-blur">
                  <tr className="border-b text-left">
                    <th className="px-3 py-2 font-medium">URL</th>
                    <th className="px-3 py-2 font-medium">Exclude</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEntries.length === 0 ? (
                    <tr>
                      <td colSpan={2} className="px-3 py-6 text-muted-foreground">
                        No URLs match this filter.
                      </td>
                    </tr>
                  ) : (
                    filteredEntries.map((entry) => {
                      const path = pathFromSitemapUrl(entry.url, siteOrigin, localePrefixes);
                      const pathLabel = path === null ? null : formatPathForDisplay(path);
                      const urlExcluded = excludeSet.has(
                        normalizeAbsoluteSitemapUrl(entry.url),
                      );
                      const pathExcluded =
                        path !== null &&
                        (excludeSet.has(path) || excludeSet.has(formatPathForDisplay(path)));

                      return (
                        <tr key={entry.url} className="border-b last:border-0">
                          <td className="px-3 py-2 align-top">
                            <a
                              href={entry.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="break-all font-mono text-xs text-primary hover:underline"
                            >
                              {entry.url}
                            </a>
                          </td>
                          <td className="px-3 py-2 align-top">
                            <div className="flex flex-wrap gap-2">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={urlExcluded}
                                onClick={() => addExclude(entry.url)}
                              >
                                {urlExcluded ? "URL excluded" : "Exclude URL"}
                              </Button>
                              {pathLabel !== null ? (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  disabled={pathExcluded}
                                  onClick={() => addExclude(pathLabel)}
                                >
                                  {pathExcluded
                                    ? "Path excluded"
                                    : `Exclude path (${pathLabel})`}
                                </Button>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <pre className="max-h-[28rem] overflow-auto rounded-lg border bg-muted/40 p-4 text-xs font-mono whitespace-pre-wrap">
            {sitemapXml}
          </pre>
        )}
        <p className="text-xs text-muted-foreground">
          Preview reflects the last saved config. Click Save after changing excludes/extras to
          refresh.
        </p>
      </section>

      <section className="space-y-3 rounded-xl border p-6">
        <h2 className="text-lg font-semibold">Exclude pages (quick)</h2>
        <p className="text-sm text-muted-foreground">
          Click a static marketing page to exclude it for all locales (same as adding its path
          below).
        </p>
        <div className="flex flex-wrap gap-2">
          {staticPages.map((page) => {
            const pathKey = page.path === "/" ? "" : page.path;
            const excluded =
              excludeSet.has(pathKey) ||
              excludeSet.has(page.path) ||
              (page.path === "/" && excludeSet.has(""));
            return (
              <Button
                key={page.pageKey}
                type="button"
                size="sm"
                variant={excluded ? "secondary" : "outline"}
                disabled={excluded}
                onClick={() => addExclude(page.path)}
              >
                {excluded ? `✓ ${page.label}` : page.label}
              </Button>
            );
          })}
        </div>
      </section>

      <form
        ref={formRef}
        id="sitemap-settings-form"
        action={async (formData) => {
          setSaveStatus("saving");
          try {
            await upsertSeoSitemapAction(formData);
            markSaved();
            router.refresh();
          } catch {
            setSaveStatus("error");
          }
        }}
        className="space-y-4 rounded-xl border p-6"
      >
        <h2 className="text-lg font-semibold">Manual overrides</h2>
        <div className="space-y-2">
          <Label>Exclude paths or URLs</Label>
          <Textarea
            name="excludePaths"
            rows={8}
            value={excludeText}
            onChange={(e) => {
              setExcludeText(e.target.value);
              markUnsaved();
            }}
            placeholder={"/favorites\n/account\nhttps://example.com/en/compare"}
          />
          <p className="text-xs text-muted-foreground">
            One per line. A path like <code>/favorites</code> removes every locale variant. A full
            URL removes that exact entry only. Use <code>/</code> for the home page.
          </p>
        </div>
        <div className="space-y-2">
          <Label>Extra paths / URLs</Label>
          <Textarea
            name="extraPaths"
            rows={6}
            value={extraText}
            onChange={(e) => {
              setExtraText(e.target.value);
              markUnsaved();
            }}
            placeholder={"/landing\nhttps://partner.example.com/page"}
          />
          <p className="text-xs text-muted-foreground">
            Always included. Paths starting with <code>/</code> get one URL per locale; full{" "}
            <code>http(s)://</code> URLs are inserted as-is.
          </p>
        </div>
      </form>
    </div>
  );
}
