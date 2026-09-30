"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ProductPageBuilderPanel } from "@/features/catalog/admin/products/builder/product-page-builder-panel";
import {
  useProductPageBuilderStudio,
  type ProductPageBuilderData,
} from "@/features/catalog/admin/products/builder/use-product-page-builder-studio";
import {
  saveProductPageBuilderSettings,
  saveProductPageLayoutTemplateSettings,
} from "@/features/catalog/admin/products/product-settings-save";
import { AdminSaveFeedback } from "@/features/catalog/admin/products/AdminSaveFeedback";
import { buildProductPageSettingsFromSite } from "@/features/products/lib/product-page-responsive";
import { validateTemplateId } from "@/features/products/layout-templates/registry-meta";
import type { ProductPageLayoutTemplateId } from "@/features/products/layout-templates/types";
import { fetchSiteSettingsPublishStatus, publishShell } from "@/lib/publish-shell.client";
import { useAdminUiStore } from "@/stores/admin-ui-store";
import type { ProductPageDesignInitialProps } from "@/features/pages/load-product-page-design-props";
import { defaultLocale } from "@/features/catalog/admin/catalog-admin-config";

export function ProductPageDesignAdminClient(props: ProductPageDesignInitialProps) {
  const {
    initialProductPageLayout,
    initialProductPageLayoutRules,
    initialProductPageElementsRules,
    initialProductPageDisplay,
    initialProductPageElementOrder,
    initialProductPageCompactDisplay,
    initialProductPageOverflow,
    initialProductPageLayoutTemplate,
    initialAdminLocaleCode,
    initialLocales,
    previewProductSlug,
  } = props;

  const router = useRouter();
  const adminLocaleCode = initialAdminLocaleCode;
  const catalogLocaleCodes = useMemo(
    () => initialLocales.map((locale) => locale.code),
    [initialLocales],
  );

  const defaultPageSettings = useMemo(() => buildProductPageSettingsFromSite({}), []);
  const initialBuilderData = useMemo<ProductPageBuilderData>(
    () => ({
      layoutRules:
        initialProductPageLayoutRules ??
        (initialProductPageLayout
          ? buildProductPageSettingsFromSite({ productPageLayout: initialProductPageLayout })
              .layoutRules
          : defaultPageSettings.layoutRules),
      elementsRules:
        initialProductPageElementsRules ??
        buildProductPageSettingsFromSite({
          productPageDisplay: initialProductPageDisplay,
          productPageElementOrder: initialProductPageElementOrder,
          productPageCompactDisplay: initialProductPageCompactDisplay,
        }).elementsRules,
      overflow: initialProductPageOverflow ?? defaultPageSettings.overflow,
    }),
    [
      defaultPageSettings,
      initialProductPageLayout,
      initialProductPageLayoutRules,
      initialProductPageElementsRules,
      initialProductPageDisplay,
      initialProductPageElementOrder,
      initialProductPageCompactDisplay,
      initialProductPageOverflow,
    ],
  );

  const studio = useProductPageBuilderStudio(initialBuilderData);
  const [siteTemplate, setSiteTemplate] = useState<ProductPageLayoutTemplateId | null>(() =>
    initialProductPageLayoutTemplate
      ? validateTemplateId(initialProductPageLayoutTemplate)
      : null,
  );
  const [feedback, setFeedback] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const savedRef = useRef({
    builderData: initialBuilderData,
    siteTemplate: initialProductPageLayoutTemplate
      ? validateTemplateId(initialProductPageLayoutTemplate)
      : null,
  });

  const markUnsaved = useAdminUiStore((s) => s.markUnsaved);
  const markSaved = useAdminUiStore((s) => s.markSaved);
  const markPublishPending = useAdminUiStore((s) => s.markPublishPending);
  const markPublished = useAdminUiStore((s) => s.markPublished);
  const setPublishStatus = useAdminUiStore((s) => s.setPublishStatus);
  const setSaveStatus = useAdminUiStore((s) => s.setSaveStatus);
  const saveStatus = useAdminUiStore((s) => s.saveStatus);
  const publishStatus = useAdminUiStore((s) => s.publishStatus);

  useEffect(() => {
    void (async () => {
      try {
        const status = await fetchSiteSettingsPublishStatus(adminLocaleCode);
        setPublishStatus(status.isLive ? "live" : "pending");
      } catch {
        /* ignore */
      }
    })();
  }, [adminLocaleCode, setPublishStatus]);

  useEffect(() => {
    const templateDirty = siteTemplate !== savedRef.current.siteTemplate;
    if (studio.isDirty || templateDirty) markUnsaved();
    else markSaved();
  }, [studio.isDirty, siteTemplate, markUnsaved, markSaved]);

  const handleSave = useCallback(async () => {
    if (saveStatus === "saving") return;
    setSaveStatus("saving");
    setFeedback(null);
    try {
      const snapshot = studio.getSnapshot();
      const savedElementsRules = await saveProductPageBuilderSettings(
        adminLocaleCode,
        snapshot,
        catalogLocaleCodes,
      );
      await saveProductPageLayoutTemplateSettings(adminLocaleCode, siteTemplate);
      const savedData: ProductPageBuilderData = {
        ...snapshot,
        elementsRules: savedElementsRules,
      };
      studio.markSaved(savedData);
      savedRef.current = {
        builderData: studio.getSnapshot(),
        siteTemplate,
      };
      markPublishPending();
      markSaved();
      setFeedback({ kind: "ok", text: "Product page design saved." });
      router.refresh();
    } catch (e) {
      setSaveStatus("error");
      setFeedback({ kind: "err", text: e instanceof Error ? e.message : "Save failed" });
    }
  }, [
    saveStatus,
    setSaveStatus,
    studio,
    adminLocaleCode,
    catalogLocaleCodes,
    siteTemplate,
    markPublishPending,
    markSaved,
    router,
  ]);

  const handlePublish = useCallback(async () => {
    if (saveStatus === "saving" || publishStatus === "publishing") return;
    setPublishStatus("publishing");
    setFeedback(null);
    try {
      await publishShell("site-settings", adminLocaleCode);
      markPublished();
      setSaveStatus("saved");
      setFeedback({ kind: "ok", text: "Product page design published to the live site." });
    } catch (e) {
      setPublishStatus("pending");
      setSaveStatus("error");
      setFeedback({ kind: "err", text: e instanceof Error ? e.message : "Publish failed" });
    }
  }, [
    saveStatus,
    publishStatus,
    setPublishStatus,
    adminLocaleCode,
    markPublished,
    setSaveStatus,
  ]);

  const handleCancel = useCallback(() => {
    studio.restoreSnapshot(savedRef.current.builderData);
    setSiteTemplate(savedRef.current.siteTemplate);
    setFeedback(null);
    markSaved();
  }, [studio, markSaved]);

  return (
    <div className="space-y-4">
      {feedback ? <AdminSaveFeedback feedback={feedback} /> : null}
      <ProductPageBuilderPanel
        studio={studio}
        siteProductPageLayoutTemplate={siteTemplate}
        onSiteProductPageLayoutTemplateChange={setSiteTemplate}
        saving={saveStatus === "saving"}
        publishing={publishStatus === "publishing"}
        canCancel={saveStatus === "unsaved" || saveStatus === "error" || studio.isDirty}
        onSave={handleSave}
        onPublish={handlePublish}
        onCancel={handleCancel}
        onPreview={() => {
          if (!previewProductSlug) {
            setFeedback({
              kind: "err",
              text: "Add at least one published product to preview the storefront product page.",
            });
            return;
          }
          const prefix =
            initialLocales.find((locale) => locale.code === adminLocaleCode)?.urlPrefix ??
            defaultLocale.urlPrefix;
          window.open(
            `/${prefix}/products/${encodeURIComponent(previewProductSlug)}`,
            "_blank",
            "noopener,noreferrer",
          );
        }}
      />
    </div>
  );
}
