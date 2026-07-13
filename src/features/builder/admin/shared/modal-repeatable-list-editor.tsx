"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { moveItemById, removeItemById } from "./array-list-utils";

type EditorStrings = {
  sectionLabel: string;
  addButtonLabel: string;
  emptyLabel: string;
  dialogTitleCreate: string;
  dialogTitleEdit: string;
  dialogDescription?: string;
  saveButtonLabelCreate: string;
  saveButtonLabelEdit: string;
};

export type ModalRepeatableListEditorProps<T extends { id: string }> = {
  items: T[];
  onChange: (next: T[]) => void;
  strings: EditorStrings;
  createEmpty: () => T;
  renderSummary: (item: T, index: number) => { title: string; meta?: string[] };
  renderForm: (draft: T, onUpdate: (patch: Partial<T>) => void) => React.ReactNode;
};

export function ModalRepeatableListEditor<T extends { id: string }>({
  items,
  onChange,
  strings,
  createEmpty,
  renderSummary,
  renderForm,
}: ModalRepeatableListEditorProps<T>) {
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<T>(() => createEmpty());

  const isEditing = Boolean(editingId);
  const dialogTitle = isEditing ? strings.dialogTitleEdit : strings.dialogTitleCreate;
  const saveLabel = isEditing ? strings.saveButtonLabelEdit : strings.saveButtonLabelCreate;

  const summaries = useMemo(
    () => items.map((item, index) => ({ item, index, summary: renderSummary(item, index) })),
    [items, renderSummary],
  );

  function openCreate() {
    setEditingId(null);
    setDraft(createEmpty());
    setOpen(true);
  }

  function openEdit(item: T) {
    setEditingId(item.id);
    setDraft({ ...item });
    setOpen(true);
  }

  function close() {
    setOpen(false);
    setEditingId(null);
  }

  function save() {
    if (editingId) {
      onChange(items.map((item) => (item.id === editingId ? ({ ...draft, id: editingId } as T) : item)));
    } else {
      onChange([...items, draft]);
    }
    close();
  }

  function remove(id: string) {
    onChange(removeItemById(items, id));
    if (editingId === id) close();
  }

  function move(id: string, direction: -1 | 1) {
    onChange(moveItemById(items, id, direction));
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {strings.sectionLabel}
        </span>
        <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={openCreate}>
          <Plus className="mr-1 h-3.5 w-3.5" />
          {strings.addButtonLabel}
        </Button>
      </div>

      {items.length === 0 ? (
        <p className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
          {strings.emptyLabel}
        </p>
      ) : (
        <div className="space-y-2">
          {summaries.map(({ item, index, summary }) => (
            <div key={item.id} className="rounded-lg border bg-muted/20 px-3 py-2">
              <div className="flex items-start justify-between gap-2">
                <button
                  type="button"
                  className="min-w-0 flex-1 text-left"
                  onClick={() => openEdit(item)}
                  title={strings.dialogTitleEdit}
                >
                  <div className="truncate text-sm font-medium">{summary.title}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                    <span>#{index + 1}</span>
                    {(summary.meta ?? []).map((m) => (
                      <span key={m} className="truncate">
                        {m}
                      </span>
                    ))}
                  </div>
                </button>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => move(item.id, -1)}
                    disabled={index === 0}
                    title="Move up"
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => move(item.id, 1)}
                    disabled={index === items.length - 1}
                    title="Move down"
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => openEdit(item)}
                    title="Edit"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => remove(item.id)}
                    title="Remove"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
            <DialogDescription>
              {strings.dialogDescription ?? "Update details, then save to apply to the block."}
            </DialogDescription>
          </DialogHeader>

          {renderForm(draft, (patch) => setDraft((prev) => ({ ...prev, ...patch })))}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={close}>
              Cancel
            </Button>
            <Button type="button" onClick={save}>
              {saveLabel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

