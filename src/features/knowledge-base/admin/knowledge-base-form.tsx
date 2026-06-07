"use client";

import { useEffect, useState, useTransition, type RefObject } from "react";
import { useRouter } from "next/navigation";
import type { KnowledgeArticle, KnowledgeBase, KnowledgeCategory } from "@prisma/client";
import { upsertKnowledgeBase } from "@/features/knowledge-base/actions";
import { useAdminFormOptional } from "@/components/admin/layout/admin-form-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AdminLocalizedFormField } from "@/features/translation/components/admin-localized-form-field";

type BaseWithChildren = KnowledgeBase & {
  categories: KnowledgeCategory[];
  articles: KnowledgeArticle[];
};

type CategoryDraft = {
  id?: string;
  parentId: string;
  slug: string;
  titleEn: string;
  titleAr: string;
};

type ArticleDraft = {
  id?: string;
  categoryId: string;
  slug: string;
  titleEn: string;
  titleAr: string;
  excerptEn: string;
  excerptAr: string;
  bodyEn: string;
  bodyAr: string;
};

export function KnowledgeBaseForm({
  knowledgeBase,
  mode = knowledgeBase ? "edit" : "create",
  embedded = false,
  formRef,
}: {
  knowledgeBase?: BaseWithChildren | null;
  mode?: "create" | "edit";
  embedded?: boolean;
  formRef?: RefObject<HTMLFormElement | null>;
}) {
  const router = useRouter();
  const adminForm = useAdminFormOptional();
  const [pending, startTransition] = useTransition();
  const [categories, setCategories] = useState<CategoryDraft[]>(
    knowledgeBase?.categories.map((c) => ({
      id: c.id,
      parentId: c.parentId ?? "",
      slug: c.slug,
      titleEn: c.titleEn,
      titleAr: c.titleAr,
    })) ?? []
  );
  const [articles, setArticles] = useState<ArticleDraft[]>(
    knowledgeBase?.articles.map((a) => ({
      id: a.id,
      categoryId: a.categoryId ?? "",
      slug: a.slug,
      titleEn: a.titleEn,
      titleAr: a.titleAr,
      excerptEn: a.excerptEn,
      excerptAr: a.excerptAr,
      bodyEn: a.bodyEn,
      bodyAr: a.bodyAr,
    })) ?? []
  );

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

      <AdminLocalizedFormField fieldKey="title" label="Title" legacyEntity={knowledgeBase ?? undefined} required />
      <AdminLocalizedFormField fieldKey="description" label="Description" legacyEntity={knowledgeBase ?? undefined} />
      <div className="space-y-2">
        <Label htmlFor="slug">Slug</Label>
        <Input id="slug" name="slug" defaultValue={knowledgeBase?.slug ?? ""} placeholder="auto from title" />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="isPublished" value="true" defaultChecked={knowledgeBase?.isPublished ?? true} />
        Published
      </label>

      <div className="space-y-3 rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <h4 className="font-medium">Categories</h4>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() =>
              setCategories((prev) => [...prev, { parentId: "", slug: "", titleEn: "", titleAr: "" }])
            }
          >
            Add category
          </Button>
        </div>
        {categories.map((cat, index) => (
          <div key={cat.id ?? `cat-${index}`} className="grid gap-2 rounded-md border p-3 md:grid-cols-2">
            <Input
              placeholder="Slug"
              value={cat.slug}
              onChange={(e) =>
                setCategories((prev) => prev.map((c, i) => (i === index ? { ...c, slug: e.target.value } : c)))
              }
            />
            <Input
              placeholder="Parent ID (optional)"
              value={cat.parentId}
              onChange={(e) =>
                setCategories((prev) => prev.map((c, i) => (i === index ? { ...c, parentId: e.target.value } : c)))
              }
            />
            <Input
              placeholder="Title EN"
              value={cat.titleEn}
              onChange={(e) =>
                setCategories((prev) => prev.map((c, i) => (i === index ? { ...c, titleEn: e.target.value } : c)))
              }
            />
            <Input
              placeholder="Title AR"
              dir="rtl"
              value={cat.titleAr}
              onChange={(e) =>
                setCategories((prev) => prev.map((c, i) => (i === index ? { ...c, titleAr: e.target.value } : c)))
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
            onClick={() =>
              setArticles((prev) => [
                ...prev,
                {
                  categoryId: "",
                  slug: "",
                  titleEn: "",
                  titleAr: "",
                  excerptEn: "",
                  excerptAr: "",
                  bodyEn: "",
                  bodyAr: "",
                },
              ])
            }
          >
            Add article
          </Button>
        </div>
        {articles.map((article, index) => (
          <div key={article.id ?? `art-${index}`} className="space-y-2 rounded-md border p-3">
            <div className="grid gap-2 md:grid-cols-2">
              <Input
                placeholder="Slug"
                value={article.slug}
                onChange={(e) =>
                  setArticles((prev) => prev.map((a, i) => (i === index ? { ...a, slug: e.target.value } : a)))
                }
              />
              <Input
                placeholder="Category ID (optional)"
                value={article.categoryId}
                onChange={(e) =>
                  setArticles((prev) =>
                    prev.map((a, i) => (i === index ? { ...a, categoryId: e.target.value } : a))
                  )
                }
              />
              <Input
                placeholder="Title EN"
                value={article.titleEn}
                onChange={(e) =>
                  setArticles((prev) => prev.map((a, i) => (i === index ? { ...a, titleEn: e.target.value } : a)))
                }
              />
              <Input
                placeholder="Title AR"
                dir="rtl"
                value={article.titleAr}
                onChange={(e) =>
                  setArticles((prev) => prev.map((a, i) => (i === index ? { ...a, titleAr: e.target.value } : a)))
                }
              />
            </div>
            <Input
              placeholder="Excerpt EN"
              value={article.excerptEn}
              onChange={(e) =>
                setArticles((prev) => prev.map((a, i) => (i === index ? { ...a, excerptEn: e.target.value } : a)))
              }
            />
            <Input
              placeholder="Body EN"
              value={article.bodyEn}
              onChange={(e) =>
                setArticles((prev) => prev.map((a, i) => (i === index ? { ...a, bodyEn: e.target.value } : a)))
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
