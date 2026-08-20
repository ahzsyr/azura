"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { quickCreateContentType } from "@/features/content/content-type.actions";
import { slugifyContentTypeName } from "@/features/content/content-admin-paths";
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
import Link from "next/link";

const ICON_OPTIONS = [
  { value: "box", label: "Box" },
  { value: "package", label: "Package" },
  { value: "building", label: "Building" },
  { value: "briefcase", label: "Briefcase" },
  { value: "layers", label: "Layers" },
  { value: "folder", label: "Folder" },
  { value: "tag", label: "Tag" },
] as const;

function guessSingular(name: string) {
  const trimmed = name.trim();
  if (trimmed.length > 3 && /s$/i.test(trimmed) && !/ss$/i.test(trimmed)) {
    return trimmed.slice(0, -1);
  }
  return trimmed || "Item";
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
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New content type</DialogTitle>
          <DialogDescription>
            Quick-add a type, then add items or finish the field schema when you are ready.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div>
            <Label htmlFor="quick-type-name">Name</Label>
            <Input
              id="quick-type-name"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g. Vehicles"
              autoComplete="off"
              required
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="quick-type-slug">Slug</Label>
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
                pattern="[a-z0-9-]+"
              />
            </div>
            <div>
              <Label htmlFor="quick-type-prefix">Public route prefix</Label>
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
              <p className="mt-1 text-xs text-muted-foreground">
                Live listing at {routePrefix.trim() ? `/${routePrefix.trim().toLowerCase()}` : "/…"}
              </p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="quick-type-singular">Singular label</Label>
              <Input
                id="quick-type-singular"
                value={labelSingular}
                onChange={(e) => {
                  setSingularTouched(true);
                  setLabelSingular(e.target.value);
                }}
                placeholder="Vehicle"
              />
            </div>
            <div>
              <Label htmlFor="quick-type-plural">Plural label</Label>
              <Input
                id="quick-type-plural"
                value={labelPlural}
                onChange={(e) => {
                  setPluralTouched(true);
                  setLabelPlural(e.target.value);
                }}
                placeholder="Vehicles"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="quick-type-icon">Icon</Label>
            <select
              id="quick-type-icon"
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {ICON_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button asChild type="button" variant="ghost" size="sm" className="sm:me-auto">
            <Link href="/admin/content/types/new">Full editor</Link>
          </Button>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={pending}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={pending || !name.trim() || !(slug || derivedSlug)}
              onClick={() => submit(true)}
            >
              {pending ? "Creating…" : "Create & configure"}
            </Button>
            <Button
              type="button"
              disabled={pending || !name.trim() || !(slug || derivedSlug)}
              onClick={() => submit(false)}
            >
              {pending ? "Creating…" : "Create type"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
