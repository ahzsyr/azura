"use client";

import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MERGE_TAGS } from "@/features/forms/lib/merge-tags";
import { Braces, Search } from "lucide-react";

export { MERGE_TAGS, interpolateMergeTags } from "@/features/forms/lib/merge-tags";

const GROUPS: Array<{ id: string; label: string; keys: string[] }> = [
  {
    id: "user",
    label: "User",
    keys: ["firstName", "name", "email", "phone"],
  },
  {
    id: "crm",
    label: "CRM",
    keys: ["company", "campaign", "assignee"],
  },
  {
    id: "system",
    label: "System",
    keys: ["utmSource", "submissionUrl", "score"],
  },
];

export function MergeTagPicker({
  onInsert,
}: {
  onInsert: (token: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return GROUPS.map((group) => ({
      ...group,
      tags: MERGE_TAGS.filter((tag) => {
        if (!group.keys.includes(tag.key)) return false;
        if (!q) return true;
        return (
          tag.key.toLowerCase().includes(q) ||
          tag.label.toLowerCase().includes(q) ||
          tag.token.toLowerCase().includes(q)
        );
      }),
    })).filter((g) => g.tags.length > 0);
  }, [query]);

  return (
    <div className="relative inline-block">
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-8 gap-1.5 text-xs"
        onClick={() => {
          setOpen((v) => !v);
          setTimeout(() => searchRef.current?.focus(), 0);
        }}
      >
        <Braces className="h-3.5 w-3.5" />
        Insert variable
      </Button>
      {open ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-30 cursor-default"
            aria-label="Close"
            onClick={() => setOpen(false)}
          />
          <div className="absolute start-0 z-40 mt-1 w-64 rounded-xl border bg-background p-2 shadow-lg">
            <div className="relative mb-2">
              <Search className="pointer-events-none absolute start-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                ref={searchRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search…"
                className="h-8 ps-7 text-xs"
              />
            </div>
            <div className="max-h-56 space-y-2 overflow-auto">
              {filtered.length === 0 ? (
                <p className="px-1 py-2 text-xs text-muted-foreground">No variables found.</p>
              ) : (
                filtered.map((group) => (
                  <div key={group.id}>
                    <p className="px-1 pb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {group.label}
                    </p>
                    <div className="space-y-0.5">
                      {group.tags.map((tag) => (
                        <button
                          key={tag.key}
                          type="button"
                          className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-xs hover:bg-muted"
                          onClick={() => {
                            onInsert(tag.token);
                            setOpen(false);
                            setQuery("");
                          }}
                        >
                          <span className="font-medium">{tag.label}</span>
                          <span className="font-mono text-[10px] text-muted-foreground">{tag.token}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
