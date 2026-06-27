"use client";

import { useRef, useState, useTransition } from "react";
import type { ImportValidationError } from "@/features/translation/translation-grid-types";
import {
  importTranslationsCsvAction,
  importTranslationsJsonAction,
} from "@/features/translation/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Upload, FileJson, FileSpreadsheet } from "lucide-react";

type PreviewState = {
  validCount: number;
  errorCount: number;
  totalParsed: number;
  errors: ImportValidationError[];
  content: string;
  format: "csv" | "json";
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApplied: () => void;
};

export function TranslationsImportDialog({ open, onOpenChange, onApplied }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const reset = () => {
    setPreview(null);
    setNotice(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleClose = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const runPreview = (content: string, format: "csv" | "json") => {
    startTransition(async () => {
      const result =
        format === "csv"
          ? await importTranslationsCsvAction(content, { dryRun: true })
          : await importTranslationsJsonAction(content, { dryRun: true });

      setPreview({
        validCount: result.valid.length,
        errorCount: result.errors.length,
        totalParsed: result.totalParsed,
        errors: result.errors.slice(0, 20),
        content,
        format,
      });
      setNotice(null);
    });
  };

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const content = String(reader.result ?? "");
      const format = file.name.endsWith(".json") ? "json" : "csv";
      runPreview(content, format);
    };
    reader.readAsText(file);
  };

  const handleApply = () => {
    if (!preview) return;
    startTransition(async () => {
      const result =
        preview.format === "csv"
          ? await importTranslationsCsvAction(preview.content, { dryRun: false })
          : await importTranslationsJsonAction(preview.content, { dryRun: false });

      setNotice(`Applied ${result.appliedCount} translation(s).`);
      if (result.appliedCount > 0) {
        onApplied();
        setTimeout(() => handleClose(false), 1200);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Import translations</DialogTitle>
          <DialogDescription>
            Upload CSV or JSON. Required columns: entityType, entityId, field, localeCode, value.
            Optional: status (DRAFT, PUBLISHED, REVIEW).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="import-file">File</Label>
            <input
              ref={fileRef}
              id="import-file"
              type="file"
              accept=".csv,.json,text/csv,application/json"
              className="block w-full text-sm"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
            />
          </div>

          <div className="flex gap-2 text-xs text-muted-foreground">
            <FileSpreadsheet className="h-4 w-4 shrink-0" />
            <span>CSV header: entityType,entityId,field,localeCode,value,status</span>
          </div>
          <div className="flex gap-2 text-xs text-muted-foreground">
            <FileJson className="h-4 w-4 shrink-0" />
            <span>JSON: array of objects with the same fields</span>
          </div>

          {preview ? (
            <div className="rounded-lg border p-3 space-y-2 text-sm">
              <p>
                Parsed <strong>{preview.totalParsed}</strong> row(s):{" "}
                <span className="text-green-600">{preview.validCount} valid</span>
                {preview.errorCount > 0 ? (
                  <span className="text-destructive">, {preview.errorCount} error(s)</span>
                ) : null}
              </p>
              {preview.errors.length > 0 ? (
                <ul className="text-xs text-destructive space-y-1 max-h-32 overflow-y-auto">
                  {preview.errors.map((err, i) => (
                    <li key={i}>
                      Row {err.row}: {err.message}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}

          {notice ? <p className="text-sm text-muted-foreground">{notice}</p> : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)}>
            Cancel
          </Button>
          <Button
            disabled={!preview || preview.validCount === 0 || isPending}
            onClick={handleApply}
            className="gap-2"
          >
            <Upload className="h-4 w-4" />
            {isPending ? "Applying…" : `Apply ${preview?.validCount ?? 0} row(s)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
