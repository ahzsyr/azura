"use client";

import { useState, type ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { RenderContext } from "../manifests/types";
import type { ValueBinding } from "../schema/value-binding";
import { getBindingLabel } from "../schema/value-binding";
import { getA11yProps } from "../a11y/a11y-layer";
import { rendererRegistry } from "../registry/renderer-registry";
import {
  FieldWrapper as FxsFieldWrapper,
  FormSectionCard,
  isFxsFieldExperienceEnabled,
  isFxsUploadExperienceEnabled,
  UploadDropzone,
  type UploadFileItem,
} from "@/features/forms/fxs";
import { resolveMarketingIcon } from "@/features/builder/blocks/marketing/lib/icon-map";

function FieldWrapper({
  binding,
  error,
  children,
}: {
  binding: ValueBinding;
  error?: string;
  children: ReactNode;
}) {
  const label = getBindingLabel(binding);
  if (binding.behavior.hidden) return null;
  const manifest = rendererRegistry.get(binding.componentType, binding.version);
  const a11y = getA11yProps(binding, manifest, {
    error,
    required: binding.behavior.required === true,
  });

  const iconName = String(binding.presentation.icon ?? "");
  const Icon = iconName ? resolveMarketingIcon(iconName) : null;
  const leading = Icon ? <Icon className="h-4 w-4" aria-hidden /> : undefined;

  if (isFxsFieldExperienceEnabled()) {
    return (
      <FxsFieldWrapper
        id={binding.bindingId}
        label={label}
        required={binding.behavior.required === true}
        hint={binding.presentation.helpText ? String(binding.presentation.helpText) : undefined}
        error={error}
        phase={error ? "validated" : "idle"}
        collapsible={binding.behavior.collapsible === true}
        defaultCollapsed={binding.behavior.defaultCollapsed === true}
        leading={leading}
      >
        <div {...(a11y as React.HTMLAttributes<HTMLDivElement>)}>{children}</div>
      </FxsFieldWrapper>
    );
  }

  return (
    <div className="space-y-[var(--schema-space-sm,0.5rem)]">
      <Label htmlFor={binding.bindingId} className="inline-flex items-center gap-2">
        {leading}
        {label}
      </Label>
      <div className="[&_input]:rounded-[var(--schema-radius-md,0.5rem)] [&_input]:h-[var(--schema-input-height,2.5rem)] [&_textarea]:rounded-[var(--schema-radius-md,0.5rem)] [&_select]:rounded-[var(--schema-radius-md,0.5rem)]">
        <div {...(a11y as React.HTMLAttributes<HTMLDivElement>)}>{children}</div>
      </div>
      {binding.presentation.helpText ? (
        <p className="text-xs text-muted-foreground">{String(binding.presentation.helpText)}</p>
      ) : null}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

export function renderTextBinding(ctx: RenderContext): ReactNode {
  if (ctx.binding.behavior.hidden) {
    return <input type="hidden" value={String(ctx.value ?? "")} onChange={(e) => ctx.onChange(e.target.value)} />;
  }
  return (
    <FieldWrapper binding={ctx.binding} error={ctx.error}>
      <Input
        type="text"
        value={String(ctx.value ?? "")}
        placeholder={String(ctx.binding.presentation.placeholder ?? "")}
        readOnly={ctx.readOnly ?? ctx.binding.behavior.readOnly === true}
        disabled={ctx.disabled ?? ctx.binding.behavior.disabled === true}
        onChange={(e) => ctx.onChange(e.target.value)}
        onBlur={ctx.onBlur}
      />
    </FieldWrapper>
  );
}

export function renderEmailBinding(ctx: RenderContext): ReactNode {
  return (
    <FieldWrapper binding={ctx.binding} error={ctx.error}>
      <Input
        type="email"
        value={String(ctx.value ?? "")}
        placeholder={String(ctx.binding.presentation.placeholder ?? "")}
        disabled={ctx.disabled ?? ctx.binding.behavior.disabled === true}
        onChange={(e) => ctx.onChange(e.target.value)}
        onBlur={ctx.onBlur}
      />
    </FieldWrapper>
  );
}

export function renderTextareaBinding(ctx: RenderContext): ReactNode {
  return (
    <FieldWrapper binding={ctx.binding} error={ctx.error}>
      <Textarea
        value={String(ctx.value ?? "")}
        rows={4}
        disabled={ctx.disabled ?? ctx.binding.behavior.disabled === true}
        onChange={(e) => ctx.onChange(e.target.value)}
        onBlur={ctx.onBlur}
      />
    </FieldWrapper>
  );
}

export function renderSelectBinding(ctx: RenderContext): ReactNode {
  const options = (ctx.binding.data.options as Array<{ value: string; label: string }>) ?? [];
  return (
    <FieldWrapper binding={ctx.binding} error={ctx.error}>
      <select
        className="w-full border rounded-md h-10 px-2 text-sm"
        value={String(ctx.value ?? "")}
        disabled={ctx.disabled ?? ctx.binding.behavior.disabled === true}
        onChange={(e) => ctx.onChange(e.target.value)}
        onBlur={ctx.onBlur}
      >
        <option value="">—</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </FieldWrapper>
  );
}

export function renderCheckboxBinding(ctx: RenderContext): ReactNode {
  const label = getBindingLabel(ctx.binding);
  return (
    <label className="flex items-center gap-2 text-sm">
      <input
        type="checkbox"
        checked={ctx.value === true || ctx.value === "true"}
        disabled={ctx.disabled ?? ctx.binding.behavior.disabled === true}
        onChange={(e) => ctx.onChange(e.target.checked)}
        onBlur={ctx.onBlur}
      />
      {label}
      {ctx.error ? <span className="text-xs text-destructive">{ctx.error}</span> : null}
    </label>
  );
}

export function renderRadioBinding(ctx: RenderContext): ReactNode {
  const options = (ctx.binding.data.options as Array<{ value: string; label: string }>) ?? [];
  const label = getBindingLabel(ctx.binding);
  return (
    <FieldWrapper binding={ctx.binding} error={ctx.error}>
      <p className="text-sm font-medium mb-1">{label}</p>
      <div className="space-y-1">
        {options.map((o) => (
          <label key={o.value} className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name={ctx.binding.bindingId}
              value={o.value}
              checked={ctx.value === o.value}
              onChange={() => ctx.onChange(o.value)}
            />
            {o.label}
          </label>
        ))}
      </div>
    </FieldWrapper>
  );
}

export function renderNumberBinding(ctx: RenderContext): ReactNode {
  return (
    <FieldWrapper binding={ctx.binding} error={ctx.error}>
      <Input
        type="number"
        value={ctx.value == null ? "" : String(ctx.value)}
        disabled={ctx.disabled ?? ctx.binding.behavior.disabled === true}
        onChange={(e) => ctx.onChange(e.target.value === "" ? "" : Number(e.target.value))}
        onBlur={ctx.onBlur}
      />
    </FieldWrapper>
  );
}

export function renderDateBinding(ctx: RenderContext): ReactNode {
  return (
    <FieldWrapper binding={ctx.binding} error={ctx.error}>
      <Input
        type="date"
        value={String(ctx.value ?? "")}
        disabled={ctx.disabled ?? ctx.binding.behavior.disabled === true}
        onChange={(e) => ctx.onChange(e.target.value)}
        onBlur={ctx.onBlur}
      />
    </FieldWrapper>
  );
}

export function renderFileBinding(ctx: RenderContext): ReactNode {
  return <FileFieldInput ctx={ctx} />;
}

type AttachmentValue = {
  url: string;
  name?: string;
  mimeType?: string;
  size?: number;
  id?: string;
};

function toAttachmentValue(raw: unknown): AttachmentValue | null {
  if (typeof raw === "string" && raw.trim()) {
    const url = raw.trim();
    return { url, name: url.split("/").pop() || "Attachment" };
  }
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const record = raw as Record<string, unknown>;
    const url =
      (typeof record.url === "string" && record.url) ||
      (typeof record.href === "string" && record.href) ||
      null;
    if (!url) return null;
    return {
      url,
      name:
        (typeof record.name === "string" && record.name) ||
        (typeof record.filename === "string" && record.filename) ||
        url.split("/").pop() ||
        "Attachment",
      mimeType: typeof record.mimeType === "string" ? record.mimeType : undefined,
      size: typeof record.size === "number" ? record.size : undefined,
      id: typeof record.id === "string" ? record.id : undefined,
    };
  }
  return null;
}

function FileFieldInput({ ctx }: { ctx: RenderContext }) {
  const [uploading, setUploading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [items, setItems] = useState<UploadFileItem[]>(() => {
    const attachment = toAttachmentValue(ctx.value);
    if (!attachment) return [];
    return [
      {
        id: attachment.id ?? attachment.url,
        name: attachment.name ?? "Attachment",
        size: attachment.size ?? 0,
        type: attachment.mimeType ?? "",
        url: attachment.url,
        progress: 100,
        status: "completed",
      },
    ];
  });
  const accept = ctx.binding.data.accept ? String(ctx.binding.data.accept) : undefined;
  const maxFileSizeMb = ctx.binding.data.maxFileSizeMb != null
    ? Number(ctx.binding.data.maxFileSizeMb)
    : 10;
  const current = toAttachmentValue(ctx.value);
  const useDropzone = isFxsUploadExperienceEnabled();

  const uploadFile = async (file: File) => {
    const schemaId = ctx.schemaId;
    if (!schemaId || schemaId === "preview" || schemaId === "designer-preview") {
      return {
        url: file.name,
        filename: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
      };
    }
    const body = new FormData();
    body.set("file", file);
    body.set("templateId", schemaId);
    body.set("fieldId", ctx.binding.bindingId);
    const res = await fetch("/api/forms/upload", { method: "POST", body });
    const data = await res.json();
    if (!res.ok || !data.ok) {
      throw new Error(String(data.error ?? "Upload failed"));
    }
    return {
      url: String(data.url ?? ""),
      id: data.id ? String(data.id) : undefined,
      filename: String(data.filename ?? file.name),
      mimeType: String(data.mimeType ?? (file.type || "application/octet-stream")),
      sizeBytes: Number(data.sizeBytes ?? file.size),
    };
  };

  const commitAttachment = (file: File, uploaded: Awaited<ReturnType<typeof uploadFile>>) => {
    if (!uploaded.url) {
      throw new Error("Upload failed: missing file URL");
    }
    const attachment: AttachmentValue = {
      url: uploaded.url,
      name: uploaded.filename || file.name,
      mimeType: uploaded.mimeType || file.type || "application/octet-stream",
      size: uploaded.sizeBytes ?? file.size,
      id: uploaded.id,
    };
    ctx.onChange(attachment);
  };

  const onFileChange = async (file: File | null) => {
    setLocalError(null);
    if (!file) {
      ctx.onChange("");
      return;
    }
    if (maxFileSizeMb && file.size > maxFileSizeMb * 1024 * 1024) {
      setLocalError(`File too large (max ${maxFileSizeMb} MB)`);
      ctx.onChange("");
      return;
    }
    if (accept) {
      const name = file.name.toLowerCase();
      const tokens = accept.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean);
      const ok = tokens.some((token) => {
        if (token.startsWith(".")) return name.endsWith(token);
        if (token.includes("/")) {
          if (token.endsWith("/*")) return file.type.startsWith(token.slice(0, -1));
          return file.type === token;
        }
        return name.endsWith(token);
      });
      if (!ok) {
        setLocalError(`File type not allowed (${accept})`);
        ctx.onChange("");
        return;
      }
    }

    setUploading(true);
    try {
      const result = await uploadFile(file);
      commitAttachment(file, result);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Upload failed");
      ctx.onChange("");
    } finally {
      setUploading(false);
    }
  };

  if (useDropzone) {
    return (
      <FieldWrapper binding={ctx.binding} error={localError ?? ctx.error}>
        <UploadDropzone
          accept={accept}
          maxFileSizeMb={maxFileSizeMb}
          multiple={false}
          disabled={ctx.disabled ?? ctx.binding.behavior.disabled === true}
          value={items}
          onChange={(next) => {
            setItems(next);
            const completed = next.find((f) => f.status === "completed" && f.url);
            const failed = next.find((f) => f.status === "error");
            setLocalError(failed?.error ?? null);
            if (!completed) {
              // Keep previous value while uploading so a mid-upload submit still has data
              // if something was already attached; clear only when empty or failed.
              if (next.length === 0 || failed) ctx.onChange("");
              return;
            }
            ctx.onChange({
              url: completed.url!,
              name: completed.name,
              mimeType: completed.type || undefined,
              size: completed.size || undefined,
              id: completed.id,
            } satisfies AttachmentValue);
          }}
          onUpload={async (file) => {
            const result = await uploadFile(file);
            return { url: result.url, id: result.id };
          }}
        />
      </FieldWrapper>
    );
  }

  return (
    <FieldWrapper binding={ctx.binding} error={localError ?? ctx.error}>
      <Input
        type="file"
        accept={accept}
        disabled={uploading || (ctx.disabled ?? ctx.binding.behavior.disabled === true)}
        onChange={(e) => void onFileChange(e.target.files?.[0] ?? null)}
        onBlur={ctx.onBlur}
      />
      {uploading ? <p className="text-xs text-muted-foreground">Uploading…</p> : null}
      {current && !uploading ? (
        <p className="text-xs text-muted-foreground truncate">
          Attached:{" "}
          <a href={current.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
            {current.name ?? current.url}
          </a>
        </p>
      ) : null}
    </FieldWrapper>
  );
}

export function renderHiddenBinding(ctx: RenderContext): ReactNode {
  return <input type="hidden" value={String(ctx.value ?? "")} onChange={(e) => ctx.onChange(e.target.value)} />;
}

export function renderHeadingContent(ctx: { props: Record<string, unknown> }): ReactNode {
  const text = String(ctx.props.text ?? "Heading");
  const level = Number(ctx.props.level ?? 2);
  const Tag = (`h${Math.min(6, Math.max(1, level))}` as "h1");
  return <Tag className="font-semibold">{text}</Tag>;
}

export function renderParagraphContent(ctx: { props: Record<string, unknown> }): ReactNode {
  return <p className="text-sm text-muted-foreground">{String(ctx.props.text ?? "")}</p>;
}

export function renderDividerContent(): ReactNode {
  return <hr className="border-border" />;
}

export function renderSectionLayout(ctx: { props: Record<string, unknown>; children: ReactNode }): ReactNode {
  const title = ctx.props.title ? String(ctx.props.title) : "";
  if (isFxsFieldExperienceEnabled() && title) {
    return (
      <FormSectionCard
        config={{
          id: `section-${title.toLowerCase().replace(/\s+/g, "-")}`,
          title,
          description: ctx.props.description ? String(ctx.props.description) : undefined,
        }}
      >
        {ctx.children}
      </FormSectionCard>
    );
  }
  return (
    <section className="space-y-4">
      {title ? <h3 className="font-medium">{title}</h3> : null}
      {ctx.children}
    </section>
  );
}

export function renderGridLayout(ctx: { props: Record<string, unknown>; children: ReactNode }): ReactNode {
  const columns = Math.min(Math.max(Number(ctx.props.columns ?? 2), 1), 4);
  const responsive = ctx.props.responsive as { mobile?: number; tablet?: number } | undefined;
  const mobile = Math.min(Math.max(Number(responsive?.mobile ?? 1), 1), 4);
  const tablet = Math.min(Math.max(Number(responsive?.tablet ?? Math.min(columns, 2)), 1), 4);
  return (
    <div
      className="grid gap-[var(--schema-space-md,1rem)]"
      style={{
        gridTemplateColumns: `repeat(${mobile}, minmax(0, 1fr))`,
      }}
      data-grid-desktop={columns}
      data-grid-tablet={tablet}
    >
      <style>{`
        @media (min-width: 640px) {
          [data-grid-tablet="${tablet}"][data-grid-desktop="${columns}"] {
            grid-template-columns: repeat(${tablet}, minmax(0, 1fr)) !important;
          }
        }
        @media (min-width: 1024px) {
          [data-grid-tablet="${tablet}"][data-grid-desktop="${columns}"] {
            grid-template-columns: repeat(${columns}, minmax(0, 1fr)) !important;
          }
        }
      `}</style>
      {ctx.children}
    </div>
  );
}

export function renderContainerLayout(ctx: { props: Record<string, unknown>; children: ReactNode }): ReactNode {
  return (
    <div className="space-y-[var(--schema-space-md,1rem)] max-w-full" style={{ maxWidth: ctx.props.maxWidth ? String(ctx.props.maxWidth) : undefined }}>
      {ctx.children}
    </div>
  );
}

export function renderHeroLayout(ctx: { props: Record<string, unknown>; children: ReactNode }): ReactNode {
  return (
    <div className="rounded-[var(--schema-radius-lg,0.75rem)] border bg-muted/30 p-6 space-y-4">
      {ctx.props.title ? <h2 className="text-xl font-semibold">{String(ctx.props.title)}</h2> : null}
      {ctx.props.subtitle ? <p className="text-sm text-muted-foreground">{String(ctx.props.subtitle)}</p> : null}
      {ctx.children}
    </div>
  );
}

export function renderTabsLayout(ctx: { props: Record<string, unknown>; children: ReactNode }): ReactNode {
  const raw = ctx.props.tabLabels;
  const labels = Array.isArray(raw)
    ? (raw as string[])
    : String(raw ?? "Tab 1")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
  return (
    <div className="space-y-3">
      <div className="flex gap-1 border-b pb-2 flex-wrap">
        {labels.map((label, i) => (
          <span key={`${label}-${i}`} className="text-xs px-2 py-1 rounded bg-muted">
            {label}
          </span>
        ))}
      </div>
      <div className="space-y-3">{ctx.children}</div>
    </div>
  );
}

export function renderAccordionLayout(ctx: { props: Record<string, unknown>; children: ReactNode }): ReactNode {
  return (
    <details className="rounded-[var(--schema-radius-md,0.5rem)] border p-3" open>
      <summary className="cursor-pointer font-medium text-sm">
        {String(ctx.props.title ?? "Section")}
      </summary>
      <div className="mt-3 space-y-3">{ctx.children}</div>
    </details>
  );
}

export function renderSpacerContent(ctx: { props: Record<string, unknown> }): ReactNode {
  const height = Number(ctx.props.height ?? 24);
  return <div style={{ height }} aria-hidden />;
}

export function renderCardLayout(ctx: { props: Record<string, unknown>; children: ReactNode }): ReactNode {
  return (
    <div className="rounded-lg border p-4 space-y-3">
      {ctx.props.title ? <h3 className="font-medium">{String(ctx.props.title)}</h3> : null}
      {ctx.children}
    </div>
  );
}

export function renderHtmlContent(ctx: { props: Record<string, unknown> }): ReactNode {
  const html = String(ctx.props.html ?? "");
  return <div className="text-sm prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: html }} />;
}
