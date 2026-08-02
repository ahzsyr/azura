"use client";

import { useEffect } from "react";

type Props = {
  lang: string;
  dir: "ltr" | "rtl";
  locale?: string;
};

export function DocumentAttributes({ lang, dir, locale }: Props) {
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
    if (locale) {
      document.documentElement.dataset.locale = locale;
    } else {
      delete document.documentElement.dataset.locale;
    }
  }, [lang, dir, locale]);

  return null;
}
