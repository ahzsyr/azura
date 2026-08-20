"use client";

import { useEffect, useState, useTransition, type RefObject } from "react";
import { useRouter } from "next/navigation";
import type { KnowledgeArticle, KnowledgeBase, KnowledgeCategory } from "@prisma/client";
import { upsertKnowledgeBase } from "@/presets/knowledge/actions";
import { useAdminFormOptional } from "@/components/admin/layout/admin-form-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AdminLocalizedFormField } from "@/features/translation/components/admin-localized-form-field";
import { NestedLocalizedRowInput } from "@/features/translation/components/nested-localized-row-field";
import type { KnowledgeBaseFormDrafts } from "./knowledge-base-form-data";

type BaseWithChildren = KnowledgeBase & {
  categories: KnowledgeCategory[];
  articles: KnowledgeArticle[];
};

const EMPTY_CATEGORY = {
  parentId: "",
  slug: "",
};

const EMPTY_ARTICLE = {
  categoryId: "",
  slug: "",
};

export function KnowledgeBaseForm({
  knowledgeBase,
  formDrafts,
  mode = knowledgeBase ? "edit" : "create",
  embedded = false,
  formRef,
}: {
  knowledgeBase?: BaseWithChildren | null;
  formDrafts?: KnowledgeBaseFormDrafts;
  mode?: "create" | "edit";
  embedded?: boolean;
  formRef?: RefObject<HTMLFormElement | null>;
}) {
  const router = useRouter();
  const adminForm = useAdminFormOptional();
  const [pending, startTransition] = useTransition();
  const [categories, setCategories] = useState<Record<string, unknown>[]>(
    formDrafts?.categories ?? []
  );
  const [articles, setArticles] = useState<Record<string, unknown>[]>(formDrafts?.articles ?? []);

  useEffect(() => {
    if (formDrafts) {
      setCategories(formDrafts.categories);
      setArticles(formDrafts.articles);
    }
  }, [formDrafts]);

  useEffect(() => {
    if (!embedded || !formRef?.current || !adminForm) return;
    const form = formRef.current;
    const markDirty = () => adminForm.setDirty(true);
    form.addEventListener("input", markDirty);
    form.addEventListener("change", markDirty);
    return () => {
      form.removeEventListener("input", markDirty);
      form.removeEventListener("change", markDirty);
    };
  }, [embedded, formRef, adminForm]);

  const handleSubmit = (formData: FormData) => {
    formData.set("categoriesJson", JSON.stringify(categories));
    formData.set("articlesJson", JSON.stringify(articles));
    startTransition(async () => {
      const saved = await upsertKnowledgeBase(formData);
      adminForm?.setDirty(false);
      if (mode === "create") router.push(`/admin/knowledge-base/${saved.id}`);
      else {
        adminForm?.showToast("Knowledge base saved", "success");
        router.refresh();
      }
    });
  };

  return (
    <form
      ref={formRef}
      onSubmit={(e) => {
        e.preventDefault();
        handleSubmit(new FormData(e.currentTarget));
      }}
      className="space-y-6"
    >
      {knowledgeBase && <input type="hidden" name="id" value={knowledgeBase.id} />}
      <input type="hidden" name="sortOrder" value={knowledgeBase?.sortOrder ?? 0} />

      <AdminLocalizedFormField
        fieldKey="title"
        label="Title"
        entityType="KnowledgeBase"
        entityId={knowledgeBase?.id}
        legacyEntity={formDrafts?.baseLegacy ?? knowledgeBase ?? undefined}
        required
      />
      <AdminLocalizedFormField
        fieldKey="description"
        label="Description"
        entityType="KnowledgeBase"
        entityId={knowledgeBase?.id}
        legacyEntity={formDrafts?.baseLegacy ?? knowledgeBase ?? undefined}
        multiline
        rows={3}
      />
      <div className="space-y-2">
        <Label htmlFor="slug">Slug</Label>
        <Input
          id="slug"
          name="slug"
          defaultValue={knowledgeBase?.slug ?? ""}
          placeholder="auto from title"
        />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="isPublished"
          value="true"
          defaultChecked={knowledgeBase?.isPublished ?? true}
        />
        Published
      </label>

      <div className="space-y-3 rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <h4 className="font-medium">Categories</h4>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setCategories((prev) => [...prev, { ...EMPTY_CATEGORY }])}
          >
            Add category
          </Button>
        </div>
        {categories.map((cat, index) => (
          <div key={String(cat.id ?? `cat-${index}`)} className="grid gap-2 rounded-md border p-3 md:grid-cols-2">
            <Input
              placeholder="Slug"
              value={String(cat.slug ?? "")}
              onChange={(e) =>
                setCategories((prev) =>
                  prev.map((c, i) => (i === index ? { ...c, slug: e.target.value } : c))
                )
              }
            />
            <Input
              placeholder="Parent ID (optional)"
              value={String(cat.parentId ?? "")}
              onChange={(e) =>
                setCategories((prev) =>
                  prev.map((c, i) => (i === index ? { ...c, parentId: e.target.value } : c))
                )
              }
            />
            <NestedLocalizedRowInput
              row={cat}
              field="title"
              label="Title"
              onChange={(nextRow) =>
                setCategories((prev) => prev.map((c, i) => (i === index ? nextRow : c)))
              }
            />
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setCategories((prev) => prev.filter((_, i) => i !== index))}
            >
              Remove
            </Button>
          </div>
        ))}
      </div>

      <div className="space-y-3 rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <h4 className="font-medium">Articles</h4>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setArticles((prev) => [...prev, { ...EMPTY_ARTICLE }])}
          >
            Add article
          </Button>
        </div>
        {articles.map((article, index) => (
          <div key={String(article.id ?? `art-${index}`)} className="space-y-2 rounded-md border p-3">
            <div className="grid gap-2 md:grid-cols-2">
              <Input
                placeholder="Slug"
                value={String(article.slug ?? "")}
                onChange={(e) =>
                  setArticles((prev) =>
                    prev.map((a, i) => (i === index ? { ...a, slug: e.target.value } : a))
                  )
                }
              />
              <Input
                placeholder="Category ID (optional)"
                value={String(article.categoryId ?? "")}
                onChange={(e) =>
                  setArticles((prev) =>
                    prev.map((a, i) => (i === index ? { ...a, categoryId: e.target.value } : a))
                  )
                }
              />
              <NestedLocalizedRowInput
                row={article}
                field="title"
                label="Title"
                onChange={(nextRow) =>
                  setArticles((prev) => prev.map((a, i) => (i === index ? nextRow : a)))
                }
              />
              <NestedLocalizedRowInput
                row={article}
                field="excerpt"
                label="Excerpt"
                onChange={(nextRow) =>
                  setArticles((prev) => prev.map((a, i) => (i === index ? nextRow : a)))
                }
              />
            </div>
            <NestedLocalizedRowInput
              row={article}
              field="body"
              label="Body"
              multiline
              rows={4}
              onChange={(nextRow) =>
                setArticles((prev) => prev.map((a, i) => (i === index ? nextRow : a)))
              }
            />
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setArticles((prev) => prev.filter((_, i) => i !== index))}
            >
              Remove
            </Button>
          </div>
        ))}
      </div>

      {!embedded ? (
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : mode === "create" ? "Create" : "Save"}
        </Button>
      ) : null}
    </form>
  );
}
