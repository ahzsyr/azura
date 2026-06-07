"use client";

import Link from "next/link";
import type { Post, PostAuthor, PostCategory, MediaAsset } from "@prisma/client";
import {
  deletePost,
  duplicatePost,
  publishPost,
  unpublishPost,
} from "@/features/cms/actions";
import { CmsStatusBadge } from "./cms-status-badge";
import { Button } from "@/components/ui/button";
import { Copy, ExternalLink, Trash2, Upload } from "lucide-react";
type PostRow = Post & {
  author: PostAuthor | null;
  featuredImage: MediaAsset | null;
  categories: { category: PostCategory }[];
};

export function CmsPostsTable({ posts }: { posts: PostRow[] }) {
  return (
    <div className="border rounded-lg divide-y overflow-hidden">
      {posts.map((post) => (
        <div
          key={post.id}
          className="flex flex-wrap items-center justify-between gap-3 p-4 hover:bg-muted/40"
        >
          <div className="min-w-0 flex-1">
            <Link href={`/admin/posts/${post.id}`} className="font-medium hover:text-primary">
              {post.titleEn}
            </Link>
            <p className="text-sm text-muted-foreground">
              /blog/{post.slug}
              {post.author && ` · ${post.author.name}`}
            </p>
            {post.categories.length > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                {post.categories.map((c) => c.category.nameEn).join(", ")}
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <CmsStatusBadge status={post.status} scheduledAt={post.scheduledAt} />
            {post.status === "PUBLISHED" && (
              <Button variant="ghost" size="sm" asChild>
                <Link href={`/en/blog/${post.slug}`} target="_blank">
                  <ExternalLink className="h-4 w-4" />
                </Link>
              </Button>
            )}
            {post.status !== "PUBLISHED" && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={async () => {
                  await publishPost(post.id);
                  window.location.reload();
                }}
              >
                <Upload className="h-3 w-3 me-1" />
                Publish
              </Button>
            )}
            {post.status === "PUBLISHED" && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={async () => {
                  await unpublishPost(post.id);
                  window.location.reload();
                }}
              >
                Unpublish
              </Button>
            )}
            <Button type="button" variant="ghost" size="sm" onClick={() => duplicatePost(post.id)}>
              <Copy className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-destructive"
              onClick={() => {
                if (confirm(`Delete "${post.titleEn}"?`)) deletePost(post.id);
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
      {posts.length === 0 && (
        <p className="p-8 text-center text-muted-foreground">No posts yet.</p>
      )}
    </div>
  );
}
