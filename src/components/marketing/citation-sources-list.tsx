import type { CitationSource } from "@/schemas/editorial-metadata";
import { ExternalLink } from "lucide-react";

type Props = {
  sources: CitationSource[];
  heading?: string;
};

export function CitationSourcesList({ sources, heading = "Sources" }: Props) {
  if (sources.length === 0) return null;

  return (
    <section className="mt-12 pt-8 border-t">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
        {heading}
      </h2>
      <ul className="space-y-1">
        {sources.map((src, i) => (
          <li key={i} className="text-sm">
            <a
              href={src.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:underline"
            >
              {src.label}
              <ExternalLink className="h-3 w-3 flex-shrink-0" />
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
