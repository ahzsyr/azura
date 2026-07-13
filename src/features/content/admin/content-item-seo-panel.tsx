"use client";

import { useEffect, useState } from "react";
import { loadContentItemSeoFormAction } from "@/features/seo/actions";
import { SeoMetaForm } from "@/features/seo/components/seo-meta-form";
import type { SeoMetaFormPropsFromContext } from "@/features/seo/mappers/to-seo-meta-form-props";

type Props = {
  contentItemId: string;
  defaultTitleEn?: string;
  defaultTitleAr?: string;
  defaultDescEn?: string;
  defaultDescAr?: string;
};

export function ContentItemSeoPanel({
  contentItemId,
  defaultTitleEn = "",
  defaultTitleAr = "",
  defaultDescEn = "",
  defaultDescAr = "",
}: Props) {
  const [props, setProps] = useState<SeoMetaFormPropsFromContext | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setProps(null);
    setError(null);
    loadContentItemSeoFormAction(contentItemId)
      .then((loaded) => {
        if (!cancelled) setProps(loaded);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load SEO");
      });
    return () => {
      cancelled = true;
    };
  }, [contentItemId]);

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
      defaultTitleEn={defaultTitleEn || props.defaultTitleEn}
      defaultTitleAr={defaultTitleAr || props.defaultTitleAr}
      defaultDescEn={defaultDescEn || props.defaultDescEn}
      defaultDescAr={defaultDescAr || props.defaultDescAr}
      entityType="ContentItem"
      entityId={contentItemId}
      contentItemId={contentItemId}
    />
  );
}
