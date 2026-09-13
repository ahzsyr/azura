"use client";

import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/layout/admin-shell";
import { AdminServerFormTopBarActions } from "@/components/admin/layout/admin-server-form-top-bar-actions";
import {
  AdminSettingsLayout,
  type SettingsRibbonTab,
} from "@/components/admin/layout/admin-settings-layout";
import { MetaPixelCodeSetup } from "@/modules/marketing/admin/meta-pixel-code-setup";
import { GoogleTrackingForm } from "@/modules/marketing/admin/google-tracking-form";
import { LinkedInTrackingForm } from "@/modules/marketing/admin/linkedin-tracking-form";
import {
  extractMetaPixelIdFromSnippet,
  normalizeMetaPixelId,
  readMetaPixelHeadSnippet,
} from "@/modules/marketing/tracking/meta-pixel";

type TrackingConfig = {
  id: string;
  providerId: string;
  enabled: boolean;
  pixelId: string | null;
  capiEnabled: boolean;
  testEventCode: string | null;
  metadata?: unknown;
};

type TabStatus = NonNullable<SettingsRibbonTab["status"]>;

const TAB_FORM_IDS: Record<string, string> = {
  meta: "marketing-tracking-meta",
  "google-ads": "marketing-tracking-google",
  linkedin: "marketing-tracking-linkedin",
};

function resolveConfigPixelId(config: TrackingConfig | undefined): string | null {
  if (!config) return null;
  const fromColumn = normalizeMetaPixelId(config.pixelId);
  if (fromColumn) return fromColumn;
  if (config.providerId === "meta") {
    const snippet = readMetaPixelHeadSnippet(config.metadata);
    if (snippet) return extractMetaPixelIdFromSnippet(snippet) ?? null;
  }
  return config.pixelId?.trim() || null;
}

function trackingTabStatus(config: TrackingConfig | undefined): TabStatus {
  const hasId = Boolean(resolveConfigPixelId(config));
  if (config?.enabled && hasId) return "connected";
  if (hasId) return "setup";
  return "disconnected";
}

export function MarketingTrackingPanel({
  configs,
  siteUrl,
}: {
  configs: TrackingConfig[];
  siteUrl?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const meta = configs.find((c) => c.providerId === "meta");
  const linkedin = configs.find((c) => c.providerId === "linkedin");
  const google = configs.find((c) => c.providerId === "google-ads");

  const tabs: SettingsRibbonTab[] = useMemo(
    () => [
      {
        id: "meta",
        label: "Meta",
        status: trackingTabStatus(meta),
      },
      {
        id: "google-ads",
        label: "Google",
        status: trackingTabStatus(google),
      },
      {
        id: "linkedin",
        label: "LinkedIn",
        status: trackingTabStatus(linkedin),
      },
    ],
    [meta, google, linkedin],
  );

  const validTabIds = useMemo(() => new Set(tabs.map((t) => t.id)), [tabs]);

  const activeTab = useMemo(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam && validTabIds.has(tabParam)) return tabParam;
    return "meta";
  }, [searchParams, validTabIds]);

  const handleTabChange = (tabId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tabId);
    router.replace(`/admin/marketing/tracking?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="space-y-5">
      <AdminServerFormTopBarActions
        ownerKey="marketing-tracking"
        formId={TAB_FORM_IDS[activeTab] ?? TAB_FORM_IDS.meta}
        saveLabel="Save tracking"
      />
      <AdminPageHeader
        className="mb-0"
        title="Tracking"
        description="Internal MarketingEvents are the source of truth. GA4, Meta Pixel/CAPI, Google Ads, and LinkedIn are downstream destinations only."
      />

      <AdminSettingsLayout
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        layoutId="marketing-tracking-ribbon"
      >
        {(tab) => {
          if (tab === "google-ads") {
            return (
              <GoogleTrackingForm
                enabled={google?.enabled ?? false}
                pixelId={google?.pixelId ?? null}
                formId="marketing-tracking-google"
              />
            );
          }
          if (tab === "linkedin") {
            return (
              <LinkedInTrackingForm
                enabled={linkedin?.enabled ?? false}
                pixelId={linkedin?.pixelId ?? null}
                formId="marketing-tracking-linkedin"
              />
            );
          }
          return (
            <MetaPixelCodeSetup
              config={meta ?? null}
              formId="marketing-tracking-meta"
              siteUrl={siteUrl}
            />
          );
        }}
      </AdminSettingsLayout>
    </div>
  );
}
