"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { LocaleConfig } from "@prisma/client";
import type { PublicLocale } from "@/i18n/locale-config";
import {
  deleteLocaleAction,
  reorderLocalesAction,
  setDefaultLocaleAction,
  toggleLocaleAction,
  upsertLocaleAction,
} from "@/features/i18n/actions";
import {
  exportLocaleBundleAction,
  getLocaleCompletionAction,
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
} from "lucide-react";
import { getCompletionTier } from "@/features/translation/completion-utils";
import { cn } from "@/lib/utils";

type Props = {
  locales: LocaleConfig[];
  completionByLocale: Record<string, number>;
};

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
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <div className="space-y-2">
        <Label>Code</Label>
        <Input
          name="code"
          placeholder="en"
          required
          readOnly={codeReadOnly}
          defaultValue={locale?.code ?? ""}
          pattern="[a-z0-9-]+"
          className={codeReadOnly ? "bg-muted" : undefined}
        />
      </div>
      <div className="space-y-2">
        <Label>URL prefix</Label>
        <Input name="urlPrefix" placeholder="en" required defaultValue={locale?.urlPrefix ?? ""} pattern="[a-z0-9-]+" />
      </div>
      <div className="space-y-2">
        <Label>Label</Label>
        <Input name="label" placeholder="English" required defaultValue={locale?.label ?? ""} />
      </div>
      <div className="space-y-2">
        <Label>HTML lang</Label>
        <Input name="htmlLang" placeholder="en" defaultValue={locale?.htmlLang ?? locale?.urlPrefix ?? ""} />
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
        <Input name="flag" placeholder="🇺🇸" defaultValue={locale?.flag ?? "🌐"} />
      </div>
      <div className="space-y-2">
        <Label>Sort order</Label>
        <Input name="sortOrder" type="number" defaultValue={locale?.sortOrder ?? 0} />
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

export function LanguagesAdmin({ locales: initialLocales, completionByLocale }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [orderedLocales, setOrderedLocales] = useState(initialLocales);
  const [editId, setEditId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refresh = () => router.refresh();

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
            Set currency and number formatting per language below — price fields in the admin use these when
            that language is selected. After adding a language, use &ldquo;Scaffold translations&rdquo; to copy
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
            <Button type="button" onClick={() => setShowAddForm((v) => !v)} disabled={pending}>
              <Plus className="h-4 w-4 me-1" />
              Add language
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {showAddForm ? (
            <form
              action={async (formData) => {
                try {
                  await upsertLocaleAction(formData);
                  setShowAddForm(false);
                  refresh();
                } catch (err) {
                  setNotice(err instanceof Error ? err.message : "Failed to add locale");
                }
              }}
              className="rounded-lg border border-dashed p-4 space-y-4"
            >
              <input type="hidden" name="isEnabled" value="true" />
              <LocaleFormFields locale={{ sortOrder: orderedLocales.length }} />
              <Button type="submit" disabled={pending}>
                Create language
              </Button>
            </form>
          ) : null}

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
                          disabled={index === 0 || pending}
                          onClick={() => moveLocale(index, -1)}
                        >
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          disabled={index === orderedLocales.length - 1 || pending}
                          onClick={() => moveLocale(index, 1)}
                        >
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {isEditing ? (
                      <form
                        action={async (formData) => {
                          try {
                            await upsertLocaleAction(formData);
                            setEditId(null);
                            refresh();
                          } catch (err) {
                            setNotice(err instanceof Error ? err.message : "Failed to update");
                          }
                        }}
                        className="space-y-3 border-t pt-3"
                      >
                        <input type="hidden" name="id" value={locale.id} />
                        <input type="hidden" name="isEnabled" value={locale.isEnabled ? "true" : "false"} />
                        <LocaleFormFields locale={locale} codeReadOnly />
                        <div className="flex gap-2">
                          <Button type="submit" size="sm" disabled={pending}>
                            Save
                          </Button>
                          <Button type="button" size="sm" variant="outline" onClick={() => setEditId(null)}>
                            Cancel
                          </Button>
                        </div>
                      </form>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" size="sm" variant="outline" onClick={() => setEditId(locale.id)}>
                          Edit
                        </Button>
                        {!locale.isDefault && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={pending}
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
                          disabled={pending || locale.isDefault}
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
                            disabled={pending}
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
                          disabled={pending}
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
                            disabled={pending}
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
