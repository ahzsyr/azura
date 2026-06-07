"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ExternalLink, MessageCircle, Phone } from "lucide-react";
import type { PublicLocale } from "@/i18n/locale-config";
import { upsertUiMessageAction } from "@/features/translation/actions";
import { AdminSettingsLayout } from "@/components/admin/layout/admin-settings-layout";
import { AdminCollapsibleSection } from "@/components/admin/layout/admin-collapsible-section";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { OptionButtonGroup } from "@/features/navigation/admin/header-builder-ui";
import { WhatsAppAppearanceFields } from "@/features/whatsapp/whatsapp-appearance-fields";
import { WhatsAppFab } from "@/components/layout/whatsapp-fab";
import { WhatsAppLinkButton } from "@/features/whatsapp/components/whatsapp-link-button";
import {
  WhatsAppFeedbackBanner,
  WhatsAppPreviewFrame,
  WhatsAppSettingsSection,
  WhatsAppStatusCard,
} from "@/features/whatsapp/whatsapp-settings-ui";
import {
  type WhatsAppAppearance,
  type WhatsAppFabSettings,
  type WhatsAppPageButtonSettings,
  type WhatsAppPosition,
  type WhatsAppSettings,
} from "@/features/whatsapp/whatsapp.schema";
import { useAdminUiStore } from "@/stores/admin-ui-store";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "fab", label: "Floating button" },
  { id: "pages", label: "Page buttons" },
  { id: "messages", label: "Messages" },
] as const;

type TabId = (typeof TABS)[number]["id"];

const POSITIONS: { value: WhatsAppPosition; label: string; hint: string }[] = [
  { value: "bottom-end", label: "Bottom end", hint: "Mirrors for RTL (inline end)" },
  { value: "bottom-start", label: "Bottom start", hint: "Mirrors for RTL (inline start)" },
  { value: "top-end", label: "Top end", hint: "Mirrors for RTL (inline end)" },
  { value: "top-start", label: "Top start", hint: "Mirrors for RTL (inline start)" },
];

const MESSAGE_KEYS = [
  {
    key: "message.default",
    label: "Default message (floating button)",
    placeholders: "{brandName}",
  },
  {
    key: "message.contact",
    label: "Contact page message",
    placeholders: "{brandName}",
  },
  {
    key: "message.contentInquiry",
    label: "Content inquiry message",
    placeholders: "{brandName}, {itemTitle}",
  },
  {
    key: "fab.ariaLabel",
    label: "Floating button aria label",
    placeholders: "",
  },
] as const;

type MessageValues = Record<string, Record<string, string>>;

type Props = {
  resolvedPhone: string;
  enabledLocales: PublicLocale[];
  messageValues: MessageValues;
  fileFallbacks: Record<string, string>;
};

function isValidTab(id: string | null): id is TabId {
  return TABS.some((tab) => tab.id === id);
}

export function WhatsAppAdminPanel({
  resolvedPhone,
  enabledLocales,
  messageValues: initialMessageValues,
  fileFallbacks,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const activeTab = useMemo(() => (isValidTab(tabParam) ? tabParam : "overview"), [tabParam]);

  const [settings, setSettings] = useState<WhatsAppSettings | null>(null);
  const [messageValues, setMessageValues] = useState<MessageValues>(initialMessageValues);
  const [status, setStatus] = useState<string | null>(null);
  const [statusVariant, setStatusVariant] = useState<"success" | "error">("success");
  const [loading, setLoading] = useState(true);
  const [activeLocale, setActiveLocale] = useState(enabledLocales[0]?.code ?? "en");

  const registerPageActions = useAdminUiStore((s) => s.registerPageActions);
  const clearPageActions = useAdminUiStore((s) => s.clearPageActions);
  const markUnsaved = useAdminUiStore((s) => s.markUnsaved);

  useEffect(() => {
    fetch("/api/whatsapp-settings")
      .then((r) => r.json())
      .then((data: WhatsAppSettings) => setSettings(data))
      .finally(() => setLoading(false));
  }, []);

  const handleTabChange = (tabId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tabId);
    router.replace(`/admin/settings/whatsapp?${params.toString()}`, { scroll: false });
  };

  const handleSave = useCallback(async () => {
    if (!settings) return;
    setStatus(null);
    const res = await fetch("/api/whatsapp-settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    const data = await res.json();
    if (!res.ok) {
      setStatusVariant("error");
      setStatus(data.error ?? "Save failed");
      throw new Error(data.error ?? "Save failed");
    }
    setSettings(data.settings);
    setStatusVariant("success");
    setStatus("WhatsApp settings saved.");
  }, [settings]);

  useEffect(() => {
    registerPageActions({ onSave: handleSave });
    return () => clearPageActions();
  }, [registerPageActions, clearPageActions, handleSave]);

  async function saveMessage(key: string, localeCode: string, value: string) {
    setStatus(null);
    try {
      await upsertUiMessageAction("whatsapp", key, localeCode, value);
      setMessageValues((prev) => ({
        ...prev,
        [key]: { ...prev[key], [localeCode]: value },
      }));
      setStatusVariant("success");
      setStatus(`Message saved for ${localeCode.toUpperCase()}.`);
    } catch (e) {
      setStatusVariant("error");
      setStatus(e instanceof Error ? e.message : "Message save failed");
    }
  }

  function patchFab(partial: Partial<WhatsAppFabSettings>) {
    if (!settings) return;
    markUnsaved();
    setSettings({ ...settings, fab: { ...settings.fab, ...partial } });
  }

  function patchContact(partial: Partial<WhatsAppPageButtonSettings>) {
    if (!settings) return;
    markUnsaved();
    setSettings({ ...settings, contactPage: { ...settings.contactPage, ...partial } });
  }

  function patchContent(partial: Partial<WhatsAppPageButtonSettings>) {
    if (!settings) return;
    markUnsaved();
    setSettings({ ...settings, contentInquiry: { ...settings.contentInquiry, ...partial } });
  }

  function patchFabAppearance(fab: WhatsAppAppearance) {
    patchFab(fab);
  }

  function patchContactAppearance(contactPage: WhatsAppPageButtonSettings) {
    if (!settings) return;
    markUnsaved();
    setSettings({ ...settings, contactPage });
  }

  function patchContentAppearance(contentInquiry: WhatsAppPageButtonSettings) {
    if (!settings) return;
    markUnsaved();
    setSettings({ ...settings, contentInquiry });
  }

  if (loading || !settings) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-32 animate-pulse rounded-xl border bg-muted/40" />
        ))}
      </div>
    );
  }

  const displayPhone = resolvedPhone || "(not set)";
  const phoneConfigured = Boolean(resolvedPhone.trim());

  const previewMessage =
    messageValues["message.default"]?.[activeLocale] ||
    fileFallbacks["message.default"] ||
    "Preview message";

  const previewPhone = phoneConfigured ? resolvedPhone : "966500000000";

  return (
    <div className="space-y-6">
      <WhatsAppFeedbackBanner message={status} variant={statusVariant} />

      <AdminSettingsLayout tabs={[...TABS]} activeTab={activeTab} onTabChange={handleTabChange}>
        {(tab) =>
          tab === "overview" ? (
            <div className="space-y-6">
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Phone className="h-4 w-4 text-primary" aria-hidden />
                      WhatsApp number
                    </CardTitle>
                    <CardDescription>
                      The phone number is shared across all WhatsApp buttons. Appearance and
                      messages are configured on the other tabs.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="rounded-lg border bg-muted/30 px-4 py-3">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Resolved phone
                      </p>
                      <p className="mt-1 font-mono text-lg">{displayPhone}</p>
                    </div>
                    <Button type="button" variant="outline" size="sm" asChild>
                      <Link href="/admin/company">
                        Edit in Company Info
                        <ExternalLink className="ml-2 h-3.5 w-3.5" aria-hidden />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>

                <Card className="border-dashed">
                  <CardHeader>
                    <CardTitle className="text-base">Tips</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm text-muted-foreground">
                    <p>
                      If the personalization widget is also at bottom-end, increase the floating
                      button bottom offset (~72px) to avoid overlap.
                    </p>
                    <p>
                      Message templates support placeholders like{" "}
                      <code className="rounded bg-muted px-1 py-0.5 text-xs">{"{brandName}"}</code>{" "}
                      and{" "}
                      <code className="rounded bg-muted px-1 py-0.5 text-xs">{"{itemTitle}"}</code>.
                    </p>
                  </CardContent>
                </Card>
              </div>

              <WhatsAppSettingsSection
                title="Button status"
                description="Quick overview of which WhatsApp controls are active."
              >
                <div className="grid gap-4 sm:grid-cols-3">
                  <WhatsAppStatusCard
                    title="Floating button"
                    description="Fixed button on all public pages."
                    enabled={settings.fab.enabled && phoneConfigured}
                    onConfigure={() => handleTabChange("fab")}
                  />
                  <WhatsAppStatusCard
                    title="Contact page"
                    description="Button in the contact office section."
                    enabled={settings.contactPage.enabled && phoneConfigured}
                    onConfigure={() => handleTabChange("pages")}
                  />
                  <WhatsAppStatusCard
                    title="Content inquiry"
                    description="Button on content detail pages."
                    enabled={settings.contentInquiry.enabled && phoneConfigured}
                    onConfigure={() => handleTabChange("pages")}
                  />
                </div>
              </WhatsAppSettingsSection>
            </div>
          ) : tab === "fab" ? (
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_min(320px,34%)]">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Floating button</CardTitle>
                  <CardDescription>
                    Fixed WhatsApp button shown on all public pages when enabled and a phone number
                    is set.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <WhatsAppAppearanceFields
                    value={settings.fab}
                    onChange={patchFabAppearance}
                    showLabelToggle={false}
                  />

                  <AdminCollapsibleSection
                    title="Position & spacing"
                    description="Logical start/end corners mirror correctly in RTL layouts."
                    defaultOpen
                  >
                    <div className="space-y-2">
                      <Label>Position</Label>
                      <OptionButtonGroup
                        value={settings.fab.position}
                        options={POSITIONS.map((p) => ({ value: p.value, label: p.label }))}
                        onChange={(v) => patchFab({ position: v })}
                        columns={2}
                      />
                      <p className="text-xs text-muted-foreground">
                        {POSITIONS.find((p) => p.value === settings.fab.position)?.hint}
                      </p>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="fab-offset-bottom">Offset (bottom/top), px</Label>
                        <Input
                          id="fab-offset-bottom"
                          type="number"
                          min={0}
                          value={settings.fab.offsetBottom ?? 24}
                          onChange={(e) =>
                            patchFab({ offsetBottom: Number(e.target.value) || 0 })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="fab-offset-side">Offset (side), px</Label>
                        <Input
                          id="fab-offset-side"
                          type="number"
                          min={0}
                          value={settings.fab.offsetSide ?? 24}
                          onChange={(e) => patchFab({ offsetSide: Number(e.target.value) || 0 })}
                        />
                      </div>
                    </div>
                  </AdminCollapsibleSection>
                </CardContent>
              </Card>

              <div className="xl:sticky xl:top-28 xl:self-start">
                <WhatsAppPreviewFrame
                  title="Live preview"
                  description="Approximate placement in the corner of the viewport."
                  minHeight={260}
                >
                  <div className="relative h-52">
                    <WhatsAppFab
                      phone={previewPhone}
                      message={previewMessage}
                      settings={{
                        ...settings.fab,
                        position: "bottom-end",
                        offsetBottom: 12,
                        offsetSide: 12,
                      }}
                      ariaLabel="WhatsApp preview"
                    />
                  </div>
                </WhatsAppPreviewFrame>
              </div>
            </div>
          ) : tab === "pages" ? (
            <div className="space-y-6">
              <div className="grid gap-6 xl:grid-cols-2">
                <Card className="flex flex-col">
                  <CardHeader>
                    <CardTitle className="text-base">Contact page</CardTitle>
                    <CardDescription>Button in the contact page office section.</CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-1 flex-col gap-6">
                    <WhatsAppAppearanceFields
                      value={settings.contactPage}
                      onChange={patchContactAppearance}
                      showFullWidth
                      fullWidth={settings.contactPage.fullWidth}
                      onFullWidthChange={(fullWidth) => patchContact({ fullWidth })}
                    />
                    <WhatsAppPreviewFrame title="Preview" minHeight={120}>
                      <WhatsAppLinkButton
                        phone={previewPhone}
                        message="Preview contact message"
                        appearance={settings.contactPage}
                        label="Chat on WhatsApp"
                        className={settings.contactPage.fullWidth !== false ? "w-full max-w-none" : "max-w-xs"}
                      />
                    </WhatsAppPreviewFrame>
                  </CardContent>
                </Card>

                <Card className="flex flex-col">
                  <CardHeader>
                    <CardTitle className="text-base">Content inquiry</CardTitle>
                    <CardDescription>
                      Button on content detail pages when inquiries are enabled.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-1 flex-col gap-6">
                    <WhatsAppAppearanceFields
                      value={settings.contentInquiry}
                      onChange={patchContentAppearance}
                      showFullWidth
                      fullWidth={settings.contentInquiry.fullWidth}
                      onFullWidthChange={(fullWidth) => patchContent({ fullWidth })}
                    />
                    <WhatsAppPreviewFrame title="Preview" minHeight={120}>
                      <WhatsAppLinkButton
                        phone={previewPhone}
                        message="Preview content inquiry message"
                        appearance={settings.contentInquiry}
                        label="WhatsApp Inquiry"
                        className={
                          settings.contentInquiry.fullWidth !== false ? "w-full max-w-none" : "max-w-xs"
                        }
                      />
                    </WhatsAppPreviewFrame>
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <MessageCircle className="h-4 w-4 text-primary" aria-hidden />
                  Message templates
                </CardTitle>
                <CardDescription>
                  Translatable pre-filled WhatsApp text. Also editable in{" "}
                  <Link href="/admin/ui-messages" className="text-primary underline">
                    UI Messages
                  </Link>
                  .
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Locale</Label>
                  <OptionButtonGroup
                    value={activeLocale}
                    options={enabledLocales.map((locale) => ({
                      value: locale.code,
                      label: locale.label,
                    }))}
                    onChange={setActiveLocale}
                    columns={Math.min(enabledLocales.length, 4) as 1 | 2 | 3 | 4}
                  />
                </div>

                <div className="space-y-4">
                  {MESSAGE_KEYS.map((item) => {
                    const current =
                      messageValues[item.key]?.[activeLocale] ?? fileFallbacks[item.key] ?? "";
                    return (
                      <AdminCollapsibleSection
                        key={item.key}
                        title={item.label}
                        description={
                          item.placeholders ? `Placeholders: ${item.placeholders}` : undefined
                        }
                        defaultOpen={item.key === "message.default"}
                      >
                        <Textarea
                          defaultValue={current}
                          key={`${item.key}-${activeLocale}-${current}`}
                          rows={3}
                          className="min-h-[88px] resize-y"
                          onBlur={(e) => {
                            const next = e.target.value;
                            if (next === current) return;
                            void saveMessage(item.key, activeLocale, next);
                          }}
                        />
                        <p className="text-xs text-muted-foreground">
                          Saves automatically when you leave the field.
                        </p>
                      </AdminCollapsibleSection>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )
        }
      </AdminSettingsLayout>
    </div>
  );
}
