"use client";

import { useMemo, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Box,
  Briefcase,
  Building2,
  Folder,
  Layers,
  Package,
  Tag,
} from "lucide-react";
import { quickCreateContentType } from "@/features/content/content-type.actions";
import { slugifyContentTypeName } from "@/features/content/content-admin-paths";
import { SLUG_INPUT_PATTERN } from "@/lib/slug-pattern";
import { getLocalizedFormFieldName } from "@/features/translation/form-field-names";
import { useAdminEditingLocale } from "@/features/translation/hooks/use-admin-editing-locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const ICON_OPTIONS = [
  { value: "box", label: "Box", icon: Box },
  { value: "package", label: "Package", icon: Package },
  { value: "building", label: "Building", icon: Building2 },
  { value: "briefcase", label: "Briefcase", icon: Briefcase },
  { value: "layers", label: "Layers", icon: Layers },
  { value: "folder", label: "Folder", icon: Folder },
  { value: "tag", label: "Tag", icon: Tag },
] as const;

function guessSingular(name: string) {
  const trimmed = name.trim();
  if (trimmed.length > 3 && /s$/i.test(trimmed) && !/ss$/i.test(trimmed)) {
    return trimmed.slice(0, -1);
  }
  return trimmed || "Item";
}

function Field({
  id,
  label,
  children,
}: {
  id?: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0 space-y-2">
      <Label htmlFor={id} className="block">
        {label}
      </Label>
      {children}
    </div>
  );
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ContentTypeQuickCreateModal({ open, onOpenChange }: Props) {
  const router = useRouter();
  const { defaultCode } = useAdminEditingLocale();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [labelSingular, setLabelSingular] = useState("");
  const [singularTouched, setSingularTouched] = useState(false);
  const [labelPlural, setLabelPlural] = useState("");
  const [pluralTouched, setPluralTouched] = useState(false);
  const [routePrefix, setRoutePrefix] = useState("");
  const [prefixTouched, setPrefixTouched] = useState(false);
  const [icon, setIcon] = useState("box");
  const [error, setError] = useState<string | null>(null);

  const nameField = getLocalizedFormFieldName("name", defaultCode);
  const singularField = getLocalizedFormFieldName("labelSingular", defaultCode);
  const pluralField = getLocalizedFormFieldName("labelPlural", defaultCode);

  const derivedSlug = useMemo(() => slugifyContentTypeName(name), [name]);
  const listingPath = routePrefix.trim().toLowerCase();
  const canSubmit = Boolean(name.trim() && (slug || derivedSlug));

  const reset = () => {
    setName("");
    setSlug("");
    setSlugTouched(false);
    setLabelSingular("");
    setSingularTouched(false);
    setLabelPlural("");
    setPluralTouched(false);
    setRoutePrefix("");
    setPrefixTouched(false);
    setIcon("box");
    setError(null);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const handleNameChange = (value: string) => {
    setName(value);
    const nextSlug = slugifyContentTypeName(value);
    if (!slugTouched) setSlug(nextSlug);
    if (!pluralTouched) setLabelPlural(value.trim());
    if (!singularTouched) setLabelSingular(guessSingular(value));
    if (!prefixTouched) setRoutePrefix(nextSlug);
  };

  const submit = (configureAfter: boolean) => {
    if (pending || !canSubmit) return;
    setError(null);
    const formData = new FormData();
    formData.set(nameField, name.trim());
    formData.set(singularField, (labelSingular || guessSingular(name)).trim());
    formData.set(pluralField, (labelPlural || name).trim());
    formData.set("slug", (slug || derivedSlug).trim().toLowerCase());
    formData.set("routePrefix", routePrefix.trim().toLowerCase());
    formData.set("icon", icon);
    formData.set("isEnabled", "true");
    formData.set("sortOrder", "0");
    formData.set("fieldSchema", "[]");
    formData.set("displaySchema", "{}");
    formData.set("adminConfig", JSON.stringify({ inquiryEnabled: true }));

    startTransition(async () => {
      const result = await quickCreateContentType(formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      handleOpenChange(false);
      if (configureAfter) {
        router.push(`/admin/content/types/${result.id}`);
        return;
      }
      router.replace("/admin/content?tab=types");
      router.refresh();
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="!flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-xl [&>button]:z-10">
        <DialogHeader className="shrink-0 space-y-2 border-b px-6 py-5 pe-12 text-start">
          <DialogTitle>New content type</DialogTitle>
          <DialogDescription>
            Create a type now, then add items or finish the field schema later.{" "}
            <Link
              href="/admin/content/types/new"
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              Open full editor
            </Link>
          </DialogDescription>
        </DialogHeader>

        <form
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={(event) => {
            event.preventDefault();
            submit(false);
          }}
        >
          <div className="grid min-h-0 min-w-0 flex-1 gap-5 overflow-y-auto px-6 py-5">
            <Field id="quick-type-name" label="Name">
              <Input
                id="quick-type-name"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g. Vehicles"
                autoComplete="off"
                autoFocus
                required
              />
            </Field>

            <div className="grid min-w-0 grid-cols-2 gap-4">
              <Field id="quick-type-slug" label="Slug">
                <Input
                  id="quick-type-slug"
                  value={slug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    setSlug(e.target.value);
                  }}
                  placeholder="vehicles"
                  autoComplete="off"
                  spellCheck={false}
                  pattern={SLUG_INPUT_PATTERN}
                />
              </Field>
              <Field id="quick-type-prefix" label="Route prefix">
                <Input
                  id="quick-type-prefix"
                  value={routePrefix}
                  onChange={(e) => {
                    setPrefixTouched(true);
                    setRoutePrefix(e.target.value);
                  }}
                  placeholder="vehicles"
                  autoComplete="off"
                  spellCheck={false}
                />
              </Field>
              <p className="col-span-2 text-xs text-muted-foreground">
                Live listing at{" "}
                <span className="font-mono text-foreground">{listingPath ? `/${listingPath}` : "/…"}</span>
              </p>
            </div>

            <div className="grid min-w-0 grid-cols-2 gap-4">
              <Field id="quick-type-singular" label="Singular label">
                <Input
                  id="quick-type-singular"
                  value={labelSingular}
                  onChange={(e) => {
                    setSingularTouched(true);
                    setLabelSingular(e.target.value);
                  }}
                  placeholder="Vehicle"
                />
              </Field>
              <Field id="quick-type-plural" label="Plural label">
                <Input
                  id="quick-type-plural"
                  value={labelPlural}
                  onChange={(e) => {
                    setPluralTouched(true);
                    setLabelPlural(e.target.value);
                  }}
                  placeholder="Vehicles"
                />
              </Field>
            </div>

            <div className="min-w-0 space-y-2">
              <Label className="block">Icon</Label>
              <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Icon">
                {ICON_OPTIONS.map((option) => {
                  const Icon = option.icon;
                  const selected = icon === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      aria-label={option.label}
                      title={option.label}
                      disabled={pending}
                      onClick={() => setIcon(option.value)}
                      className={cn(
                        "flex h-11 w-11 items-center justify-center rounded-lg border transition-colors",
                        selected
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-input text-muted-foreground hover:border-ring/40 hover:bg-accent/10 hover:text-foreground",
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </button>
                  );
                })}
              </div>
            </div>

            {error ? (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}
          </div>

          <DialogFooter className="shrink-0 gap-2 border-t bg-background px-6 py-4 sm:space-x-0">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={pending}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={pending || !canSubmit}
              onClick={() => submit(true)}
            >
              {pending ? "Creating…" : "Create & configure"}
            </Button>
            <Button type="submit" disabled={pending || !canSubmit}>
              {pending ? "Creating…" : "Create type"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
