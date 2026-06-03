import { useState } from "react";
import type { GlobalApply, HeaderWorkspace } from "@/features/navigation/types";
import {
  createMenu,
  deleteMenu,
  duplicateMenu,
  importMenuJsonFile,
  renameMenu,
  setActiveMenuKey,
  setMenuGlobalApplyWithConflictCheck,
} from "@/features/navigation/header-store";
import { countTotalItems } from "@/features/navigation/menu-engine";
import { saveWorkspaceToServer } from "@/features/navigation/header-workspace-api";
import { useAdminFormOptional } from "@/components/admin/layout/admin-form-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { HeaderSelect } from "./header-builder-ui";
import {
  Copy,
  Download,
  Pencil,
  PenSquare,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";

interface Props {
  workspace: HeaderWorkspace;
  onEditInBuilder: (key: string) => void;
}

const PLACEMENT_OPTIONS: { value: GlobalApply; label: string }[] = [
  { value: "none", label: "Not assigned" },
  { value: "Both", label: "Desktop & Mobile" },
  { value: "Desktop", label: "Desktop only" },
  { value: "Mobile", label: "Mobile only" },
];

export function MenuManagerPanel({ workspace, onEditInBuilder }: Props) {
  const adminForm = useAdminFormOptional();
  const [createName, setCreateName] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);
  const [editingNameKey, setEditingNameKey] = useState<string | null>(null);
  const [editingNameValue, setEditingNameValue] = useState("");

  const toast = (type: "success" | "error", message: string) => {
    adminForm?.showToast(message, type);
  };

  const persist = async (successMessage?: string) => {
    const r = await saveWorkspaceToServer();
    if (r.ok) {
      if (successMessage) toast("success", successMessage);
    } else {
      toast("error", r.error ?? "Save failed.");
    }
    return r.ok;
  };

  const handleEdit = (key: string) => {
    setActiveMenuKey(key);
    onEditInBuilder(key);
  };

  const handlePlacementChange = async (key: string, value: GlobalApply) => {
    const { clearedConflicts } = setMenuGlobalApplyWithConflictCheck(key, value);
    if (clearedConflicts.length > 0) {
      toast("success", `Placement updated. Cleared: ${clearedConflicts.join(", ")}.`);
    }
    await persist(value !== "none" ? "Placement saved." : undefined);
  };

  const handleDelete = async (key: string) => {
    if (key === "mainMenu") {
      toast("error", "The Main Menu cannot be deleted.");
      return;
    }
    const menuName = workspace.menusDatabase[key]?.name ?? key;
    setDeletingKey(null);
    deleteMenu(key);
    await persist(`"${menuName}" deleted.`);
  };

  const handleDuplicate = async (key: string) => {
    const newKey = duplicateMenu(key);
    if (!newKey) return;
    if (await persist("Menu duplicated.")) onEditInBuilder(newKey);
  };

  const handleCreate = async () => {
    const name = createName.trim();
    if (!name) {
      toast("error", "Please enter a menu name.");
      return;
    }
    const key = createMenu(name);
    setCreateName("");
    setShowCreateForm(false);
    if (await persist(`Menu "${name}" created.`)) onEditInBuilder(key);
  };

  const handleRename = async (key: string) => {
    const name = editingNameValue.trim();
    if (!name) {
      toast("error", "Name cannot be empty.");
      return;
    }
    renameMenu(key, name);
    setEditingNameKey(null);
    await persist("Menu renamed.");
  };

  const handleExport = (key: string) => {
    const data = { menu: workspace.menusDatabase[key], key };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `menu_${key}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const handleImport = (key: string) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const parsed = JSON.parse(String(reader.result ?? ""));
          if (importMenuJsonFile(key, parsed)) {
            await persist("Menu imported.");
          } else {
            throw new Error("invalid");
          }
        } catch {
          toast("error", "Invalid menu JSON file.");
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const entries = Object.entries(workspace.menusDatabase);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Each surface supports one active menu. Assigning a menu clears conflicting assignments.
        </p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => {
            setShowCreateForm((v) => !v);
            setCreateName("");
          }}
        >
          <Plus className="h-4 w-4" />
          New menu
        </Button>
      </div>

      {showCreateForm ? (
        <Card>
          <CardContent className="flex flex-wrap items-end gap-3 pt-6">
            <div className="min-w-[200px] flex-1 space-y-2">
              <Label htmlFor="new-menu-name">Menu name</Label>
              <Input
                id="new-menu-name"
                value={createName}
                autoFocus
                placeholder="Menu name…"
                onChange={(e) => setCreateName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void handleCreate();
                  if (e.key === "Escape") setShowCreateForm(false);
                }}
              />
            </div>
            <Button type="button" onClick={() => void handleCreate()}>
              Create & edit
            </Button>
            <Button type="button" variant="outline" onClick={() => setShowCreateForm(false)}>
              Cancel
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {entries.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No menus yet. Create your first menu above.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {entries.map(([key, menu]) => {
            const isActive = workspace.activeMenuKey === key;
            const isMain = key === "mainMenu";
            const applyStatus = (menu.globalApply ?? "none") as GlobalApply;
            const itemCount = countTotalItems(menu.items);
            const isEditingName = editingNameKey === key;
            const isDeleting = deletingKey === key;

            return (
              <Card key={key} className={isActive ? "border-primary/40 ring-1 ring-primary/20" : undefined}>
                <CardHeader className="pb-3">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      {isEditingName ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <Input
                            className="max-w-xs"
                            value={editingNameValue}
                            autoFocus
                            onChange={(e) => setEditingNameValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") void handleRename(key);
                              if (e.key === "Escape") setEditingNameKey(null);
                            }}
                          />
                          <Button type="button" size="sm" onClick={() => void handleRename(key)}>
                            Save
                          </Button>
                          <Button type="button" size="sm" variant="outline" onClick={() => setEditingNameKey(null)}>
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-center gap-2">
                          <CardTitle className="text-base">{menu.name}</CardTitle>
                          {isActive ? <Badge>Editing</Badge> : null}
                          {isMain ? <Badge variant="secondary">Main</Badge> : null}
                        </div>
                      )}
                      <CardDescription className="mt-1">
                        <code className="text-xs">{key}</code>
                        {" · "}
                        {itemCount} item{itemCount !== 1 ? "s" : ""}
                      </CardDescription>
                    </div>
                    <div className="w-full sm:w-auto sm:min-w-[200px] space-y-1">
                      <Label className="text-xs">Placement</Label>
                      <HeaderSelect
                        value={applyStatus}
                        onChange={(v) => void handlePlacementChange(key, v as GlobalApply)}
                      >
                        {PLACEMENT_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </HeaderSelect>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {isDeleting ? (
                    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
                      <span>Delete &ldquo;{menu.name}&rdquo;? This cannot be undone.</span>
                      <Button type="button" size="sm" variant="destructive" onClick={() => void handleDelete(key)}>
                        Delete
                      </Button>
                      <Button type="button" size="sm" variant="outline" onClick={() => setDeletingKey(null)}>
                        Cancel
                      </Button>
                    </div>
                  ) : null}
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" size="sm" onClick={() => handleEdit(key)}>
                      <PenSquare className="h-4 w-4" />
                      Edit in builder
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingNameKey(key);
                        setEditingNameValue(menu.name);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                      Rename
                    </Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => void handleDuplicate(key)}>
                      <Copy className="h-4 w-4" />
                      Duplicate
                    </Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => handleExport(key)}>
                      <Download className="h-4 w-4" />
                      Export
                    </Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => handleImport(key)}>
                      <Upload className="h-4 w-4" />
                      Import
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={isMain}
                      className="text-destructive hover:text-destructive"
                      onClick={() => !isMain && setDeletingKey(isDeleting ? null : key)}
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
