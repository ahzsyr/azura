"use client";

import { useCallback, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { useRouter } from "next/navigation";
import type { EntityTranslation, FaqSet, FaqItem } from "@prisma/client";
import type { PublicLocale } from "@/i18n/locale-config";
import { toggleFaqSetPublished } from "@/features/faq/actions";
import { AdminFormProvider, AdminPageHeader } from "@/components/admin/layout/admin-shell";
import { AdminSettingsLayout } from "@/components/admin/layout/admin-settings-layout";
import { FaqSetForm } from "./faq-set-form";
import { FaqItemAddForm } from "./faq-item-add-form";
import { FaqItemSortList } from "./faq-item-sort-list";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const FAQ_TABS = [
  { id: "details", label: "Details" },
  { id: "add-faq", label: "Add FAQ" },
  { id: "faqs", label: "FAQs" },
] as const;

type Props = {
  faqSet: FaqSet & { items: FaqItem[] };
  locales: PublicLocale[];
  translations?: EntityTranslation[];
};

function FaqSetEditPageContent({ faqSet, locales, translations = [] }: Props) {
  const router = useRouter();
  const setFormRef = useRef<HTMLFormElement>(null);
  const itemFormRef = useRef<HTMLFormElement>(null);
  const [activeTab, setActiveTab] = useState<string>("details");
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [publishing, startPublishTransition] = useTransition();

  const handleSave = useCallback(() => {
    if (activeTab === "details") {
      setFormRef.current?.requestSubmit();
    } else if (activeTab === "faqs" && editingItemId) {
      itemFormRef.current?.requestSubmit();
    }
  }, [activeTab, editingItemId]);

  const onSave = useMemo(() => {
    if (activeTab === "details") return handleSave;
    if (activeTab === "faqs" && editingItemId) return handleSave;
    return undefined;
  }, [activeTab, editingItemId, handleSave]);

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

  const description = `${faqSet.items.length} item${faqSet.items.length === 1 ? "" : "s"} · /faq/${faqSet.slug}`;

  return (
    <AdminFormProvider
      onSave={onSave}
      onPreview={handlePreview}
      onPublish={handlePublish}
      canPreview={faqSet.isPublished}
      canPublish={!publishing}
    >
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

            {tab === "add-faq" && (
              <Card>
                <CardHeader>
                  <CardTitle>Add FAQ</CardTitle>
                  <CardDescription>Add a new question and answer to this set.</CardDescription>
                </CardHeader>
                <CardContent>
                  <FaqItemAddForm faqSetId={faqSet.id} />
                </CardContent>
              </Card>
            )}

            {tab === "faqs" && (
              <Card>
                <CardHeader>
                  <CardTitle>FAQs ({faqSet.items.length})</CardTitle>
                  <CardDescription>Reorder, edit, show/hide, or delete FAQ items.</CardDescription>
                </CardHeader>
                <CardContent>
                  <FaqItemSortList
                    faqSetId={faqSet.id}
                    items={faqSet.items}
                    editingItemId={editingItemId}
                    onEditingItemChange={setEditingItemId}
                    itemFormRef={itemFormRef}
                  />
                </CardContent>
              </Card>
            )}
          </>
        )}
      </AdminSettingsLayout>

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
