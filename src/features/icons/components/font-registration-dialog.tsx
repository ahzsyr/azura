"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { UnifiedMediaPickerDialog } from "@/features/media/components/unified-media-picker-dialog";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRegistered?: () => void;
};

/** Parse lines: `Display Name | glyph | unicode` (unicode optional) */
function parseGlyphs(raw: string) {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split("|").map((p) => p.trim());
      const name = parts[0] ?? "";
      const glyph = parts[1] ?? parts[0] ?? "";
      const unicode = parts[2];
      return {
        name: name || glyph,
        glyph,
        unicode,
        glyphKey: glyph,
      };
    })
    .filter((g) => g.glyph);
}

export function FontRegistrationDialog({ open, onOpenChange, onRegistered }: Props) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [fontFamily, setFontFamily] = useState("");
  const [glyphLines, setGlyphLines] = useState("Home | home | e88a\nSearch | search | e8b6");
  const [mediaId, setMediaId] = useState<string | null>(null);
  const [fontFileLabel, setFontFileLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setName("");
    setSlug("");
    setFontFamily("");
    setGlyphLines("Home | home | e88a\nSearch | search | e8b6");
    setMediaId(null);
    setFontFileLabel("");
    setError(null);
  };

  const register = async () => {
    const glyphs = parseGlyphs(glyphLines);
    if (!name.trim() || !slug.trim() || !fontFamily.trim()) {
      setError("Library name, slug, and font family are required.");
      return;
    }
    if (!glyphs.length) {
      setError("Add at least one glyph line.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/icons/register-font", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          slug: slug.trim(),
          fontFamily: fontFamily.trim(),
          mediaId,
          glyphs,
        }),
      });
      const json = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Registration failed");
      onRegistered?.();
      reset();
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Registration failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Register font icon library</DialogTitle>
          <DialogDescription>
            Register a font family and its glyphs as IconAsset records. Link a font file from CMS media so icons render in admin and on the site.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="font-lib-name">Library name</Label>
            <Input id="font-lib-name" value={name} onChange={(e) => setName(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="font-lib-slug">Slug</Label>
            <Input id="font-lib-slug" value={slug} onChange={(e) => setSlug(e.target.value)} className="mt-1 font-mono text-sm" />
          </div>
          <div>
            <Label htmlFor="font-lib-family">CSS font-family</Label>
            <Input
              id="font-lib-family"
              value={fontFamily}
              onChange={(e) => setFontFamily(e.target.value)}
              placeholder="Material Symbols Outlined"
              className="mt-1"
            />
          </div>
          <div>
            <Label>Font file (CMS media)</Label>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <UnifiedMediaPickerDialog
                mediaTypes={["DOCUMENT"]}
                defaultSource="cms"
                showSiteFilesystem={false}
                onSelect={(result) => {
                  setMediaId(result.mediaId);
                  setFontFileLabel(result.filename ?? result.url);
                }}
                trigger={
                  <Button type="button" variant="outline" size="sm">
                    {fontFileLabel ? "Change font file" : "Pick font file"}
                  </Button>
                }
              />
              {fontFileLabel ? (
                <button
                  type="button"
                  className="text-xs text-muted-foreground underline hover:text-foreground"
                  onClick={() => {
                    setMediaId(null);
                    setFontFileLabel("");
                  }}
                >
                  Clear
                </button>
              ) : null}
            </div>
            {fontFileLabel ? (
              <p className="mt-1 text-xs text-muted-foreground truncate" title={fontFileLabel}>
                {fontFileLabel}
              </p>
            ) : (
              <p className="mt-1 text-xs text-muted-foreground">
                Optional. Upload .woff2 / .woff / .ttf to CMS Media first, then link it here.
              </p>
            )}
          </div>
          <div>
            <Label htmlFor="font-glyphs">Glyphs (one per line: Name | glyph | unicode)</Label>
            <Textarea
              id="font-glyphs"
              value={glyphLines}
              onChange={(e) => setGlyphLines(e.target.value)}
              rows={6}
              className="mt-1 font-mono text-xs"
            />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button type="button" onClick={() => void register()} disabled={busy}>
            {busy ? "Registering…" : "Register font"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
