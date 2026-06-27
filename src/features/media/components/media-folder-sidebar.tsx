"use client";

import { useState } from "react";
import type { MediaFolder } from "@prisma/client";
import { createMediaFolder, deleteMediaFolder, renameMediaFolder } from "@/features/media/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Folder, FolderOpen, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

type FolderRow = MediaFolder & { _count: { assets: number; children: number } };

type Props = {
  folders: FolderRow[];
  activeFolderId: string | undefined;
  onSelectFolder: (folderId: string | undefined) => void;
  onFoldersChange: () => void;
};

export function MediaFolderSidebar({
  folders,
  activeFolderId,
  onSelectFolder,
  onFoldersChange,
}: Props) {
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const createFolder = async () => {
    if (!newName.trim()) return;
    await createMediaFolder(newName.trim(), activeFolderId ?? null);
    setNewName("");
    onFoldersChange();
  };

  const saveRename = async (id: string) => {
    if (!editName.trim()) return;
    await renameMediaFolder(id, editName.trim());
    setEditingId(null);
    onFoldersChange();
  };

  const removeFolder = async (id: string) => {
    if (!confirm("Delete folder? Assets will move to root.")) return;
    await deleteMediaFolder(id);
    if (activeFolderId === id) onSelectFolder(undefined);
    onFoldersChange();
  };

  return (
    <aside className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Folders</h3>
      </div>
      <button
        type="button"
        onClick={() => onSelectFolder(undefined)}
        className={cn(
          "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
          activeFolderId === undefined ? "bg-primary/10 text-primary" : "hover:bg-muted"
        )}
      >
        <FolderOpen className="h-4 w-4 shrink-0" />
        All media
      </button>
      <ul className="space-y-1 max-h-[280px] overflow-y-auto">
        {folders.map((folder) => (
          <li key={folder.id}>
            {editingId === folder.id ? (
              <div className="flex gap-1 px-1">
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="h-8 text-xs"
                  onKeyDown={(e) => e.key === "Enter" && saveRename(folder.id)}
                />
                <Button type="button" size="sm" className="h-8" onClick={() => saveRename(folder.id)}>
                  OK
                </Button>
              </div>
            ) : (
              <div
                className={cn(
                  "group flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm",
                  activeFolderId === folder.id ? "bg-primary/10 text-primary" : "hover:bg-muted"
                )}
              >
                <button
                  type="button"
                  className="flex flex-1 items-center gap-2 min-w-0 text-start"
                  onClick={() => onSelectFolder(folder.id)}
                >
                  <Folder className="h-4 w-4 shrink-0" />
                  <span className="truncate">{folder.name}</span>
                  <span className="text-[10px] text-muted-foreground ms-auto">{folder._count.assets}</span>
                </button>
                <button
                  type="button"
                  className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-foreground"
                  title="Rename"
                  onClick={() => {
                    setEditingId(folder.id);
                    setEditName(folder.name);
                  }}
                >
                  ✎
                </button>
                <button
                  type="button"
                  className="opacity-0 group-hover:opacity-100 p-1 text-destructive"
                  onClick={() => removeFolder(folder.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
      <div className="flex gap-1">
        <Input
          placeholder="New folder"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          className="h-9 text-sm"
          onKeyDown={(e) => e.key === "Enter" && createFolder()}
        />
        <Button type="button" size="sm" variant="outline" onClick={createFolder}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </aside>
  );
}
