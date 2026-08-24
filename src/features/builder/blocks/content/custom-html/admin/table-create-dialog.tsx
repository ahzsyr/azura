"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { TableConfig } from "../lib/table-structure";

type Props = {
  onConfirm: (config: TableConfig) => void;
  onCancel: () => void;
};

export function TableCreateDialog({ onConfirm, onCancel }: Props) {
  const [rows, setRows] = useState(3);
  const [cols, setCols] = useState(2);
  const [hasHeader, setHasHeader] = useState(true);
  const [hasFooter, setHasFooter] = useState(false);

  const handleConfirm = () => {
    onConfirm({
      rows: Math.max(1, rows),
      cols: Math.max(1, cols),
      hasHeader,
      hasFooter,
    });
  };

  return (
    <div className="rounded-md border bg-popover shadow-md p-3 w-64 space-y-3">
      <p className="text-xs font-medium">Create Table</p>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">Rows</Label>
          <Input
            type="number"
            className="mt-1 h-7 text-xs"
            min={1}
            max={20}
            value={rows}
            onChange={(e) => setRows(Number(e.target.value))}
          />
        </div>
        <div>
          <Label className="text-xs">Columns</Label>
          <Input
            type="number"
            className="mt-1 h-7 text-xs"
            min={1}
            max={10}
            value={cols}
            onChange={(e) => setCols(Number(e.target.value))}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="flex items-center gap-2 text-xs cursor-pointer">
          <input
            type="checkbox"
            checked={hasHeader}
            onChange={(e) => setHasHeader(e.target.checked)}
            className="h-3.5 w-3.5"
          />
          Include header row
        </label>
        <label className="flex items-center gap-2 text-xs cursor-pointer">
          <input
            type="checkbox"
            checked={hasFooter}
            onChange={(e) => setHasFooter(e.target.checked)}
            className="h-3.5 w-3.5"
          />
          Include footer row
        </label>
      </div>

      <div className="flex gap-1.5 justify-end pt-1">
        <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="button" size="sm" className="h-7 text-xs" onClick={handleConfirm}>
          Create
        </Button>
      </div>
    </div>
  );
}
