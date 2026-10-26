"use client";

import { useCallback, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, FileDown, Plus, Trash2 } from "lucide-react";
import type { SeoLlmsConfig, SeoLlmsLink, SeoLlmsSection } from "@/features/seo/types";
import {
  countLlmsDocument,
  formatLlmsTxt,
  normalizeLlmsDocument,
  parseLlmsTxt,
  validateLlmsDocument,
} from "@/features/seo/llms/llms-document";
import {
  generateLlmsDraftAction,
  publishLlmsTxtAction,
  upsertSeoLlmsAction,
} from "@/features/seo/actions";
import { AdminPageConfigRegistrar } from "@/components/admin/layout/admin-page-config-registrar";
import { runAdminAction } from "@/components/admin/layout/admin-action-toast";
import { saveIfNeededThenPublish } from "@/hooks/save-then-publish";
import { useAdminPageActions } from "@/hooks/use-admin-page-actions";
import { useAdminUiStore } from "@/stores/admin-ui-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type EditorMode = "structured" | "raw" | "preview";

type Props = {
  savedConfig: SeoLlmsConfig | null;
  initialDocument: SeoLlmsConfig;
  publicUrl: string;
  siteOrigin: string;
  embedded?: boolean;
};

function newId(prefix: string): string {
  const random = globalThis.crypto?.randomUUID?.();
  if (random) return `${prefix}-${random.slice(0, 8)}`;
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function moveItem<T>(items: T[], index: number, direction: -1 | 1): T[] {
  const target = index + direction;
  if (target < 0 || target >= items.length) return items;
  const next = [...items];
  [next[index], next[target]] = [next[target]!, next[index]!];
  return next;
}

function emptySection(): SeoLlmsSection {
  return { id: newId("section"), heading: "New section", links: [] };
}

function emptyLink(siteOrigin: string): SeoLlmsLink {
  return {
    id: newId("link"),
    title: "",
    url: `${siteOrigin.replace(/\/$/, "")}/`,
  };
}

export function LlmsTxtSettingsClient({
  savedConfig,
  initialDocument,
  publicUrl,
  siteOrigin,
  embedded = false,
}: Props) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const markSaved = useAdminUiStore((s) => s.markSaved);
  const setSaveStatus = useAdminUiStore((s) => s.setSaveStatus);
  const markUnsaved = useAdminUiStore((s) => s.markUnsaved);
  const [pending, startTransition] = useTransition();

  const [document, setDocument] = useState<SeoLlmsConfig>(() =>
    normalizeLlmsDocument(initialDocument),
  );
  const [mode, setMode] = useState<EditorMode>("structured");
  const [rawText, setRawText] = useState(() => formatLlmsTxt(initialDocument));
  const [rawErrors, setRawErrors] = useState<string[]>([]);
  const [serverErrors, setServerErrors] = useState<string[]>([]);
  const [draftWarnings, setDraftWarnings] = useState<string[]>([]);

  const validation = useMemo(
    () => validateLlmsDocument(document, { siteOrigin }),
    [document, siteOrigin],
  );
  const previewText = useMemo(() => formatLlmsTxt(document), [document]);
  const stats = useMemo(() => countLlmsDocument(document), [document]);
  const errors = [...validation.errors, ...rawErrors, ...serverErrors];

  const commit = useCallback(
    (updater: (previous: SeoLlmsConfig) => SeoLlmsConfig) => {
      setDocument((previous) => updater(previous));
      setServerErrors([]);
      setDraftWarnings([]);
      markUnsaved();
    },
    [markUnsaved],
  );

  const updateSection = useCallback(
    (sectionId: string, patch: Partial<SeoLlmsSection>) => {
      commit((previous) => ({
        ...previous,
        sections: previous.sections.map((section) =>
          section.id === sectionId ? { ...section, ...patch } : section,
        ),
      }));
    },
    [commit],
  );

  const updateLink = useCallback(
    (sectionId: string, linkId: string, patch: Partial<SeoLlmsLink>) => {
      commit((previous) => ({
        ...previous,
        sections: previous.sections.map((section) =>
          section.id === sectionId
            ? {
                ...section,
                links: section.links.map((link) =>
                  link.id === linkId ? { ...link, ...patch } : link,
                ),
              }
            : section,
        ),
      }));
    },
    [commit],
  );

  const selectMode = useCallback(
    (next: EditorMode) => {
      if (next === mode) return;
      if (mode === "raw" && next !== "raw") {
        const parsed = parseLlmsTxt(rawText);
        if (parsed.errors.length > 0) {
          setRawErrors(parsed.errors);
          setSaveStatus("error");
          return;
        }
        setRawErrors([]);
        setDocument((previous) => ({
          ...normalizeLlmsDocument(parsed.document),
          enabled: previous.enabled,
        }));
        markUnsaved();
      }
      if (next === "raw") {
        setRawText(formatLlmsTxt(document));
        setRawErrors([]);
      }
      setMode(next);
    },
    [document, markUnsaved, mode, rawText, setSaveStatus],
  );

  const handleRawChange = useCallback(
    (value: string) => {
      setRawText(value);
      markUnsaved();
      const parsed = parseLlmsTxt(value);
      setRawErrors(parsed.errors);
      if (parsed.errors.length === 0) {
        setDocument((previous) => ({
          ...normalizeLlmsDocument(parsed.document),
          enabled: previous.enabled,
        }));
      }
    },
    [markUnsaved],
  );

  const resolvePayload = useCallback((): SeoLlmsConfig | null => {
    if (mode !== "raw") return document;
    const parsed = parseLlmsTxt(rawText);
    if (parsed.errors.length > 0) {
      setRawErrors(parsed.errors);
      setSaveStatus("error");
      return null;
    }
    return {
      ...normalizeLlmsDocument(parsed.document),
      enabled: document.enabled,
    };
  }, [document, mode, rawText, setSaveStatus]);

  const handleSave = useCallback(async () => {
    const payload = resolvePayload();
    if (!payload) return false;
    const payloadValidation = validateLlmsDocument(payload, { siteOrigin });
    if (!payloadValidation.valid) {
      setServerErrors(payloadValidation.errors);
      setSaveStatus("error");
      return false;
    }

    setSaveStatus("saving");
    setServerErrors([]);
    const formData = new FormData(formRef.current ?? undefined);
    formData.set("document", JSON.stringify(payload));
    try {
      const result = await runAdminAction(
        "Saving llms.txt…",
        () => upsertSeoLlmsAction(formData),
        "llms.txt saved.",
      );
      if (result && result.ok === false) {
        setServerErrors(result.errors ?? [result.message]);
        setSaveStatus("error");
        return false;
      }
      setDocument(payload);
      setRawText(formatLlmsTxt(payload));
      markSaved();
      router.refresh();
      return true;
    } catch {
      setSaveStatus("error");
      return false;
    }
  }, [markSaved, resolvePayload, router, setSaveStatus, siteOrigin]);

  const handleCancel = useCallback(() => {
    const saved = savedConfig
      ? normalizeLlmsDocument(savedConfig)
      : normalizeLlmsDocument(initialDocument);
    setDocument(saved);
    setRawText(formatLlmsTxt(saved));
    setRawErrors([]);
    setServerErrors([]);
    setDraftWarnings([]);
    setMode("structured");
    markSaved();
  }, [initialDocument, markSaved, savedConfig]);

  const handlePublish = useCallback(async () => {
    await saveIfNeededThenPublish(handleSave, publishLlmsTxtAction);
  }, [handleSave]);

  const handleGenerateDraft = useCallback(() => {
    if (document.sections.some((section) => section.links.length > 0)) {
      const confirmed = window.confirm(
        "Replace the current editor content with a generated draft from published content?",
      );
      if (!confirmed) return;
    }
    startTransition(async () => {
      try {
        const result = await runAdminAction(
          "Generating llms.txt draft…",
          () => generateLlmsDraftAction(),
          "Draft generated.",
        );
        if (result?.document) {
          const next = normalizeLlmsDocument(result.document);
          setDocument(next);
          setRawText(formatLlmsTxt(next));
          setDraftWarnings(result.warnings ?? []);
          setServerErrors([]);
          setRawErrors([]);
          setMode("structured");
          markUnsaved();
        }
      } catch {
        // Toast already shows the error.
      }
    });
  }, [document.sections, markUnsaved]);

  useAdminPageActions({
    ownerKey: "seo-llms",
    scope: "settings",
    priority: 0,
    onSave: handleSave,
    onPublish: handlePublish,
    onCancel: handleCancel,
    saveStatusMode: "self-managed",
  });

  const addSection = useCallback(() => {
    commit((previous) => ({ ...previous, sections: [...previous.sections, emptySection()] }));
  }, [commit]);

  const addLink = useCallback(
    (sectionId: string) => {
      commit((previous) => ({
        ...previous,
        sections: previous.sections.map((section) =>
          section.id === sectionId
            ? { ...section, links: [...section.links, emptyLink(siteOrigin)] }
            : section,
        ),
      }));
    },
    [commit, siteOrigin],
  );

  return (
    <div className={embedded ? "space-y-6" : "mx-auto max-w-5xl space-y-6"}>
      <AdminPageConfigRegistrar configKey="settingsSavePublish" />
      {embedded ? null : (
        <div>
          <Link href="/admin/seo" className="text-sm text-primary hover:underline">
            ← SEO Dashboard
          </Link>
          <h1 className="font-heading mt-2 text-3xl font-semibold">LLMs.txt</h1>
          <p className="mt-1 text-muted-foreground">
            Publish an <code>/llms.txt</code> map of canonical public content for AI assistants.
            Use the structured editor or edit the raw markdown directly.
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {(
          [
            ["structured", "Structured editor"],
            ["raw", "Raw markdown"],
            ["preview", "Preview"],
          ] as const
        ).map(([value, label]) => (
          <Button
            key={value}
            type="button"
            size="sm"
            variant={mode === value ? "default" : "outline"}
            onClick={() => selectMode(value)}
          >
            {label}
          </Button>
        ))}
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={handleGenerateDraft}
        >
          <FileDown className="mr-1 h-4 w-4" />
          {pending ? "Generating…" : "Generate draft from published content"}
        </Button>
      </div>

      {errors.length > 0 ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm">
          <p className="font-medium">Fix these issues before saving:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {[...new Set(errors)].map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {validation.warnings.length > 0 || draftWarnings.length > 0 ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <p className="font-medium">Warnings</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {[...new Set([...validation.warnings, ...draftWarnings])].map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <form
        ref={formRef}
        id="llms-txt-form"
        onSubmit={(event) => {
          event.preventDefault();
          void handleSave();
        }}
        className="space-y-6"
      >
        <input type="hidden" name="document" value={JSON.stringify(document)} readOnly />
        <input type="hidden" name="enabled" value={String(document.enabled)} readOnly />

        {mode === "structured" ? (
          <>
            <section className="space-y-4 rounded-xl border p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">Document header</h2>
                  <p className="text-sm text-muted-foreground">
                    The H1 title and summary are the first thing an AI assistant reads.
                  </p>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={document.enabled}
                    onChange={(event) => {
                      const enabled = event.target.checked;
                      commit((previous) => ({ ...previous, enabled }));
                    }}
                  />
                  Serve /llms.txt publicly
                </label>
              </div>

              <div className="space-y-2">
                <Label htmlFor="llms-title">Title</Label>
                <Input
                  id="llms-title"
                  value={document.title}
                  maxLength={200}
                  onChange={(event) =>
                    commit((previous) => ({ ...previous, title: event.target.value }))
                  }
                  placeholder="Site or brand name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="llms-summary">Summary</Label>
                <Textarea
                  id="llms-summary"
                  rows={3}
                  maxLength={500}
                  value={document.summary ?? ""}
                  onChange={(event) =>
                    commit((previous) => ({ ...previous, summary: event.target.value }))
                  }
                  placeholder="A short blockquote summary of the site."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="llms-details">Optional details</Label>
                <Textarea
                  id="llms-details"
                  rows={4}
                  maxLength={5000}
                  value={document.details ?? ""}
                  onChange={(event) =>
                    commit((previous) => ({ ...previous, details: event.target.value }))
                  }
                  placeholder="Additional context before the first section."
                />
              </div>
            </section>

            <section className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">Sections and links</h2>
                  <p className="text-sm text-muted-foreground">
                    {stats.sections} section{stats.sections === 1 ? "" : "s"} · {stats.links} link
                    {stats.links === 1 ? "" : "s"}
                  </p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addSection}>
                  <Plus className="mr-1 h-4 w-4" />
                  Add section
                </Button>
              </div>

              {document.sections.length === 0 ? (
                <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
                  No sections yet. Generate a draft from published content or add a section manually.
                </div>
              ) : null}

              {document.sections.map((section, sectionIndex) => (
                <div key={section.id} className="space-y-4 rounded-xl border p-5">
                  <div className="flex flex-wrap items-end gap-2">
                    <div className="min-w-[16rem] flex-1 space-y-2">
                      <Label htmlFor={`section-heading-${section.id}`}>Section heading</Label>
                      <Input
                        id={`section-heading-${section.id}`}
                        value={section.heading}
                        maxLength={120}
                        onChange={(event) =>
                          updateSection(section.id, { heading: event.target.value })
                        }
                      />
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Move section ${section.heading} up`}
                        disabled={sectionIndex === 0}
                        onClick={() =>
                          commit((previous) => ({
                            ...previous,
                            sections: moveItem(previous.sections, sectionIndex, -1),
                          }))
                        }
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Move section ${section.heading} down`}
                        disabled={sectionIndex === document.sections.length - 1}
                        onClick={() =>
                          commit((previous) => ({
                            ...previous,
                            sections: moveItem(previous.sections, sectionIndex, 1),
                          }))
                        }
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Remove section ${section.heading}`}
                        onClick={() =>
                          commit((previous) => ({
                            ...previous,
                            sections: previous.sections.filter((item) => item.id !== section.id),
                          }))
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`section-body-${section.id}`}>Section text (optional)</Label>
                    <Textarea
                      id={`section-body-${section.id}`}
                      rows={2}
                      maxLength={2000}
                      value={section.body ?? ""}
                      onChange={(event) =>
                        updateSection(section.id, { body: event.target.value })
                      }
                      placeholder="Short paragraph shown under the heading."
                    />
                  </div>

                  <div className="space-y-3">
                    {section.links.map((link, linkIndex) => (
                      <div
                        key={link.id}
                        className={cn(
                          "space-y-2 rounded-lg border bg-muted/20 p-3",
                          !link.url.trim() || !link.title.trim() ? "border-amber-300" : "",
                        )}
                      >
                        <div className="grid gap-2 sm:grid-cols-2">
                          <div className="space-y-1">
                            <Label htmlFor={`link-title-${link.id}`}>Link title</Label>
                            <Input
                              id={`link-title-${link.id}`}
                              value={link.title}
                              maxLength={200}
                              onChange={(event) =>
                                updateLink(section.id, link.id, { title: event.target.value })
                              }
                              placeholder="Page title"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor={`link-url-${link.id}`}>Absolute URL</Label>
                            <Input
                              id={`link-url-${link.id}`}
                              value={link.url}
                              onChange={(event) =>
                                updateLink(section.id, link.id, { url: event.target.value })
                              }
                              placeholder={`${siteOrigin}/about`}
                              className="font-mono text-xs"
                            />
                          </div>
                        </div>
                        <div className="flex flex-wrap items-end gap-2">
                          <div className="min-w-[16rem] flex-1 space-y-1">
                            <Label htmlFor={`link-description-${link.id}`}>
                              Description (optional)
                            </Label>
                            <Input
                              id={`link-description-${link.id}`}
                              value={link.description ?? ""}
                              maxLength={300}
                              onChange={(event) =>
                                updateLink(section.id, link.id, {
                                  description: event.target.value,
                                })
                              }
                              placeholder="One short sentence."
                            />
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              aria-label={`Move link ${link.title || linkIndex + 1} up`}
                              disabled={linkIndex === 0}
                              onClick={() =>
                                commit((previous) => ({
                                  ...previous,
                                  sections: previous.sections.map((item) =>
                                    item.id === section.id
                                      ? { ...item, links: moveItem(item.links, linkIndex, -1) }
                                      : item,
                                  ),
                                }))
                              }
                            >
                              <ArrowUp className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              aria-label={`Move link ${link.title || linkIndex + 1} down`}
                              disabled={linkIndex === section.links.length - 1}
                              onClick={() =>
                                commit((previous) => ({
                                  ...previous,
                                  sections: previous.sections.map((item) =>
                                    item.id === section.id
                                      ? { ...item, links: moveItem(item.links, linkIndex, 1) }
                                      : item,
                                  ),
                                }))
                              }
                            >
                              <ArrowDown className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              aria-label={`Remove link ${link.title || linkIndex + 1}`}
                              onClick={() =>
                                commit((previous) => ({
                                  ...previous,
                                  sections: previous.sections.map((item) =>
                                    item.id === section.id
                                      ? {
                                          ...item,
                                          links: item.links.filter((entry) => entry.id !== link.id),
                                        }
                                      : item,
                                  ),
                                }))
                              }
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addLink(section.id)}
                    >
                      <Plus className="mr-1 h-4 w-4" />
                      Add link
                    </Button>
                  </div>
                </div>
              ))}
            </section>
          </>
        ) : null}

        {mode === "raw" ? (
          <section className="space-y-3 rounded-xl border p-6">
            <div>
              <h2 className="text-lg font-semibold">Raw markdown</h2>
              <p className="text-sm text-muted-foreground">
                Edit the file directly. Saving parses this markdown back into sections and links.
              </p>
            </div>
            <Textarea
              value={rawText}
              onChange={(event) => handleRawChange(event.target.value)}
              rows={24}
              className="font-mono text-xs"
              spellCheck={false}
              aria-label="Raw llms.txt markdown"
            />
            {rawErrors.length > 0 ? (
              <div className="rounded-lg border border-destructive/40 px-3 py-2 text-sm text-destructive">
                {rawErrors.map((error) => (
                  <p key={error}>{error}</p>
                ))}
              </div>
            ) : null}
          </section>
        ) : null}

        {mode === "preview" ? (
          <section className="space-y-3 rounded-xl border p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Preview</h2>
                <p className="text-sm text-muted-foreground">
                  {stats.sections} section{stats.sections === 1 ? "" : "s"} · {stats.links} link
                  {stats.links === 1 ? "" : "s"} · {stats.bytes.toLocaleString()} bytes
                </p>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href={publicUrl} target="_blank" rel="noopener noreferrer">
                  Open public file
                </Link>
              </Button>
            </div>
            <pre className="max-h-[32rem] overflow-auto rounded-lg border bg-muted/40 p-4 text-xs font-mono whitespace-pre-wrap">
              {previewText}
            </pre>
            <p className="text-xs text-muted-foreground">
              Preview reflects the editor, not the last saved file.
            </p>
          </section>
        ) : null}
      </form>
    </div>
  );
}
