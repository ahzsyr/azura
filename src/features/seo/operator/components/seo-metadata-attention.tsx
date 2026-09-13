import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { SeoMetadataAttentionItem } from "../types";

const KIND_LABEL: Record<SeoMetadataAttentionItem["kind"], string> = {
  "missing-title": "Missing title",
  "missing-description": "Missing description",
  "title-too-long": "Title too long",
  "description-too-long": "Description too long",
};

export function SeoMetadataAttention({ items }: { items: SeoMetadataAttentionItem[] }) {
  const grouped = {
    "missing-title": items.filter((item) => item.kind === "missing-title"),
    "missing-description": items.filter((item) => item.kind === "missing-description"),
    "title-too-long": items.filter((item) => item.kind === "title-too-long"),
    "description-too-long": items.filter((item) => item.kind === "description-too-long"),
  };

  return (
    <section className="rounded-xl border p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Needs attention</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums">{items.length}</p>
      <p className="text-sm text-muted-foreground">pages need metadata improvements</p>
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">Titles and descriptions look complete for static pages.</p>
      ) : (
        <ul className="mt-4 space-y-2 text-sm">
          {(Object.keys(grouped) as Array<keyof typeof grouped>).map((kind) =>
            grouped[kind].length ? (
              <li key={kind}>
                {KIND_LABEL[kind]} · {grouped[kind].length}
              </li>
            ) : null,
          )}
        </ul>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        <Button asChild>
          <Link href="/admin/seo/autofill">Fix all automatically</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/admin/seo/metadata?tab=pages">Review individually</Link>
        </Button>
      </div>
    </section>
  );
}
