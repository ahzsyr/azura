import {
  getLengthFieldFeedback,
  SEO_DESCRIPTION_LENGTH,
  SEO_TITLE_LENGTH,
} from "@/features/seo/scoring/seo-scoring.service";
import type { SeoMetadataPreviewVm } from "../types";
import { cn } from "@/lib/utils";

type Props = {
  metadata: SeoMetadataPreviewVm;
};

export function SeoMetadataPreview({ metadata }: Props) {
  const titleFb = getLengthFieldFeedback(
    metadata.title,
    SEO_TITLE_LENGTH.min,
    SEO_TITLE_LENGTH.max,
    "Missing title",
  );
  const descFb = getLengthFieldFeedback(
    metadata.description,
    SEO_DESCRIPTION_LENGTH.min,
    SEO_DESCRIPTION_LENGTH.max,
    "Missing description",
  );

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Google Preview</p>
          <div className="rounded-lg border bg-white p-4 space-y-1">
            <p className="text-sm text-emerald-800 truncate">{metadata.url}</p>
            <p className="text-xl text-[#1a0dab] leading-snug line-clamp-2">
              {metadata.title || "Untitled page"}
            </p>
            <p className="text-sm text-[#4d5156] line-clamp-2">
              {metadata.description || "Add a meta description to improve click-through."}
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Facebook</p>
            <div className="overflow-hidden rounded border bg-muted/20">
              {metadata.ogImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={metadata.ogImageUrl}
                  alt=""
                  className="aspect-[1.91/1] w-full object-cover"
                />
              ) : (
                <div className="aspect-[1.91/1] bg-muted flex items-center justify-center text-xs text-muted-foreground">
                  No OG image
                </div>
              )}
              <div className="p-2 space-y-0.5">
                <p className="text-xs uppercase text-muted-foreground truncate">{metadata.url}</p>
                <p className="text-sm font-semibold line-clamp-2">
                  {metadata.ogTitle || metadata.title || "Untitled"}
                </p>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {metadata.description || "—"}
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Twitter / X</p>
            <div className="overflow-hidden rounded border bg-muted/20">
              {metadata.ogImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={metadata.ogImageUrl}
                  alt=""
                  className="aspect-[2/1] w-full object-cover"
                />
              ) : (
                <div className="aspect-[2/1] bg-muted flex items-center justify-center text-xs text-muted-foreground">
                  No card image
                </div>
              )}
              <div className="p-2">
                <p className="text-sm font-semibold line-clamp-2">
                  {metadata.ogTitle || metadata.title || "Untitled"}
                </p>
                <p className="text-xs text-muted-foreground truncate">{metadata.url}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3 rounded-lg border p-4">
        <Meter label="Title" feedback={titleFb} max={SEO_TITLE_LENGTH.max} />
        <Meter label="Description" feedback={descFb} max={SEO_DESCRIPTION_LENGTH.max} />
        <Row label="OG Image" value={metadata.ogImageUrl ? "Set" : "Missing"} ok={Boolean(metadata.ogImageUrl)} />
        <Row
          label="Canonical"
          value={metadata.canonicalUrl?.trim() || "Not set"}
          ok={Boolean(metadata.canonicalUrl?.trim())}
        />
        <Row
          label="Robots"
          value={metadata.robots?.trim() || "Index, Follow (default)"}
          ok
        />
        <Row
          label="JSON-LD"
          value={metadata.jsonLdSummary || "None"}
          ok={Boolean(metadata.jsonLdSummary)}
        />
      </div>
    </div>
  );
}

function Meter({
  label,
  feedback,
  max,
}: {
  label: string;
  feedback: ReturnType<typeof getLengthFieldFeedback>;
  max: number;
}) {
  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-1">
        <span className="font-medium">{label}</span>
        <span className="tabular-nums text-muted-foreground">
          {feedback.length} / {max}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full",
            feedback.tone === "good" && "bg-emerald-500",
            feedback.tone === "short" && "bg-amber-500",
            feedback.tone === "long" && "bg-red-500",
            feedback.tone === "empty" && "bg-transparent",
          )}
          style={{ width: `${feedback.progress}%` }}
        />
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{feedback.message}</p>
    </div>
  );
}

function Row({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm border-t pt-3 first:border-0 first:pt-0">
      <span className="font-medium">{label}</span>
      <span className={cn("text-right", ok ? "text-emerald-700" : "text-muted-foreground")}>
        {ok ? "✓ " : "○ "}
        {value}
      </span>
    </div>
  );
}
