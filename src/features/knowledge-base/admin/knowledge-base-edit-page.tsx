"use client";

import { useCallback, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { KnowledgeArticle, KnowledgeBase, KnowledgeCategory } from "@prisma/client";
import { toggleKnowledgeBasePublished } from "@/features/knowledge-base/actions";
import { AdminFormProvider, AdminPageHeader } from "@/components/admin/layout/admin-shell";
import { KnowledgeBaseForm } from "./knowledge-base-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function KnowledgeBaseEditPage({
  knowledgeBase,
}: {
  knowledgeBase: KnowledgeBase & { categories: KnowledgeCategory[]; articles: KnowledgeArticle[] };
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [publishing, startPublish] = useTransition();
  const handleSave = useCallback(() => formRef.current?.requestSubmit(), []);

  return (
    <AdminFormProvider
      onSave={handleSave}
      onPublish={() =>
        startPublish(async () => {
          await toggleKnowledgeBasePublished(knowledgeBase.id, true);
          router.refresh();
        })
      }
      canPublish={!publishing}
    >
      <AdminPageHeader
        title={`Edit: ${knowledgeBase.titleEn}`}
        description={`/${knowledgeBase.slug} · ${knowledgeBase.categories.length} categories · ${knowledgeBase.articles.length} articles`}
        actions={!knowledgeBase.isPublished ? <Badge variant="secondary">Hidden</Badge> : null}
      />
      <Card className="max-w-4xl">
        <CardHeader>
          <CardTitle>Knowledge base</CardTitle>
        </CardHeader>
        <CardContent>
          <KnowledgeBaseForm knowledgeBase={knowledgeBase} mode="edit" embedded formRef={formRef} />
        </CardContent>
      </Card>
      <div className="flex justify-end lg:hidden">
        <Button type="button" onClick={handleSave}>
          Save
        </Button>
      </div>
    </AdminFormProvider>
  );
}
