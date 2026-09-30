"use client";

import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import type { FooterLink, FooterSocialLayout, FooterSocialSize, FooterSocialStyle } from "@/features/footer/types";
import type { SectionEditorProps } from "../types";
import { SOCIAL_PLATFORMS } from "./platforms";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

/* ── Style / size / layout option helpers ───────────────── */

type ButtonGroupOption<T extends string> = { value: T; label: string };

function ButtonGroup<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: ButtonGroupOption<T>[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex gap-1">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          className={cn(
            "h-8 rounded-md border px-3 text-sm font-medium transition-colors",
            value === opt.value
              ? "border-primary bg-primary text-primary-foreground"
              : "border-input bg-background hover:bg-muted",
          )}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

/* ── Custom social links editor ─────────────────────────── */

type SocialLinkRowProps = {
  link: FooterLink;
  onChange: (patch: Partial<FooterLink>) => void;
  onRemove: () => void;
};

function SocialLinkRow({ link, onChange, onRemove }: SocialLinkRowProps) {
  return (
    <div className="flex items-center gap-2">
      <Input
        value={link.label}
        onChange={(e) => onChange({ label: e.target.value })}
        placeholder="Platform name"
        className="h-8 w-28 shrink-0 text-sm"
      />
      <Input
        value={link.href}
        onChange={(e) => onChange({ href: e.target.value })}
        placeholder="https://..."
        className="h-8 min-w-0 flex-1 text-sm"
        type="url"
      />
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="h-8 w-8 shrink-0 text-destructive"
        onClick={onRemove}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

/* ── Platform URL grid (preset platforms) ───────────────── */

type PlatformGridProps = {
  links: FooterLink[];
  onChange: (links: FooterLink[]) => void;
};

function PlatformGrid({ links, onChange }: PlatformGridProps) {
  const urlMap = Object.fromEntries(links.map((l) => [l.label.toLowerCase(), l.href]));

  function setUrl(platformKey: string, label: string, url: string) {
    const next = links.filter((l) => l.label.toLowerCase() !== platformKey);
    if (url.trim()) {
      next.push({ label, href: url.trim() });
    }
    onChange(next);
  }

  return (
    <div className="space-y-2">
      {SOCIAL_PLATFORMS.map((p) => {
        const current = urlMap[p.key] ?? "";
        return (
          <div key={p.key} className="flex items-center gap-2">
            <span className="w-24 shrink-0 text-sm text-muted-foreground">{p.label}</span>
            <Input
              value={current}
              onChange={(e) => setUrl(p.key, p.label, e.target.value)}
              placeholder={p.placeholder}
              className="h-8 text-sm"
              type="url"
            />
          </div>
        );
      })}
    </div>
  );
}

/* ── Custom links freeform editor ───────────────────────── */

type CustomLinksEditorProps = {
  links: FooterLink[];
  onChange: (links: FooterLink[]) => void;
};

function CustomLinksEditor({ links, onChange }: CustomLinksEditorProps) {
  function updateLink(index: number, patch: Partial<FooterLink>) {
    const next = [...links];
    next[index] = { ...next[index], ...patch };
    onChange(next);
  }

  function removeLink(index: number) {
    onChange(links.filter((_, i) => i !== index));
  }

  function addLink() {
    onChange([...links, { label: "", href: "" }]);
  }

  return (
    <div className="space-y-2">
      {links.map((link, i) => (
        <SocialLinkRow
          key={i}
          link={link}
          onChange={(patch) => updateLink(i, patch)}
          onRemove={() => removeLink(i)}
        />
      ))}
      <Button type="button" variant="outline" size="sm" className="h-8 w-full" onClick={addLink}>
        <Plus className="mr-1.5 h-3.5 w-3.5" />
        Add social link
      </Button>
    </div>
  );
}

/* ── Main editor ────────────────────────────────────────── */

const STYLE_OPTIONS: ButtonGroupOption<FooterSocialStyle>[] = [
  { value: "icons", label: "Icons" },
  { value: "text", label: "Text" },
  { value: "icons-text", label: "Icons + text" },
];

const SIZE_OPTIONS: ButtonGroupOption<FooterSocialSize>[] = [
  { value: "sm", label: "S" },
  { value: "md", label: "M" },
  { value: "lg", label: "L" },
];

const LAYOUT_OPTIONS: ButtonGroupOption<FooterSocialLayout>[] = [
  { value: "horizontal", label: "Horizontal" },
  { value: "vertical", label: "Vertical" },
];

const SOURCE_OPTIONS: ButtonGroupOption<"company" | "custom">[] = [
  { value: "company", label: "Company settings" },
  { value: "custom", label: "Custom" },
];

const CUSTOM_MODE_OPTIONS: ButtonGroupOption<"preset" | "freeform">[] = [
  { value: "preset", label: "By platform" },
  { value: "freeform", label: "Freeform" },
];

export function SocialEditor({ column, onUpdate }: SectionEditorProps) {
  const source = column.socialSource ?? "company";
  const style = column.socialStyle ?? "icons";
  const size = column.socialIconSize ?? "md";
  const layout = column.socialLayout ?? "horizontal";
  const links = column.links ?? [];

  const [customMode, setCustomMode] = useState<"preset" | "freeform">("preset");

  return (
    <div className="space-y-5">
      {/* ── Social source ────────────────────────────── */}
      <div className="space-y-2">
        <Label>Social accounts source</Label>
        <ButtonGroup
          value={source}
          options={SOURCE_OPTIONS}
          onChange={(v) => onUpdate({ socialSource: v })}
        />
        <p className="text-xs text-muted-foreground">
          {source === "company"
            ? "Links are pulled from your company settings (Theme → Site Identity)."
            : "Manage social links directly in this section."}
        </p>
      </div>

      {/* ── Custom links ─────────────────────────────── */}
      {source === "custom" && (
        <>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Social links</Label>
              <ButtonGroup
                value={customMode}
                options={CUSTOM_MODE_OPTIONS}
                onChange={setCustomMode}
              />
            </div>

            {customMode === "preset" ? (
              <PlatformGrid links={links} onChange={(l) => onUpdate({ links: l })} />
            ) : (
              <CustomLinksEditor links={links} onChange={(l) => onUpdate({ links: l })} />
            )}
          </div>
          <Separator />
        </>
      )}

      {/* ── Appearance ───────────────────────────────── */}
      <div className="space-y-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Style
        </p>

        <div className="space-y-2">
          <Label>Display</Label>
          <ButtonGroup
            value={style}
            options={STYLE_OPTIONS}
            onChange={(v) => onUpdate({ socialStyle: v })}
          />
        </div>

        {style !== "text" && (
          <div className="space-y-2">
            <Label>Icon size</Label>
            <ButtonGroup
              value={size}
              options={SIZE_OPTIONS}
              onChange={(v) => onUpdate({ socialIconSize: v })}
            />
          </div>
        )}

        <div className="space-y-2">
          <Label>Layout</Label>
          <ButtonGroup
            value={layout}
            options={LAYOUT_OPTIONS}
            onChange={(v) => onUpdate({ socialLayout: v })}
          />
        </div>
      </div>
    </div>
  );
}
