"use client";

import { useEffect } from "react";

type Props = {
  lang: string;
  dir: "ltr" | "rtl";
};

export function DocumentAttributes({ lang, dir }: Props) {
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
  }, [lang, dir]);

  return null;
}
