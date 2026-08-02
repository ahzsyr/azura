"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useAdminFormDirtySync } from "@/hooks/use-admin-form";
import { useAdminUiStore } from "@/stores/admin-ui-store";
import type { LocaleConfig } from "@prisma/client";
import {
  deleteLocaleAction,
  reorderLocalesAction,
  setDefaultLocaleAction,
  toggleLocaleAction,
  upsertLocaleAction,
} from "@/features/i18n/actions";
import {
  exportLocaleBundleAction,
  scaffoldLocaleTranslationsAction,
} from "@/features/translation/actions";
import { AdminCardGrid } from "@/components/admin/layout/admin-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import {
  ArrowDown,
  ArrowUp,
  Download,
  Languages,
  Plus,
  Sparkles,
  X,
} from "lucide-react";
import { getCompletionTier } from "@/features/translation/completion-utils";
import { cn } from "@/lib/utils";

/** Valid for HTML pattern attribute (RegExp v-flag); unescaped trailing `-` in `[a-z0-9-]` is invalid. */
const LOCALE_SLUG_PATTERN = "[a-z0-9\\-]+";

type Props = {
  locales: LocaleConfig[];
  completionByLocale: Record<string, number>;
};

function newLocaleDraft(sortOrder: number): Partial<LocaleConfig> {
  return {
    sortOrder,
    dir: "ltr",
    flag: "🌐",
    currency: "USD",
    numberLocale: "en-US",
    dateLocale: "en-US",
  };
}

function CompletionRing({ percentage }: { percentage: number }) {
  const tier = getCompletionTier(percentage);
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;
  const strokeColors: Record<string, string> = {
    complete: "#059669",
    high: "#0284c7",
    medium: "#f59e0b",
    low: "#ea580c",
    critical: "#dc2626",
  };

  return (
    <div className="relative h-16 w-16 shrink-0">
      <svg className="h-16 w-16 -rotate-90" viewBox="0 0 64 64">
        <circle cx="32" cy="32" r={radius} fill="none" stroke="currentColor" strokeWidth="6" className="text-muted/30" />
        <circle
          cx="32"
          cy="32"
          r={radius}
          fill="none"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          stroke={strokeColors[tier]}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold tabular-nums">
        {percentage}%
      </span>
    </div>
  );
}

function LocaleFormFields({
  locale,
  codeReadOnly,
}: {
  locale?: Partial<LocaleConfig>;
  codeReadOnly?: boolean;
}) {

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div className="space-y-2">
        <Label>Code</Label>
        <Input
          name="code"
          placeholder="fr"
          required
          readOnly={codeReadOnly}
          defaultValue={locale?.code ?? ""}
          pattern={LOCALE_SLUG_PATTERN}
          className={codeReadOnly ? "bg-muted" : undefined}
        />
        <p className="text-xs text-muted-foreground">Messages and translation keys (e.g. fr, ar).</p>
      </div>
      <div className="space-y-2">
        <Label>URL prefix</Label>
        <Input
          name="urlPrefix"
          placeholder="fr"
          required
          defaultValue={locale?.urlPrefix ?? ""}
          pattern={LOCALE_SLUG_PATTERN}
        />
        <p className="text-xs text-muted-foreground">Public path segment (e.g. /fr/…).</p>
      </div>
      <div className="space-y-2">
        <Label>Label</Label>
        <Input name="label" placeholder="French" required defaultValue={locale?.label ?? ""} />
      </div>
      <div className="space-y-2">
        <Label>HTML lang</Label>
        <Input name="htmlLang" placeholder="fr" defaultValue={locale?.htmlLang ?? ""} />
      </div>
      <div className="space-y-2">
        <Label>Direction</Label>
        <select
          name="dir"
          className="w-full border rounded-md h-10 px-3 text-sm bg-background"
          defaultValue={locale?.dir ?? "ltr"}
        >
          <option value="ltr">LTR</option>
          <option value="rtl">RTL</option>
        </select>
      </div>
      <div className="space-y-2">
        <Label>Flag</Label>
        <Input name="flag" placeholder="🇫🇷" defaultValue={locale?.flag ?? "🌐"} />
      </div>
      <div className="space-y-2">
        <Label>Sort order</Label>
        <Input name="sortOrder" type="number" min={0} defaultValue={locale?.sortOrder ?? 0} />
      </div>
      <div className="space-y-2">
        <Label>Currency (ISO 4217)</Label>
        <Input
          name="currency"
          placeholder="USD"
          maxLength={3}
          defaultValue={locale?.currency ?? "USD"}
          className="uppercase"
        />
        <p className="text-xs text-muted-foreground">Default for price fields in the admin when this language is selected.</p>
      </div>
      <div className="space-y-2">
        <Label>Number locale</Label>
        <Input
          name="numberLocale"
          placeholder="en-US"
          defaultValue={locale?.numberLocale ?? "en-US"}
        />
      </div>
      <div className="space-y-2">
        <Label>Date locale</Label>
        <Input
          name="dateLocale"
          placeholder="en-US"
          defaultValue={locale?.dateLocale ?? "en-US"}
        />
      </div>
    </div>
  );
}

function LocaleFormDirtySync({ formRef, enabled }: { formRef: React.RefObject<HTMLFormElement | null>; enabled: boolean }) {
  useAdminFormDirtySync(formRef, enabled);
  return null;
}

export function LanguagesAdmin({ locales: initialLocales, completionByLocale }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addFormKey, setAddFormKey] = useState(0);
  const [orderedLocales, setOrderedLocales] = useState(initialLocales);
  const [editId, setEditId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const addFormRef = useRef<HTMLFormElement>(null);
  const editFormRef = useRef<HTMLFormElement>(null);
  const registerPageActions = useAdminUiStore((s) => s.registerPageActions);
  const clearPageActions = useAdminUiStore((s) => s.clearPageActions);
  const markSaved = useAdminUiStore((s) => s.markSaved);
  const setSaveStatus = useAdminUiStore((s) => s.setSaveStatus);

  useEffect(() => {
    setOrderedLocales(initialLocales);
  }, [initialLocales]);

  const refresh = () => router.refresh();

  const closeAddForm = useCallback(() => {
    setShowAddForm(false);
    setNotice(null);
    markSaved();
  }, [markSaved]);

  const openAddForm = useCallback(() => {
    setEditId(null);
    setNotice(null);
    setAddFormKey((key) => key + 1);
    setShowAddForm(true);
  }, []);

  const openEdit = useCallback((id: string) => {
    setShowAddForm(false);
    setNotice(null);
    setEditId(id);
  }, []);

  const handleCancelForm = useCallback(() => {
    if (editId) setEditId(null);
    if (showAddForm) closeAddForm();
    else markSaved();
  }, [editId, showAddForm, closeAddForm, markSaved]);

  const submitLocaleForm = useCallback(
    async (formData: FormData, mode: "add" | "edit") => {
      setSaveStatus("saving");
      setNotice(null);
      const submitStartedAt = Date.now();

      const result = await upsertLocaleAction(formData);


      if (!result.success) {
        setNotice(result.error ?? "Failed to save locale");
        setSaveStatus("error");
        if (result.error?.includes("already exists") || result.error?.includes("already used")) {
          refresh();
        }
        return;
      }

      if (mode === "add") {
        closeAddForm();
      } else {
        setEditId(null);
        markSaved();
      }

      setSaveStatus("saved");
      refresh();
    },
    [closeAddForm, markSaved, refresh, setSaveStatus]
  );

  const handleSaveForm = useCallback(async () => {
    const form = editId ? editFormRef.current : showAddForm ? addFormRef.current : null;
    if (!form) return false;
    form.requestSubmit();
    return true;
  }, [editId, showAddForm]);

  useEffect(() => {
    if (!editId && !showAddForm) {
      clearPageActions();
      return;
    }
    registerPageActions({
      onSave: handleSaveForm,
      onCancel: handleCancelForm,
      selfManagedSaveStatus: true,
      canCancel: true,
    });
    return () => clearPageActions();
  }, [
    editId,
    showAddForm,
    registerPageActions,
    clearPageActions,
    handleSaveForm,
    handleCancelForm,
  ]);

  const moveLocale = (index: number, direction: -1 | 1) => {
    const next = [...orderedLocales];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setOrderedLocales(next);
    startTransition(async () => {
      await reorderLocalesAction(next.map((l) => l.id));
      refresh();
    });
  };

  const handleScaffold = (code: string) => {
    if (!confirm(`Copy all English translations as drafts for "${code}"?`)) return;
    startTransition(async () => {
      const result = await scaffoldLocaleTranslationsAction(code);
      setNotice(`Scaffolded ${result.count} draft translations for ${code}.`);
      refresh();
    });
  };

  const handleExport = async (code: string) => {
    const bundle = await exportLocaleBundleAction(code);
    const blob = new Blob(
      [`--- messages/${code}.json ---\n`, bundle.messagesJson, `\n\n--- entity-translations.csv ---\n`, bundle.csv],
      { type: "text/plain" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${code}-export.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Languages className="h-4 w-4" />
            English-first content
          </CardTitle>
          <CardDescription className="text-sm leading-relaxed">
            English is the default language for the live site. Use the language menu in the admin top bar to
            edit other locales. Empty translations automatically fall back to English on the public site.
            UI strings come from committed <code className="text-xs">messages/{"{code}"}.json</code> files
            (deploy to update on production). Dynamic content uses EntityTranslation in the database. Set
            currency and number formatting per language below — price fields in the admin use these when that
            language is selected. After adding a language, use &ldquo;Scaffold translations&rdquo; to copy
            English content as drafts.
          </CardDescription>
        </CardHeader>
      </Card>

      {notice ? (
        <p className="text-sm text-amber-700 dark:text-amber-400 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
          {notice}
        </p>
      ) : null}

      <AdminCardGrid columns={3}>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Configured</CardDescription>
            <CardTitle className="text-3xl tabular-nums">{orderedLocales.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Enabled</CardDescription>
            <CardTitle className="text-3xl tabular-nums">
              {orderedLocales.filter((l) => l.isEnabled).length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>RTL</CardDescription>
            <CardTitle className="text-3xl tabular-nums">
              {orderedLocales.filter((l) => l.dir === "rtl").length}
            </CardTitle>
          </CardHeader>
        </Card>
      </AdminCardGrid>

      {showAddForm ? (
        <Card className="border-primary/30 shadow-sm">
          <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 pb-4">
            <div>
              <CardTitle>New language</CardTitle>
              <CardDescription>
                Add a locale for public URLs and translations. Code and URL prefix must be unique.
              </CardDescription>
            </div>
            <Button type="button" size="icon" variant="ghost" className="shrink-0" onClick={closeAddForm} aria-label="Close">
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <form
              key={`add-${addFormKey}`}
              ref={addFormRef}
              id="locale-add-form"
              action={(formData) => submitLocaleForm(formData, "add")}
              className="space-y-6"
            >
              <LocaleFormDirtySync formRef={addFormRef} enabled />
              <input type="hidden" name="isEnabled" value="true" />
              <input type="hidden" name="isDefault" value="false" />
              <LocaleFormFields locale={newLocaleDraft(orderedLocales.length)} />
              <div className="flex flex-wrap gap-2 border-t pt-4">
                <Button type="submit" disabled={pending}>
                  Create language
                </Button>
                <Button type="button" variant="outline" onClick={closeAddForm}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
          <div>
            <CardTitle>Languages</CardTitle>
            <CardDescription>Drag order with arrows, scaffold drafts, or export bundles.</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" asChild>
              <Link href="/admin/translations">
                <Languages className="h-4 w-4 me-1" />
                Translations
              </Link>
            </Button>
            <Button
              type="button"
              onClick={() => (showAddForm ? closeAddForm() : openAddForm())}
              disabled={pending || Boolean(editId)}
              variant={showAddForm ? "secondary" : "default"}
            >
              <Plus className="h-4 w-4 me-1" />
              {showAddForm ? "Close" : "Add language"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {orderedLocales.map((locale, index) => {
              const pct = completionByLocale[locale.code] ?? 0;
              const isEditing = editId === locale.id;

              return (
                <Card key={locale.id} className={cn(!locale.isEnabled && "opacity-60")}>
                  <CardContent className="pt-6 space-y-4">
                    <div className="flex items-start gap-4">
                      <CompletionRing percentage={pct} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-2xl">{locale.flag}</span>
                          <span className="font-semibold truncate">{locale.label}</span>
                          {locale.isDefault && (
                            <Badge variant="secondary" className="text-[10px]">
                              Default
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 font-mono">
                          {locale.code} · /{locale.urlPrefix} · {locale.dir.toUpperCase()}
                        </p>
                      </div>
                      <div className="flex flex-col gap-1">
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          disabled={index === 0 || pending || isEditing}
                          onClick={() => moveLocale(index, -1)}
                        >
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          disabled={index === orderedLocales.length - 1 || pending || isEditing}
                          onClick={() => moveLocale(index, 1)}
                        >
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {isEditing ? (
                      <form
                        key={`edit-${locale.id}`}
                        ref={editFormRef}
                        id="locale-edit-form"
                        action={(formData) => submitLocaleForm(formData, "edit")}
                        className="space-y-4 border-t pt-4"
                      >
                        <LocaleFormDirtySync formRef={editFormRef} enabled={isEditing} />
                        <input type="hidden" name="id" value={locale.id} />
                        <input type="hidden" name="isEnabled" value={locale.isEnabled ? "true" : "false"} />
                        <input type="hidden" name="isDefault" value={locale.isDefault ? "true" : "false"} />
                        <LocaleFormFields locale={locale} codeReadOnly />
                        <div className="flex flex-wrap gap-2">
                          <Button type="submit" size="sm" disabled={pending}>
                            Save changes
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditId(null);
                              markSaved();
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </form>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={showAddForm}
                          onClick={() => openEdit(locale.id)}
                        >
                          Edit
                        </Button>
                        {!locale.isDefault && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={pending || showAddForm}
                            onClick={() =>
                              startTransition(async () => {
                                await setDefaultLocaleAction(locale.id);
                                refresh();
                              })
                            }
                          >
                            Set default
                          </Button>
                        )}
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={pending || locale.isDefault || showAddForm}
                          onClick={() =>
                            startTransition(async () => {
                              await toggleLocaleAction(locale.id, !locale.isEnabled);
                              refresh();
                            })
                          }
                        >
                          {locale.isEnabled ? "Disable" : "Enable"}
                        </Button>
                        {!locale.isDefault && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={pending || showAddForm}
                            onClick={() => handleScaffold(locale.code)}
                          >
                            <Sparkles className="h-3.5 w-3.5 me-1" />
                            Scaffold
                          </Button>
                        )}
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={pending || showAddForm}
                          onClick={() => void handleExport(locale.code)}
                        >
                          <Download className="h-3.5 w-3.5 me-1" />
                          Export
                        </Button>
                        {!locale.isDefault && (
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            disabled={pending || showAddForm}
                            onClick={() => {
                              if (!confirm(`Delete locale "${locale.label}"?`)) return;
                              startTransition(async () => {
                                await deleteLocaleAction(locale.id);
                                refresh();
                              });
                            }}
                          >
                            Delete
                          </Button>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>
      <input ref={fileInputRef} type="file" accept=".json" className="hidden" />
    </div>
  );
}
