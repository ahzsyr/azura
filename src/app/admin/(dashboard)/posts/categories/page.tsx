import Link from "next/link";
import { cmsRepository } from "@/repositories/cms.repository";
import { upsertPostCategory, deletePostCategory } from "@/features/cms/actions";
import { PostTaxonomyNameField } from "@/features/cms/admin/post-taxonomy-fields";
import { loadAdminRowsWithLocalizedFields } from "@/features/translation/admin-entity-helpers";
import { readAdminLocaleField } from "@/features/translation/admin-localized-view";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default async function PostCategoriesPage() {
  const rows = await cmsRepository.listCategories();
  const categories = await loadAdminRowsWithLocalizedFields("PostCategory", rows, ["name"]);

  return (
    <div className="space-y-8 max-w-xl">
      <Link href="/admin/posts" className="text-sm text-muted-foreground hover:text-primary">
        ← Back to posts
      </Link>
      <h1 className="text-2xl font-bold">Post Categories</h1>
      <form action={upsertPostCategory} className="space-y-4 border rounded-lg p-4">
        <div>
          <Label>Slug</Label>
          <Input name="slug" required className="mt-1" />
        </div>
        <div>
          <PostTaxonomyNameField required />
        </div>
        <div>
          <Label>Sort order</Label>
          <Input name="sortOrder" type="number" defaultValue={0} className="mt-1" />
        </div>
        <Button type="submit">Add category</Button>
      </form>
      <ul className="divide-y border rounded-lg">
        {categories.map((c) => (
          <li key={c.id} className="p-3 flex justify-between items-center gap-2">
            <span>
              {c.displayTitle} / {readAdminLocaleField(c, "name", "ar")}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-sm">{c.slug}</span>
              <form action={deletePostCategory.bind(null, c.id)}>
                <Button type="submit" variant="ghost" size="sm" className="text-destructive">
                  Delete
                </Button>
              </form>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
