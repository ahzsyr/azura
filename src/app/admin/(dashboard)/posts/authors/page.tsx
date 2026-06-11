import { cmsRepository } from "@/repositories/cms.repository";
import { upsertPostAuthor, deletePostAuthor } from "@/features/cms/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";

export default async function PostAuthorsPage() {
  const authors = await cmsRepository.listAuthors();

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
          <Label>Bio EN</Label>
          <Textarea name="bioEn" rows={3} className="mt-1" />
        </div>
        <div>
          <Label>Bio AR</Label>
          <Textarea name="bioAr" dir="rtl" rows={3} className="mt-1" />
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
              {author.bioEn && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{author.bioEn}</p>}
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
