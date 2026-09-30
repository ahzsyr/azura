"use client";

import { useState } from "react";
import type { PageBlocks } from "@/types/builder";
import { BlockPreviewRenderer } from "./block-preview-renderer";
import { cn } from "@/lib/utils";

type Props = {
  blocks: PageBlocks;
};

const AR_LOCALE = "ar";

export function BlockMobilePreview({ blocks }: Props) {
  const [locale, setLocale] = useState<"en" | "ar">("en");

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Mobile preview</h3>
        <div className="flex rounded-md border p-0.5 text-xs">
          <button
            type="button"
            className={cn("rounded px-2 py-0.5", locale === "en" && "bg-primary text-primary-foreground")}
            onClick={() => setLocale("en")}
          >
            EN
          </button>
          <button
            type="button"
            className={cn("rounded px-2 py-0.5", locale === AR_LOCALE && "bg-primary text-primary-foreground")}
            onClick={() => setLocale(AR_LOCALE)}
          >
            AR
          </button>
        </div>
      </div>
      <div className="mx-auto w-full max-w-[280px]">
        <div className="rounded-[2rem] border-[6px] border-foreground/80 bg-foreground/80 p-1 shadow-xl">
          <div className="rounded-[1.5rem] overflow-hidden bg-background max-h-[480px] overflow-y-auto">
            <div className="h-5 bg-muted flex items-center justify-center">
              <div className="w-16 h-1 rounded-full bg-foreground/20" />
            </div>
            <BlockPreviewRenderer blocks={blocks} locale={locale} />
          </div>
        </div>
      </div>
    </div>
  );
}
