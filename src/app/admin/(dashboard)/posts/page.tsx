import Link from "next/link";
import { cmsRepository } from "@/repositories/cms.repository";
import { CmsPostsTable } from "@/features/cms/components/cms-posts-table";
import { AdminPageHeader } from "@/components/admin/layout/admin-content-area";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { resolveTranslation } from "@/features/translation/translation-resolver";
import { localeService } from "@/features/i18n/locale.service";

export default async function PostsAdminPage() {
  const posts = await cmsRepository.listPosts();
  const enabledLocales = await localeService.listEnabled();
  const defaultCode = enabledLocales.find((l) => l.isDefault)?.code ?? "en";

  const postIds = posts.map((p) => p.id);
  const categoryIds = [...new Set(posts.flatMap((p) => p.categories.map((c) => c.category.id)))];

  const translations = await prisma.entityTranslation.findMany({
    where: {
      OR: [
        { entityType: "Post", entityId: { in: postIds }, field: "title" },
        { entityType: "PostCategory", entityId: { in: categoryIds }, field: "name" },
      ],
    },
  });

  const postTitles = new Map<string, string>();
  const categoryNames = new Map<string, string>();
  for (const row of translations) {
    if (row.entityType === "Post" && row.field === "title") {
      const existing = postTitles.get(row.entityId);
      if (!existing || row.localeCode === defaultCode) {
        postTitles.set(row.entityId, row.value);
      }
    }
    if (row.entityType === "PostCategory" && row.field === "name") {
      const existing = categoryNames.get(row.entityId);
      if (!existing || row.localeCode === defaultCode) {
        categoryNames.set(row.entityId, row.value);
      }
    }
  }

  const rows = posts.map((post) => ({
    ...post,
    displayTitle:
      postTitles.get(post.id) ||
      resolveTranslation("title", defaultCode, {
        translations: translations.filter((t) => t.entityType === "Post" && t.entityId === post.id),
      }),
    categoryLabels: Object.fromEntries(
      post.categories.map((c) => [
        c.category.id,
        categoryNames.get(c.category.id) ?? c.category.slug,
      ])
    ),
  }));

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Blog Posts"
        description="Public URLs: /en/blog/[slug]"
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link href="/admin/posts/authors">Authors</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/admin/posts/categories">Categories</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/admin/posts/tags">Tags</Link>
            </Button>
            <Button asChild>
              <Link href="/admin/posts/new">
                <Plus className="h-4 w-4 me-1" />
                New post
              </Link>
            </Button>
          </div>
        }
      />
      <CmsPostsTable posts={rows} />
    </div>
  );
}
