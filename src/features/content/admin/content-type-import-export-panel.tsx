"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Props = {
  typeId: string;
  typeSlug: string;
};

export function ContentTypeImportExportPanel({ typeId, typeSlug }: Props) {
  const router = useRouter();
  const fullFileRef = useRef<HTMLInputElement>(null);
  const schemaFileRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleExportFull = () => {
    window.location.href = `/api/content/types/${typeId}/export`;
  };

  const handleExportSchema = () => {
    window.location.href = `/api/content/types/${typeId}/export?mode=schema`;
  };

  const handleImportFull = async (file: File) => {
    setBusy(true);
    setStatus(null);
    try {
      const text = await file.text();
      const document = JSON.parse(text) as unknown;
      const response = await fetch("/api/content/types/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ document, options: { duplicatePolicy: "overwrite", mode: "full" } }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error ?? "Import failed");
      }
      setStatus(
        `Imported ${result.aggregate.created} created, ${result.aggregate.updated} updated, ${result.aggregate.error} errors.`,
      );
      router.refresh();
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Import failed");
    } finally {
      setBusy(false);
      if (fullFileRef.current) fullFileRef.current.value = "";
    }
  };

  const handleImportSchema = async (file: File) => {
    const confirmed = window.confirm(
      `Replace field schema, display settings, and admin config on “${typeSlug}”? Name and slug stay the same. Existing items keep their data and may not match the new fields.`,
    );
    if (!confirmed) {
      if (schemaFileRef.current) schemaFileRef.current.value = "";
      return;
    }

    setBusy(true);
    setStatus(null);
    try {
      const text = await file.text();
      const document = JSON.parse(text) as unknown;
      const response = await fetch("/api/content/types/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          document,
          options: { mode: "schema", targetTypeId: typeId },
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error ?? "Schema import failed");
      }
      setStatus(
        `Schema imported onto ${result.contentTypeSlug} (${result.fieldCount} field${result.fieldCount === 1 ? "" : "s"}). Name and slug unchanged.`,
      );
      router.refresh();
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Schema import failed");
    } finally {
      setBusy(false);
      if (schemaFileRef.current) schemaFileRef.current.value = "";
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Import / export</CardTitle>
          <CardDescription>
            Portable JSON for <span className="font-mono">{typeSlug}</span> and its items. Custom field
            schemas drive public templates and search indexing.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          <Button type="button" variant="outline" onClick={handleExportFull}>
            Export JSON
          </Button>
          <input
            ref={fullFileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleImportFull(file);
            }}
          />
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => fullFileRef.current?.click()}
          >
            {busy ? "Importing…" : "Import JSON"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Schema only</CardTitle>
          <CardDescription>
            Copy field schema, display settings, and admin config between types. Import onto this type
            ignores the source name and slug.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          <Button type="button" variant="outline" onClick={handleExportSchema}>
            Export schema
          </Button>
          <input
            ref={schemaFileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleImportSchema(file);
            }}
          />
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => schemaFileRef.current?.click()}
          >
            {busy ? "Importing…" : "Import schema into this type"}
          </Button>
          {status ? <p className="w-full text-sm text-muted-foreground">{status}</p> : null}
        </CardContent>
      </Card>
    </div>
  );
}
