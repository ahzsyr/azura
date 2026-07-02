"use client";

import { useCallback, useRef } from "react";
import { AdminFormProvider, AdminPageHeader } from "@/components/admin/layout/admin-shell";
import type { PublicLocale } from "@/i18n/locale-config";
import { FaqSetForm } from "./faq-set-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Props = {
  locales: PublicLocale[];
};

export function FaqSetCreatePage({ locales }: Props) {
  const formRef = useRef<HTMLFormElement>(null);

  const handleSave = useCallback(() => {
    formRef.current?.requestSubmit();
  }, []);

  return (
    <AdminFormProvider onSave={handleSave}>
      <AdminPageHeader
        title="New FAQ Set"
        description="Create an FAQ collection, then add questions on the next screen."
      />

      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>FAQ set details</CardTitle>
          <CardDescription>Basic information for the new FAQ collection.</CardDescription>
        </CardHeader>
        <CardContent>
          <FaqSetForm mode="create" embedded formRef={formRef} locales={locales} />
        </CardContent>
      </Card>

      <div className="flex justify-end lg:hidden">
        <Button type="button" onClick={handleSave}>
          Create FAQ set
        </Button>
      </div>
    </AdminFormProvider>
  );
}
