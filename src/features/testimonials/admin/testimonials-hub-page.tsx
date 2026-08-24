"use client";

import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import { ExternalLink } from "lucide-react";
import type { TestimonialCollectionAdmin, TestimonialAdmin } from "@/features/testimonials/types";
import {
  AdminFormProvider,
  AdminPageHeader,
} from "@/components/admin/layout/admin-shell";
import { AdminSettingsLayout } from "@/components/admin/layout/admin-settings-layout";
import { TestimonialCollectionManager } from "./testimonial-collection-manager";
import { TestimonialAllList } from "./testimonial-all-list";
import { TestimonialAddForm } from "./testimonial-add-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const HUB_TABS = [
  { id: "collections", label: "Collections" },
  { id: "all", label: "All testimonials" },
  { id: "add", label: "Add testimonial" },
] as const;

type Props = {
  collections: TestimonialCollectionAdmin[];
  testimonials: TestimonialAdmin[];
};

export function TestimonialsHubPage({ collections, testimonials }: Props) {
  const addFormRef = useRef<HTMLFormElement>(null);
  const [activeTab, setActiveTab] = useState<string>("collections");

  const handleSave = useCallback(() => {
    if (activeTab === "add") addFormRef.current?.requestSubmit();
  }, [activeTab]);

  const handlePreview = useCallback(() => {
    window.open("/testimonials", "_blank", "noopener,noreferrer");
  }, []);

  const onSave = activeTab === "add" ? handleSave : undefined;

  return (
    <AdminFormProvider onSave={onSave} onPreview={handlePreview} canPreview>
      <AdminPageHeader
        title="Testimonials"
        description="Manage customer reviews, collections for builder blocks, and the public testimonials page."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/testimonials"
              target="_blank"
              className="flex items-center gap-1 text-xs text-primary"
            >
              <ExternalLink className="h-3 w-3" /> View public page
            </Link>
            <Button asChild size="sm">
              <Link href="/admin/testimonials/collections/new">New collection</Link>
            </Button>
          </div>
        }
      />

      <AdminSettingsLayout tabs={[...HUB_TABS]} activeTab={activeTab} onTabChange={setActiveTab}>
        {(tab) => (
          <>
            {tab === "collections" && (
              <Card>
                <CardHeader>
                  <CardTitle>Collections</CardTitle>
                  <CardDescription>
                    Group testimonials for homepage blocks and curated sections. Link collections in the page
                    builder.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <TestimonialCollectionManager collections={collections} />
                </CardContent>
              </Card>
            )}

            {tab === "all" && (
              <Card>
                <CardHeader>
                  <CardTitle>All testimonials ({testimonials.length})</CardTitle>
                  <CardDescription>Global pool — reorder, edit, publish, or delete.</CardDescription>
                </CardHeader>
                <CardContent>
                  <TestimonialAllList testimonials={testimonials} />
                </CardContent>
              </Card>
            )}

            {tab === "add" && (
              <Card className="max-w-3xl">
                <CardHeader>
                  <CardTitle>Add testimonial</CardTitle>
                  <CardDescription>Create a new review in the global pool, then add it to collections.</CardDescription>
                </CardHeader>
                <CardContent>
                  <TestimonialAddForm embedded formRef={addFormRef} />
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
