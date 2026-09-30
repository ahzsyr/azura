"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { useRouter } from "next/navigation";
import type { EntityTranslation } from "@prisma/client";
import type { FaqItemAdmin } from "@/features/faq/types";
import type { PublicLocale } from "@/i18n/locale-config";
import { toggleFaqSetPublished, patchFaqSetFromForm } from "@/features/faq/actions";
import { useEntityFormPatch } from "@/hooks/use-entity-form-patch";
import {
  AdminFormProvider,
  AdminPageHeader,
  useAdminFormOptional,
} from "@/components/admin/layout/admin-shell";
import { AdminSettingsLayout } from "@/components/admin/layout/admin-settings-layout";
import { FaqSetForm } from "./faq-set-form";
import { FaqItemSortList } from "./faq-item-sort-list";
import { FaqItemAddModal } from "./faq-item-add-modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const FAQ_TABS = [
  { id: "details", label: "Details" },
  { id: "faqs", label: "FAQs" },
] as const;

type FaqSetWithItems = {
  id: string;
  slug: string;
  coverUrl: string | null;
  sortOrder: number;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
  titleEn: string;
  titleAr: string;
  excerptEn: string | null;
  excerptAr: string | null;
  descriptionEn: string;
  descriptionAr: string;
  items: FaqItemAdmin[];
};

type Props = {
  faqSet: FaqSetWithItems;
  locales: PublicLocale[];
  translations?: EntityTranslation[];
};

function FaqSetEditToastBridge({
  toast,
  onConsumed,
}: {
  toast: { message: string; type: "success" | "error" } | null;
  onConsumed: () => void;
}) {
  const adminForm = useAdminFormOptional();
  useEffect(() => {
    if (!toast || !adminForm) return;
    adminForm.showToast(toast.message, toast.type);
    onConsumed();
  }, [adminForm, onConsumed, toast]);
  return null;
}

function FaqSetEditPageContent({ faqSet, locales, translations = [] }: Props) {
  const router = useRouter();
  const setFormRef = useRef<HTMLFormElement>(null);
  const itemFormRef = useRef<HTMLFormElement>(null);
  const [activeTab, setActiveTab] = useState<string>("details");
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [addFaqOpen, setAddFaqOpen] = useState(false);
  const [publishing, startPublishTransition] = useTransition();
  const setPatch = useEntityFormPatch({ formRef: setFormRef });
  const [saveToast, setSaveToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const clearSaveToast = useCallback(() => setSaveToast(null), []);

  const handleSaveDetails = useCallback(async () => {
    try {
      const result = await patchFaqSetFromForm(
        faqSet.id,
        setPatch.getBaseline(),
        setPatch.getCurrent()
      );
      setPatch.resetBaseline();
      if (result.ok && "wroteCoverUrl" in result && result.wroteCoverUrl === false) {
        setSaveToast({
          message: "FAQ set saved (cover image skipped — run DB migration for coverUrl)",
          type: "success",
        });
      }
      router.refresh();
      return true;
    } catch (error) {
      setSaveToast({
        message: error instanceof Error ? error.message.slice(0, 200) : "Failed to save FAQ set",
        type: "error",
      });
      return false;
    }
  }, [faqSet.id, router, setPatch]);

  const handleSaveItem = useCallback(() => {
    itemFormRef.current?.requestSubmit();
  }, []);

  const onSave = useMemo(() => {
    if (activeTab === "details") return handleSaveDetails;
    if (activeTab === "faqs" && editingItemId) return handleSaveItem;
    return undefined;
  }, [activeTab, editingItemId, handleSaveDetails, handleSaveItem]);

  const handlePreview = useCallback(() => {
    window.open(`/faq/${faqSet.slug}`, "_blank", "noopener,noreferrer");
  }, [faqSet.slug]);

  const handlePublish = useCallback(() => {
    startPublishTransition(async () => {
      await toggleFaqSetPublished(faqSet.id, true);
      router.refresh();
    });
  }, [faqSet.id, router]);

  const handleTabChange = useCallback((tabId: string) => {
    setActiveTab(tabId);
    if (tabId !== "faqs") {
      setEditingItemId(null);
    }
  }, []);

  const handleCancel = useCallback(() => {
    setFormRef.current?.reset();
    router.refresh();
  }, [router]);

  const description = `${faqSet.items.length} item${faqSet.items.length === 1 ? "" : "s"} · /faq/${faqSet.slug}`;

  return (
    <AdminFormProvider
      onSave={onSave}
      onCancel={handleCancel}
      canCancel
      getBaseline={activeTab === "details" ? setPatch.getBaseline : undefined}
      getCurrent={activeTab === "details" ? setPatch.getCurrent : undefined}
      patchSyncKey={activeTab === "details" ? faqSet.updatedAt : undefined}
      onPreview={handlePreview}
      onPublish={handlePublish}
      canPreview={faqSet.isPublished}
      canPublish={!publishing}
    >
      <FaqSetEditToastBridge toast={saveToast} onConsumed={clearSaveToast} />
      <AdminPageHeader
        title={`Edit: ${faqSet.titleEn}`}
        description={description}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {!faqSet.isPublished && <Badge variant="secondary">Hidden</Badge>}
            {faqSet.isPublished && (
              <Link
                href={`/faq/${faqSet.slug}`}
                target="_blank"
                className="flex items-center gap-1 text-xs text-primary"
              >
                <ExternalLink className="h-3 w-3" /> View live
              </Link>
            )}
          </div>
        }
      />

      <AdminSettingsLayout tabs={[...FAQ_TABS]} activeTab={activeTab} onTabChange={handleTabChange}>
        {(tab) => (
          <>
            {tab === "details" && (
              <Card>
                <CardHeader>
                  <CardTitle>FAQ set details</CardTitle>
                  <CardDescription>Title, slug, descriptions, and publish status.</CardDescription>
                </CardHeader>
                <CardContent>
                  <FaqSetForm
                    faqSet={faqSet}
                    locales={locales}
                    translations={translations}
                    mode="edit"
                    embedded
                    formRef={setFormRef}
                  />
                </CardContent>
              </Card>
            )}

            {tab === "faqs" && (
              <Card>
                <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <CardTitle>FAQs ({faqSet.items.length})</CardTitle>
                    <CardDescription>Reorder, edit, show/hide, or delete FAQ items.</CardDescription>
                  </div>
                  <Button type="button" onClick={() => setAddFaqOpen(true)}>
                    Add FAQ
                  </Button>
                </CardHeader>
                <CardContent>
                  <FaqItemSortList
                    faqSetId={faqSet.id}
                    items={faqSet.items}
                    editingItemId={editingItemId}
                    onEditingItemChange={setEditingItemId}
                    itemFormRef={itemFormRef}
                    onAddFaq={() => setAddFaqOpen(true)}
                  />
                </CardContent>
              </Card>
            )}
          </>
        )}
      </AdminSettingsLayout>

      <FaqItemAddModal open={addFaqOpen} onOpenChange={setAddFaqOpen} faqSetId={faqSet.id} />

      {onSave && (
        <div className="flex flex-wrap gap-3 border-t pt-4 lg:hidden">
          <Button type="button" onClick={onSave}>
            Save
          </Button>
        </div>
      )}
    </AdminFormProvider>
  );
}

export function FaqSetEditPage({ faqSet, locales, translations }: Props) {
  return (
    <FaqSetEditPageContent faqSet={faqSet} locales={locales} translations={translations} />
  );
}
