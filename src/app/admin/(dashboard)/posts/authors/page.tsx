import { cmsRepository } from "@/repositories/cms.repository";
import { upsertPostAuthor, deletePostAuthor } from "@/features/cms/actions";
import { PostAuthorBioField } from "@/features/cms/admin/post-taxonomy-fields";
import { loadAdminRowsWithLocalizedFields } from "@/features/translation/admin-entity-helpers";
import { readAdminLocaleField } from "@/features/translation/admin-localized-view";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";

export default async function PostAuthorsPage() {
  const rows = await cmsRepository.listAuthors();
  const authors = await loadAdminRowsWithLocalizedFields("PostAuthor", rows, ["bio"]);

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <Link href="/admin/posts" className="text-sm text-muted-foreground hover:text-primary">
          ← Back to posts
        </Link>
        <h1 className="text-2xl font-bold mt-2">Post Authors</h1>
      </div>
      <form action={upsertPostAuthor} className="space-y-4 border rounded-lg p-6">
        <div>
          <Label>Name</Label>
          <Input name="name" required className="mt-1" />
        </div>
        <div>
          <PostAuthorBioField />
        </div>
        <div>
          <Label>Avatar URL</Label>
          <Input name="avatarUrl" className="mt-1" />
        </div>
        <Button type="submit">Add author</Button>
      </form>
      <ul className="divide-y border rounded-lg">
        {authors.map((author) => (
          <li key={author.id} className="p-4 flex flex-wrap justify-between gap-4">
            <div>
              <p className="font-medium">{author.name}</p>
              {readAdminLocaleField(author, "bio", "en") && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {readAdminLocaleField(author, "bio", "en")}
                </p>
              )}
            </div>
            <form action={deletePostAuthor.bind(null, author.id)}>
              <Button type="submit" variant="destructive" size="sm">
                Delete
              </Button>
            </form>
          </li>
        ))}
        {authors.length === 0 && (
          <li className="p-6 text-center text-muted-foreground text-sm">No authors yet.</li>
        )}
      </ul>
    </div>
  );
}
