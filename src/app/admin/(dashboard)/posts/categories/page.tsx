import Link from "next/link";
import { cmsRepository } from "@/repositories/cms.repository";
import { upsertPostCategory, deletePostCategory } from "@/features/cms/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default async function PostCategoriesPage() {
  const categories = await cmsRepository.listCategories();

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
          <Label>Name EN</Label>
          <Input name="nameEn" required className="mt-1" />
        </div>
        <div>
          <Label>Name AR</Label>
          <Input name="nameAr" dir="rtl" required className="mt-1" />
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
              {c.nameEn} / {c.nameAr}
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
