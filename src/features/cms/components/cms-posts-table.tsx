"use client";

import Link from "next/link";
import type { Post, PostAuthor, PostCategory, MediaAsset } from "@prisma/client";
import {
  deletePost,
  duplicatePost,
  publishPost,
  unpublishPost,
} from "@/features/cms/actions";
import {
  AdminList,
  AdminListMeta,
  AdminListMetaSmall,
  AdminListRow,
  AdminListTitle,
} from "@/components/admin/layout/admin-list";
import { CmsStatusBadge } from "./cms-status-badge";
import { Button } from "@/components/ui/button";
import { Copy, ExternalLink, Pencil, Trash2, Upload } from "lucide-react";
import type { PageBlocks } from "@/types/builder";

type PostRow = Post & {
  author: PostAuthor | null;
  featuredImage: MediaAsset | null;
  categories: { category: PostCategory }[];
  displayTitle?: string;
  categoryLabels?: Record<string, string>;
};

function getBlockCount(blocks: unknown): number {
  return Array.isArray(blocks) ? blocks.length : 0;
}

function postDisplayName(post: PostRow): string {
  return post.displayTitle?.trim() || post.slug;
}

function postEditHref(postId: string): string {
  return `/admin/posts/${postId}?tab=content`;
}

export function CmsPostsTable({ posts }: { posts: PostRow[] }) {
  if (posts.length === 0) {
    return (
      <AdminList>
        <p className="p-8 text-center text-muted-foreground">No posts yet. Create your first blog post.</p>
      </AdminList>
    );
  }

  return (
    <AdminList>
      {posts.map((post) => {
        const blockCount = getBlockCount(post.blocks as PageBlocks);
        const displayName = postDisplayName(post);

        return (
          <AdminListRow key={post.id}>
            <div className="min-w-0 flex-1">
              <AdminListTitle href={postEditHref(post.id)}>{displayName}</AdminListTitle>
              <AdminListMeta>
                /en/blog/{post.slug}
                {post.author && ` · ${post.author.name}`}
              </AdminListMeta>
              {post.categories.length > 0 && (
                <AdminListMetaSmall>
                  {post.categories
                    .map((c) => post.categoryLabels?.[c.category.id] ?? c.category.slug)
                    .join(", ")}
                  {blockCount > 0 && ` · ${blockCount} block${blockCount !== 1 ? "s" : ""}`}
                </AdminListMetaSmall>
              )}
              {post.categories.length === 0 && blockCount > 0 && (
                <AdminListMetaSmall>
                  {blockCount} block{blockCount !== 1 ? "s" : ""}
                </AdminListMetaSmall>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <CmsStatusBadge status={post.status} scheduledAt={post.scheduledAt} />
              <Button variant="outline" size="sm" asChild title="Edit post content and blocks">
                <Link href={postEditHref(post.id)}>
                  <Pencil className="h-3 w-3 me-1" />
                  Edit
                </Link>
              </Button>
              {post.status === "PUBLISHED" && (
                <Button variant="ghost" size="sm" asChild title="View published post">
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
                title="Delete post"
                onClick={() => {
                  if (confirm(`Delete "${displayName}"?`)) deletePost(post.id);
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </AdminListRow>
        );
      })}
    </AdminList>
  );
}
