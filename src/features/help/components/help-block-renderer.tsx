"use client";

import Link from "next/link";
import { HelpFlowDiagram } from "@/features/help/components/help-flow-diagram";
import { HelpChecklistView } from "@/features/help/components/help-checklist";
import { helpHref } from "@/features/help/lib/help-href";
import type { HelpBlock } from "@/features/help/types";
import { cn } from "@/lib/utils";

function BulletList({ items, className }: { items: string[]; className?: string }) {
  return (
    <ul className={cn("list-disc space-y-1 ps-5 text-sm text-muted-foreground", className)}>
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

export function HelpBlockRenderer({
  blocks,
  topicId,
  className,
}: {
  blocks: HelpBlock[];
  topicId?: string;
  className?: string;
}) {
  return (
    <div className={cn("space-y-4", className)}>
      {blocks.map((block) => {
        switch (block.type) {
          case "paragraph":
            return (
              <p key={block.id} id={block.id} className="text-sm leading-relaxed text-muted-foreground">
                {block.text}
              </p>
            );
          case "heading":
            return block.level === 2 ? (
              <h3 key={block.id} id={block.id} className="text-base font-semibold">
                {block.text}
              </h3>
            ) : (
              <h4 key={block.id} id={block.id} className="text-sm font-semibold">
                {block.text}
              </h4>
            );
          case "purpose":
            return (
              <div key={block.id} id={block.id} className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Purpose
                </p>
                <p className="text-sm leading-relaxed">{block.text}</p>
              </div>
            );
          case "when_to_use":
            return (
              <div key={block.id} id={block.id} className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  When to use
                </p>
                <BulletList items={block.items} />
              </div>
            );
          case "prerequisites":
            return (
              <div key={block.id} id={block.id} className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Before you begin
                </p>
                <BulletList items={block.items} />
              </div>
            );
          case "best_practices":
            return (
              <div key={block.id} id={block.id} className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Best practices
                </p>
                <BulletList items={block.items} />
              </div>
            );
          case "mistakes":
            return (
              <div key={block.id} id={block.id} className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Common mistakes
                </p>
                <BulletList items={block.items} />
              </div>
            );
          case "field":
            return (
              <div
                key={block.id}
                id={block.id}
                className="space-y-1 rounded-lg border px-3 py-2 text-sm"
              >
                <p className="font-medium">{block.name}</p>
                <p className="text-muted-foreground">{block.purpose}</p>
                {block.recommended && (
                  <p>
                    <span className="font-medium">Recommended: </span>
                    {block.recommended}
                  </p>
                )}
                {block.example && (
                  <p>
                    <span className="font-medium">Example: </span>
                    {block.example}
                  </p>
                )}
                {block.mistakes && block.mistakes.length > 0 && (
                  <BulletList items={block.mistakes} />
                )}
              </div>
            );
          case "overview_item":
            return (
              <div key={block.id} id={block.id} className="rounded-md border px-3 py-2 text-sm">
                <p className="font-medium">{block.title}</p>
                <p className="text-muted-foreground">{block.description}</p>
              </div>
            );
          case "troubleshooting_list":
            return (
              <div key={block.id} id={block.id} className="space-y-3">
                {block.items.map((item) => (
                  <details key={item.id} className="rounded-md border px-3 py-2 text-sm">
                    <summary className="cursor-pointer font-medium">{item.problem}</summary>
                    <div className="mt-2 space-y-2 text-muted-foreground">
                      <div>
                        <p className="font-medium text-foreground">Causes</p>
                        <BulletList items={item.causes} />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">Fixes</p>
                        <BulletList items={item.fixes} />
                      </div>
                    </div>
                  </details>
                ))}
              </div>
            );
          case "tip":
            return (
              <aside
                key={block.id}
                id={block.id}
                className="rounded-lg border border-sky-500/30 bg-sky-500/5 px-3 py-2 text-sm"
              >
                <span className="font-medium">Tip — </span>
                {block.text}
              </aside>
            );
          case "warning":
            return (
              <aside
                key={block.id}
                id={block.id}
                className="rounded-lg border border-orange-500/40 bg-orange-500/5 px-3 py-2 text-sm"
              >
                <span className="font-medium">Warning — </span>
                {block.text}
              </aside>
            );
          case "steps":
            return (
              <ol key={block.id} id={block.id} className="list-decimal space-y-1 ps-5 text-sm">
                {block.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ol>
            );
          case "diagram":
            return <HelpFlowDiagram key={block.id} steps={block.steps} />;
          case "links":
            return (
              <div key={block.id} id={block.id} className="flex flex-wrap gap-2">
                {block.items.map((item) => (
                  <Link
                    key={`${item.href}-${item.label}`}
                    href={helpHref(item.href, topicId)}
                    className="inline-flex rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-muted"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            );
          case "checklist":
            return <HelpChecklistView key={block.id} checklistId={block.checklistId} />;
          case "faq":
            return (
              <div key={block.id} id={block.id} className="space-y-3">
                {block.items.map((item) => (
                  <details key={item.id} className="rounded-md border px-3 py-2">
                    <summary className="cursor-pointer text-sm font-medium">{item.question}</summary>
                    <p className="mt-2 text-sm text-muted-foreground">{item.answer}</p>
                  </details>
                ))}
              </div>
            );
          default:
            return null;
        }
      })}
    </div>
  );
}
