"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { REUSABLE_BLOCKS, type ReusableBlockId } from "@/features/forms/blocks/reusable-blocks";

export function ReusableBlocksPanel({ onInsert }: { onInsert: (id: ReusableBlockId) => void }) {
  return (
    <Card className="p-3 space-y-2">
      <h3 className="font-medium text-sm">Reusable blocks</h3>
      <div className="space-y-1">
        {REUSABLE_BLOCKS.map((b) => (
          <button
            key={b.id}
            type="button"
            className="w-full text-left border rounded px-2 py-1.5 hover:bg-muted"
            onClick={() => onInsert(b.id)}
          >
            <p className="text-sm font-medium">{b.name}</p>
            <p className="text-xs text-muted-foreground">{b.description}</p>
          </button>
        ))}
      </div>
    </Card>
  );
}
