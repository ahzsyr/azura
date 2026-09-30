"use client";

import { useEffect, useRef, useState } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  parseServiceAccountJson,
  serializeServiceAccountJson,
  validateServiceAccountJson,
} from "@/features/seo/google-live/service-account-json";

type GoogleIndexingKeyFieldProps = {
  hasSavedKey: boolean;
  value: string;
  onChange: (json: string) => void;
};

export function GoogleIndexingKeyField({ hasSavedKey, value, onChange }: GoogleIndexingKeyFieldProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [localHint, setLocalHint] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (!value.trim()) {
      setLocalHint(null);
      setLocalError(null);
    }
  }, [value]);

  const applyJson = (raw: string, sourceLabel?: string) => {
    const trimmed = raw.trim();
    if (!trimmed) {
      setFileName(null);
      setLocalHint(null);
      setLocalError(null);
      onChange("");
      return;
    }

    try {
      const canonical = serializeServiceAccountJson(trimmed);
      const validation = validateServiceAccountJson(canonical);
      if (!validation.ok) {
        onChange(trimmed);
        setLocalError(validation.message);
        setLocalHint(null);
        return;
      }

      onChange(canonical);
      setLocalError(null);
      const clientEmail = parseServiceAccountJson(canonical).client_email?.trim();
      const emailHint = clientEmail
        ? ` Add ${clientEmail} as Owner in Search Console → Settings → Users and permissions.`
        : "";
      setLocalHint(
        sourceLabel
          ? `${sourceLabel} loaded (valid service account — click Save integrations).${emailHint}`
          : `Service account JSON ready to save.${emailHint}`,
      );
    } catch (error) {
      onChange(trimmed);
      setLocalError(error instanceof Error ? error.message : "Could not read service account JSON.");
      setLocalHint(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
          <Upload className="mr-2 h-4 w-4" />
          Import JSON file
        </Button>
        {fileName ? <span className="text-xs text-muted-foreground">File: {fileName}</span> : null}
        {value ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              applyJson("");
              if (fileInputRef.current) fileInputRef.current.value = "";
            }}
          >
            Clear
          </Button>
        ) : null}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        className="sr-only"
        onChange={async (event) => {
          const file = event.target.files?.[0];
          if (!file) return;
          try {
            const text = await file.text();
            setFileName(file.name);
            applyJson(text, file.name);
          } catch {
            setLocalError("Could not read the selected file.");
          }
        }}
      />

      <div className="space-y-2">
        <Label>Service account JSON {hasSavedKey ? "(saved)" : ""}</Label>
        <Textarea
          name="google_indexing.serviceAccountJson"
          rows={8}
          spellCheck={false}
          autoComplete="off"
          value={value}
          onChange={(event) => applyJson(event.target.value)}
          className="font-mono text-xs"
          placeholder={
            hasSavedKey
              ? "Leave blank to keep saved JSON, or import / paste a new key file"
              : 'Import a .json key file or paste the entire downloaded file (must include "client_email" and "private_key")'
          }
        />
        <p className="text-xs text-muted-foreground">
          Download from Google Cloud → IAM → Service Accounts → Keys → Add key → JSON. Importing the file is more
          reliable than copy-paste. Do not use OAuth client secrets.
        </p>
        {localHint ? (
          <p className="text-xs text-emerald-700 dark:text-emerald-300" role="status">
            {localHint}
          </p>
        ) : null}
        {localError ? (
          <p className="text-xs text-destructive" role="alert">
            {localError}
          </p>
        ) : null}
      </div>
    </div>
  );
}
