"use client";

import { useCallback, useRef } from "react";
import { AdminFormProvider, AdminPageHeader } from "@/components/admin/layout/admin-shell";
import { TestimonialCollectionForm } from "./testimonial-collection-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function TestimonialCollectionCreatePage() {
  const formRef = useRef<HTMLFormElement>(null);

  const handleSave = useCallback(() => {
    formRef.current?.requestSubmit();
  }, []);

  return (
    <AdminFormProvider onSave={handleSave}>
      <AdminPageHeader
        title="New testimonial collection"
        description="Create a collection, then add testimonials on the next screen."
      />

      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>Collection details</CardTitle>
          <CardDescription>Basic information for the new testimonial group.</CardDescription>
        </CardHeader>
        <CardContent>
          <TestimonialCollectionForm mode="create" embedded formRef={formRef} />
        </CardContent>
      </Card>

      <div className="flex justify-end lg:hidden">
        <Button type="button" onClick={handleSave}>
          Create collection
        </Button>
      </div>
    </AdminFormProvider>
  );
}
