"use client";

import type { SectionEditorProps } from "../types";

/** Brand uses theme identity; optional type-specific hints only. */
export function BrandEditor(_props: SectionEditorProps) {
  return (
    <p className="text-sm text-muted-foreground">
      Brand name and tagline are pulled from Theme site identity. Use the body field above for extra text.
    </p>
  );
}
