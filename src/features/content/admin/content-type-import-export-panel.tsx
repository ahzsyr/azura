"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Props = {
  typeId: string;
  typeSlug: string;
};

export function ContentTypeImportExportPanel({ typeId, typeSlug }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleExport = () => {
    window.location.href = `/api/content/types/${typeId}/export`;
  };

  const handleImport = async (file: File) => {
    setBusy(true);
    setStatus(null);
    try {
      const text = await file.text();
      const document = JSON.parse(text) as unknown;
      const response = await fetch("/api/content/types/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ document, options: { duplicatePolicy: "overwrite" } }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error ?? "Import failed");
      }
      setStatus(
        `Imported ${result.aggregate.created} created, ${result.aggregate.updated} updated, ${result.aggregate.error} errors.`,
      );
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Import failed");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Import / export</CardTitle>
        <CardDescription>
          Portable JSON for <span className="font-mono">{typeSlug}</span> and its items. Custom field
          schemas drive public templates and search indexing.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="outline" onClick={handleExport}>
          Export JSON
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleImport(file);
          }}
        />
        <Button
          type="button"
          variant="outline"
          disabled={busy}
          onClick={() => fileRef.current?.click()}
        >
          {busy ? "Importing…" : "Import JSON"}
        </Button>
        {status ? <p className="w-full text-sm text-muted-foreground">{status}</p> : null}
      </CardContent>
    </Card>
  );
}
