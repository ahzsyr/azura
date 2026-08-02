"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CitationSource } from "@/schemas/editorial-metadata";

type Props = {
  value: CitationSource[];
  onChange: (sources: CitationSource[]) => void;
};

export function CitationSourcesField({ value, onChange }: Props) {
  const [newLabel, setNewLabel] = useState("");
  const [newUrl, setNewUrl] = useState("");

  function add() {
    const trimmedLabel = newLabel.trim();
    const trimmedUrl = newUrl.trim();
    if (!trimmedLabel || !trimmedUrl) return;
    onChange([...value, { label: trimmedLabel, url: trimmedUrl }]);
    setNewLabel("");
    setNewUrl("");
  }

  function remove(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-3">
      <Label>Citation Sources</Label>

      {value.length > 0 && (
        <ul className="space-y-2">
          {value.map((src, i) => (
            <li key={i} className="flex items-center gap-2 text-sm p-2 border rounded-md bg-muted/40">
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{src.label}</p>
                <p className="text-muted-foreground truncate text-xs">{src.url}</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => remove(i)}
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span className="sr-only">Remove</span>
              </Button>
            </li>
          ))}
        </ul>
      )}

      <div className="space-y-2">
        <Input
          placeholder="Source label (e.g. Reuters)"
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
        />
        <Input
          type="url"
          placeholder="https://..."
          value={newUrl}
          onChange={(e) => setNewUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full"
          onClick={add}
          disabled={!newLabel.trim() || !newUrl.trim()}
        >
          <Plus className="h-3.5 w-3.5 me-1.5" />
          Add source
        </Button>
      </div>

      <input type="hidden" name="sources" value={JSON.stringify(value)} readOnly />
    </div>
  );
}
