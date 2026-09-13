"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { DesignerComment } from "@/features/forms/lib/document-envelope";

type Props = {
  comments: DesignerComment[];
  selectionId?: string | null;
  authorName?: string;
  onChange: (comments: DesignerComment[]) => void;
};

export function DesignerCommentsPanel({
  comments,
  selectionId,
  authorName = "Admin",
  onChange,
}: Props) {
  const [body, setBody] = useState("");
  const visible = selectionId
    ? comments.filter((c) => c.targetId === selectionId)
    : comments;

  const add = () => {
    if (!body.trim() || !selectionId) return;
    onChange([
      ...comments,
      {
        id: `c-${Date.now()}`,
        targetType: "binding",
        targetId: selectionId,
        author: authorName,
        body: body.trim(),
        resolved: false,
        createdAt: new Date().toISOString(),
      },
    ]);
    setBody("");
  };

  return (
    <Card className="p-3 space-y-3">
      <h3 className="font-medium text-sm">Comments</h3>
      {!selectionId && (
        <p className="text-xs text-muted-foreground">Select a field to comment.</p>
      )}
      {visible.map((c) => (
        <div
          key={c.id}
          className={`border rounded p-2 text-sm ${c.resolved ? "opacity-50" : ""}`}
        >
          <p className="font-medium text-xs">{c.author}</p>
          <p>{c.body}</p>
          <div className="flex gap-2 mt-1">
            <button
              type="button"
              className="text-xs text-primary"
              onClick={() =>
                onChange(comments.map((x) => (x.id === c.id ? { ...x, resolved: !x.resolved } : x)))
              }
            >
              {c.resolved ? "Reopen" : "Resolve"}
            </button>
          </div>
        </div>
      ))}
      {selectionId && (
        <div className="space-y-2">
          <Textarea rows={2} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Add a comment…" />
          <Button type="button" size="sm" onClick={add}>
            Comment
          </Button>
        </div>
      )}
    </Card>
  );
}
