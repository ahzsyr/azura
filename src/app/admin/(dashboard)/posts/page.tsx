import Link from "next/link";
import { cmsRepository } from "@/repositories/cms.repository";
import { CmsPostsTable } from "@/features/cms/components/cms-posts-table";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default async function PostsAdminPage() {
  const posts = await cmsRepository.listPosts();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Blog Posts</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Public URLs: /en/blog/[slug]
          </p>
        </div>
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
      </div>
      <CmsPostsTable posts={posts} />
    </div>
  );
}
