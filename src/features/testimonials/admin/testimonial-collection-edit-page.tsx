"use client";

import { useCallback, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { useRouter } from "next/navigation";
import type { Testimonial, TestimonialCollection, TestimonialCollectionItem } from "@prisma/client";
import { toggleTestimonialCollectionPublished } from "@/features/testimonials/actions";
import type { TestimonialAdmin } from "@/features/testimonials/types";
import {
  AdminFormProvider,
  AdminPageHeader,
} from "@/components/admin/layout/admin-shell";
import { AdminSettingsLayout } from "@/components/admin/layout/admin-settings-layout";
import { TestimonialCollectionForm } from "./testimonial-collection-form";
import { TestimonialAddToCollectionForm } from "./testimonial-add-to-collection-form";
import { TestimonialCollectionMemberList } from "./testimonial-collection-member-list";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const COLLECTION_TABS = [
  { id: "details", label: "Details" },
  { id: "add", label: "Add to collection" },
  { id: "members", label: "Members" },
] as const;

type CollectionWithItems = TestimonialCollection & {
  items: (TestimonialCollectionItem & { testimonial: Testimonial })[];
};

type Props = {
  collection: CollectionWithItems;
  allTestimonials: TestimonialAdmin[];
};

export function TestimonialCollectionEditPage({ collection, allTestimonials }: Props) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [activeTab, setActiveTab] = useState<string>("details");
  const [publishing, startPublishTransition] = useTransition();

  const memberIds = collection.items.map((i) => i.testimonialId);

  const handleSave = useCallback(() => {
    if (activeTab === "details") formRef.current?.requestSubmit();
  }, [activeTab]);

  const onSave = useMemo(() => (activeTab === "details" ? handleSave : undefined), [activeTab, handleSave]);

  const handlePreview = useCallback(() => {
    window.open(`/testimonials?collection=${collection.slug}`, "_blank", "noopener,noreferrer");
  }, [collection.slug]);

  const handlePublish = useCallback(() => {
    startPublishTransition(async () => {
      await toggleTestimonialCollectionPublished(collection.id, true);
      router.refresh();
    });
  }, [collection.id, router]);

  const description = `${collection.items.length} member${collection.items.length === 1 ? "" : "s"} · ${collection.slug}`;

  return (
    <AdminFormProvider
      onSave={onSave}
      onPreview={handlePreview}
      onPublish={handlePublish}
      canPreview={collection.isPublished}
      canPublish={!publishing}
    >
      <AdminPageHeader
        title={`Edit: ${collection.slug}`}
        description={description}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {!collection.isPublished && <Badge variant="secondary">Hidden</Badge>}
            {collection.isPublished && (
              <Link
                href={`/testimonials?collection=${collection.slug}`}
                target="_blank"
                className="flex items-center gap-1 text-xs text-primary"
              >
                <ExternalLink className="h-3 w-3" /> Preview filter
              </Link>
            )}
          </div>
        }
      />

      <AdminSettingsLayout tabs={[...COLLECTION_TABS]} activeTab={activeTab} onTabChange={setActiveTab}>
        {(tab) => (
          <>
            {tab === "details" && (
              <Card>
                <CardHeader>
                  <CardTitle>Collection details</CardTitle>
                  <CardDescription>Title, slug, excerpts, and publish status.</CardDescription>
                </CardHeader>
                <CardContent>
                  <TestimonialCollectionForm collection={collection} mode="edit" embedded formRef={formRef} />
                </CardContent>
              </Card>
            )}

            {tab === "add" && (
              <Card>
                <CardHeader>
                  <CardTitle>Add to collection</CardTitle>
                  <CardDescription>Link existing testimonials from the global pool.</CardDescription>
                </CardHeader>
                <CardContent>
                  <TestimonialAddToCollectionForm
                    collectionId={collection.id}
                    memberIds={memberIds}
                    availableTestimonials={allTestimonials}
                  />
                </CardContent>
              </Card>
            )}

            {tab === "members" && (
              <Card>
                <CardHeader>
                  <CardTitle>Members ({collection.items.length})</CardTitle>
                  <CardDescription>Reorder or remove testimonials from this collection.</CardDescription>
                </CardHeader>
                <CardContent>
                  <TestimonialCollectionMemberList collectionId={collection.id} items={collection.items} />
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
