"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Pencil, Plus, Trash2 } from "lucide-react";
import type { FooterLink } from "@/features/footer/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { HeaderField } from "@/features/navigation/admin/header-builder-ui";
import { FooterLinkLabelField } from "./footer-localized-fields";

type LinkModalState =
  | { mode: "add" }
  | { mode: "edit"; linkIndex: number };

type LinkFormState = {
  label: string;
  href: string;
  openInNewTab: boolean;
};

const emptyForm = (): LinkFormState => ({
  label: "",
  href: "",
  openInNewTab: false,
});

type FooterLinksEditorProps = {
  columnId: string;
  links: FooterLink[];
  onChange: (links: FooterLink[]) => void;
};

export function FooterLinksEditor({ columnId, links, onChange }: FooterLinksEditorProps) {
  const [linkModal, setLinkModal] = useState<LinkModalState | null>(null);
  const [form, setForm] = useState<LinkFormState>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);

  const openAddModal = () => {
    setForm(emptyForm());
    setFormError(null);
    setLinkModal({ mode: "add" });
  };

  const openEditModal = (linkIndex: number) => {
    const link = links[linkIndex];
    setForm({
      label: link.label,
      href: link.href,
      openInNewTab: link.openInNewTab ?? false,
    });
    setFormError(null);
    setLinkModal({ mode: "edit", linkIndex });
  };

  const closeModal = () => {
    setLinkModal(null);
    setFormError(null);
  };

  const saveLink = () => {
    const label = form.label.trim();
    const href = form.href.trim();
    if (!label) {
      setFormError("Label is required.");
      return;
    }
    if (!href) {
      setFormError("URL is required.");
      return;
    }

    const nextLink: FooterLink = {
      label,
      href,
      openInNewTab: form.openInNewTab || undefined,
    };

    if (linkModal?.mode === "add") {
      onChange([...links, nextLink]);
    } else if (linkModal?.mode === "edit") {
      const next = [...links];
      next[linkModal.linkIndex] = nextLink;
      onChange(next);
    }

    closeModal();
  };

  const removeLink = (linkIndex: number) => {
    onChange(links.filter((_, idx) => idx !== linkIndex));
  };

  const moveLink = (linkIndex: number, direction: -1 | 1) => {
    const target = linkIndex + direction;
    if (target < 0 || target >= links.length) return;
    const next = [...links];
    [next[linkIndex], next[target]] = [next[target], next[linkIndex]];
    onChange(next);
  };

  const modalLinkIndex =
    linkModal?.mode === "edit" ? linkModal.linkIndex : linkModal?.mode === "add" ? links.length : null;

  const handleDefaultLabelChange = (label: string) => {
    setForm((prev) => ({ ...prev, label }));
    setFormError(null);

    if (linkModal?.mode === "edit") {
      const next = [...links];
      next[linkModal.linkIndex] = { ...next[linkModal.linkIndex], label };
      onChange(next);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label>Links</Label>
        <Button type="button" size="sm" variant="outline" onClick={openAddModal}>
          <Plus className="h-4 w-4" />
          Add link
        </Button>
      </div>

      {links.length === 0 ? (
        <p className="rounded-md border border-dashed px-3 py-4 text-sm text-muted-foreground">
          No links yet. Add one to build this column.
        </p>
      ) : (
        <ul className="space-y-2">
          {links.map((link, linkIdx) => (
            <li
              key={`${columnId}-link-row-${linkIdx}`}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{link.label}</p>
                <p className="truncate text-xs text-muted-foreground">{link.href}</p>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  disabled={linkIdx === 0}
                  aria-label="Move link up"
                  onClick={() => moveLink(linkIdx, -1)}
                >
                  <ChevronUp className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  disabled={linkIdx === links.length - 1}
                  aria-label="Move link down"
                  onClick={() => moveLink(linkIdx, 1)}
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  aria-label={`Edit ${link.label}`}
                  onClick={() => openEditModal(linkIdx)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-destructive"
                  aria-label={`Remove ${link.label}`}
                  onClick={() => removeLink(linkIdx)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={linkModal !== null} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{linkModal?.mode === "edit" ? "Edit link" : "Add link"}</DialogTitle>
            <DialogDescription>
              Set the link label (with translations) and URL. Save the footer builder, then publish to update the live site.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {modalLinkIndex !== null ? (
              <FooterLinkLabelField
                columnId={columnId}
                linkIndex={modalLinkIndex}
                label="Label"
                defaultLabel={form.label}
                onDefaultLabelChange={handleDefaultLabelChange}
              />
            ) : null}
            <HeaderField label="URL" htmlFor="footer-link-url">
              <Input
                id="footer-link-url"
                value={form.href}
                onChange={(e) => {
                  setForm((prev) => ({ ...prev, href: e.target.value }));
                  setFormError(null);
                }}
                placeholder="/about or https://example.com"
              />
            </HeaderField>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.openInNewTab}
                onChange={(e) => setForm((prev) => ({ ...prev, openInNewTab: e.target.checked }))}
              />
              Open in new tab
            </label>
            {formError ? <p className="text-sm text-destructive">{formError}</p> : null}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeModal}>
              Cancel
            </Button>
            <Button type="button" onClick={saveLink}>
              {linkModal?.mode === "edit" ? "Save" : "Add link"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
