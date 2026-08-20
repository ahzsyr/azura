"use client";

import { useEffect, useState } from "react";
import { loadPageKeySeoFormAction } from "@/features/seo/actions";
import { SeoMetaForm } from "@/features/seo/components/seo-meta-form";
import type { SeoMetaFormPropsFromContext } from "@/features/seo/mappers/to-seo-meta-form-props";
type Props = {
  pageKey: string;
  defaultTitleEn?: string;
  defaultTitleAr?: string;
  defaultDescEn?: string;
  defaultDescAr?: string;
};

export function ProductSeoPanel({
  pageKey,
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
    loadPageKeySeoFormAction(pageKey)
      .then((loaded) => {
        if (!cancelled) setProps(loaded);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load SEO");
      });
    return () => {
      cancelled = true;
    };
  }, [pageKey]);

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
      entityType="product"
      entityId={pageKey.replace(/^product:/, "")}
    />
  );
}
