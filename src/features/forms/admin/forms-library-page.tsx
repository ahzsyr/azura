"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormTemplateCategory } from "@prisma/client";
import { AdminPageHeader } from "@/components/admin/layout/admin-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  deleteFormTemplateAction,
  duplicateFormTemplateAction,
} from "@/features/forms/actions";

type TemplateRow = {
  id: string;
  name: string;
  slug: string;
  category: FormTemplateCategory;
  isPublished: boolean;
  updatedAt: Date;
};

const CATEGORY_LABELS: Record<FormTemplateCategory, string> = {
  LEAD: "Lead",
  CONTACT: "Contact",
  MULTI_STEP: "Multi-step",
  GENERAL: "General",
};

export function FormsLibraryPage({ templates }: { templates: TemplateRow[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  const handleDuplicate = async (id: string) => {
    setBusy(id);
    const res = await duplicateFormTemplateAction(id);
    setBusy(null);
    if (res.success && res.data?.id) router.push(`/admin/forms/${res.data.id}`);
    else router.refresh();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this form template?")) return;
    setBusy(id);
    await deleteFormTemplateAction(id);
    setBusy(null);
    router.refresh();
  };

  return (
    <>
      <AdminPageHeader
        title="Form Templates"
        description="Build reusable forms for lead capture, contact, and multi-step flows."
        actions={
          <Button asChild>
            <Link href="/admin/forms/new">New template</Link>
          </Button>
        }
      />

      <div className="grid gap-3">
        {templates.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">
            No templates yet. Create your first form template.
          </Card>
        ) : (
          templates.map((t) => (
            <Card key={t.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <div className="flex items-center gap-2">
                  <Link href={`/admin/forms/${t.id}`} className="font-medium hover:text-primary">
                    {t.name}
                  </Link>
                  <Badge variant="outline">{CATEGORY_LABELS[t.category]}</Badge>
                  {!t.isPublished && <Badge variant="secondary">Draft</Badge>}
                </div>
                <p className="text-sm text-muted-foreground mt-1">/{t.slug}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/admin/forms/${t.id}`}>Edit</Link>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={busy === t.id}
                  onClick={() => handleDuplicate(t.id)}
                >
                  Duplicate
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={busy === t.id}
                  onClick={() => handleDelete(t.id)}
                >
                  Delete
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>
    </>
  );
}
