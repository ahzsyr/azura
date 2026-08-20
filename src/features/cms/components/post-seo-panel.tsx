"use client";

import { useEffect, useState } from "react";
import { loadPostSeoFormAction } from "@/features/seo/actions";
import { SeoMetaForm } from "@/features/seo/components/seo-meta-form";
import type { SeoMetaFormPropsFromContext } from "@/features/seo/mappers/to-seo-meta-form-props";

type Props = {
  postId: string;
  defaultTitleEn?: string;
  defaultTitleAr?: string;
  defaultDescEn?: string;
  defaultDescAr?: string;
  onPublish?: () => boolean | void | Promise<boolean | void>;
  canPublish?: boolean;
};

export function PostSeoPanel({
  postId,
  defaultTitleEn = "",
  defaultTitleAr = "",
  defaultDescEn = "",
  defaultDescAr = "",
  onPublish,
  canPublish,
}: Props) {
  const [props, setProps] = useState<SeoMetaFormPropsFromContext | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setProps(null);
    setError(null);
    loadPostSeoFormAction(postId)
      .then((loaded) => {
        if (!cancelled) setProps(loaded);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load SEO");
      });
    return () => {
      cancelled = true;
    };
  }, [postId]);

  if (error) {
    return <p className="text-sm text-destructive">{error}</p>;
  }

  if (!props) {
    return <p className="text-sm text-muted-foreground animate-pulse">Loading SEO…</p>;
  }

  return (
    <SeoMetaForm
      {...props}
      embedded
      useTopBarActions
      onPublish={onPublish}
      canPublish={canPublish}
      defaultTitleEn={defaultTitleEn || props.defaultTitleEn}
      defaultTitleAr={defaultTitleAr || props.defaultTitleAr}
      defaultDescEn={defaultDescEn || props.defaultDescEn}
      defaultDescAr={defaultDescAr || props.defaultDescAr}
      entityType="Post"
      entityId={postId}
      postId={postId}
    />
  );
}
