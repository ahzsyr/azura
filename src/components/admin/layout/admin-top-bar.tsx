"use client";

import { useCallback } from "react";
import { useAdminTheme } from "./admin-theme-provider";
import { ThemeModeToggle } from "@/components/theme/theme-mode-toggle";
import {
  Eye,
  Loader2,
  PenLine,
  Redo2,
  RefreshCw,
  Save,
  Send,
  Undo2,
} from "lucide-react";
import { applySaveResult, useAdminUiStore } from "@/stores/admin-ui-store";
import { AdminSearchCommand } from "@/features/search/components/search-command";
import { AdminBreadcrumbs } from "./admin-breadcrumbs";
import { AdminMobileMenuButton } from "./admin-sidebar";
import { AdminLocaleSwitcher } from "@/components/admin/admin-locale-switcher";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { isRedirectError } from "next/dist/client/components/redirect-error";

function SaveStatusIndicator() {
  const saveStatus = useAdminUiStore((s) => s.saveStatus);
  const lastUpdated = useAdminUiStore((s) => s.lastUpdated);
  const pageActions = useAdminUiStore((s) => s.pageActions);

  const showStatus = Boolean(
    pageActions.onSave || pageActions.onUpdate || pageActions.onPublish
  );
  if (!showStatus) return null;

  const labels = {
    saved: "Saved",
    unsaved: "Unsaved changes",
    saving: "Saving…",
    error: "Save failed",
  };

  const colors = {
    saved: "text-emerald-600 dark:text-emerald-400",
    unsaved: "text-amber-600 dark:text-amber-400",
    saving: "text-muted-foreground",
    error: "text-destructive",
  };

  const formattedTime =
    lastUpdated &&
    new Intl.DateTimeFormat(undefined, {
      hour: "numeric",
      minute: "2-digit",
    }).format(lastUpdated);

  return (
    <div className="hidden items-center gap-2 text-xs sm:flex">
      <span className={cn("flex items-center gap-1.5 font-medium", colors[saveStatus])}>
        {saveStatus === "saving" && <Loader2 className="h-3 w-3 animate-spin" />}
        {saveStatus !== "saving" && (
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              saveStatus === "saved" && "bg-emerald-500",
              saveStatus === "unsaved" && "bg-amber-500",
              saveStatus === "error" && "bg-destructive"
            )}
          />
        )}
        {labels[saveStatus]}
      </span>
      {formattedTime && saveStatus === "saved" && (
        <span className="text-muted-foreground">· {formattedTime}</span>
      )}
    </div>
  );
}

function ShortcutHint({ keys }: { keys: string }) {
  return (
    <kbd className="pointer-events-none hidden rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground xl:inline-block">
      {keys}
    </kbd>
  );
}

export function AdminTopBar() {
  const pageActions = useAdminUiStore((s) => s.pageActions);
  const saveStatus = useAdminUiStore((s) => s.saveStatus);
  const patchMeta = useAdminUiStore((s) => s.patchMeta);
  const setSaveStatus = useAdminUiStore((s) => s.setSaveStatus);
  const markSaved = useAdminUiStore((s) => s.markSaved);
  const consumePendingDirty = useAdminUiStore((s) => s.consumePendingDirty);
  const { resolvedTheme } = useAdminTheme();

  const handleSave = useCallback(async () => {
    if (!pageActions.onSave || saveStatus === "saving") return;
    if (!pageActions.selfManagedSaveStatus) {
      setSaveStatus("saving");
    }
    try {
      const ok = await pageActions.onSave();
      applySaveResult(ok, pageActions, {
        setSaveStatus,
        markSaved,
        consumePendingDirty,
      });
    } catch (e) {
      if (isRedirectError(e)) throw e;
      if (!pageActions.selfManagedSaveStatus) {
        setSaveStatus("error");
      }
    }
  }, [pageActions, saveStatus, setSaveStatus, markSaved, consumePendingDirty]);

  const handleCancel = useCallback(async () => {
    if (!pageActions.onCancel || saveStatus === "saving") return;
    const canCancel =
      pageActions.canCancel ?? (saveStatus === "unsaved" || saveStatus === "error");
    if (!canCancel) return;
    try {
      await pageActions.onCancel();
      markSaved();
    } catch {
      /* keep unsaved */
    }
  }, [pageActions, saveStatus, markSaved]);

  const handleUpdate = useCallback(async () => {
    if (!pageActions.onUpdate || saveStatus === "saving") return;
    setSaveStatus("saving");
    try {
      await pageActions.onUpdate();
      markSaved();
    } catch {
      setSaveStatus("error");
    }
  }, [pageActions, saveStatus, setSaveStatus, markSaved]);

  const handlePublish = useCallback(async () => {
    if (!pageActions.onPublish || saveStatus === "saving") return;
    setSaveStatus("saving");
    try {
      const ok = await pageActions.onPublish();
      applySaveResult(ok, pageActions, {
        setSaveStatus,
        markSaved,
        consumePendingDirty,
      });
    } catch (e) {
      if (isRedirectError(e)) throw e;
      setSaveStatus("error");
    }
  }, [pageActions, saveStatus, setSaveStatus, markSaved, consumePendingDirty]);

  const showCancel = Boolean(
    pageActions.onCancel &&
      (pageActions.canCancel ?? (saveStatus === "unsaved" || saveStatus === "error"))
  );

  const hasActions = Boolean(
    pageActions.onSave ||
      pageActions.onUpdate ||
      pageActions.onRebuildIndex ||
      pageActions.onPublish ||
      pageActions.onPreview ||
      pageActions.onUndo ||
      showCancel
  );

  const saveTooltipText =
    patchMeta.dirtyFieldsCount > 0
      ? `Save ${patchMeta.dirtyFieldsCount} modified field${patchMeta.dirtyFieldsCount === 1 ? "" : "s"}`
      : (pageActions.saveTooltip ?? "Save");

  return (
    <TooltipProvider delayDuration={300}>
      <header className="admin-liquid-glass sticky top-0 z-30 flex h-12 shrink-0 items-center gap-3 border-b px-4 shadow-sm">
        <AdminMobileMenuButton />

        <div className="hidden min-w-0 md:block">
          <AdminBreadcrumbs />
        </div>

        <div className="flex min-w-0 flex-1 items-center justify-center md:max-w-sm lg:max-w-md">
          <AdminSearchCommand />
        </div>

        <SaveStatusIndicator />

        <AdminLocaleSwitcher className="hidden sm:flex" />

        <Tooltip>
          <TooltipTrigger asChild>
            <span className="hidden sm:inline-flex">
              <ThemeModeToggle size="sm" />
            </span>
          </TooltipTrigger>
          <TooltipContent>Toggle {resolvedTheme === "dark" ? "light" : "dark"} mode</TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="hidden h-6 lg:block" />

        <div className="flex shrink-0 items-center gap-1">
          {pageActions.onUndo && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  disabled={!pageActions.canUndo}
                  onClick={pageActions.onUndo}
                  aria-label="Undo"
                >
                  <Undo2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                Undo <ShortcutHint keys="⌘Z" />
              </TooltipContent>
            </Tooltip>
          )}

          {pageActions.onRedo && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  disabled={!pageActions.canRedo}
                  onClick={pageActions.onRedo}
                  aria-label="Redo"
                >
                  <Redo2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                Redo <ShortcutHint keys="⌘⇧Z" />
              </TooltipContent>
            </Tooltip>
          )}

          {pageActions.onPreview && pageActions.canPreview !== false && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={pageActions.onPreview}>
                  <Eye className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Preview</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Preview changes</TooltipContent>
            </Tooltip>
          )}

          {pageActions.onRebuildIndex && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5"
                  disabled={saveStatus === "saving"}
                  onClick={() => void pageActions.onRebuildIndex?.()}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">
                    {pageActions.rebuildIndexLabel ?? "Rebuild index"}
                  </span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Rebuild search index from enabled sources</TooltipContent>
            </Tooltip>
          )}

          {showCancel && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1.5"
                  disabled={saveStatus === "saving"}
                  onClick={() => void handleCancel()}
                >
                  <span className="hidden sm:inline">
                    {pageActions.cancelLabel ?? "Cancel"}
                  </span>
                  <span className="sm:hidden">Cancel</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                Discard unsaved changes <ShortcutHint keys="Esc" />
              </TooltipContent>
            </Tooltip>
          )}

          {pageActions.onSave && pageActions.canSave !== false && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5"
                  disabled={saveStatus === "saving"}
                  onClick={() => void handleSave()}
                >
                  {saveStatus === "saving" ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Save className="h-3.5 w-3.5" />
                  )}
                  <span className="hidden sm:inline">
                    {pageActions.saveLabel ?? "Save"}
                  </span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {saveTooltipText}{" "}
                <ShortcutHint keys="⌘S" />
              </TooltipContent>
            </Tooltip>
          )}

          {pageActions.onUpdate && pageActions.canUpdate !== false && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5"
                  disabled={saveStatus === "saving"}
                  onClick={() => void handleUpdate()}
                >
                  {saveStatus === "saving" ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <PenLine className="h-3.5 w-3.5" />
                  )}
                  <span className="hidden sm:inline">
                    {pageActions.updateLabel ?? "Update"}
                  </span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {pageActions.updateTooltip ?? "Save changes and keep editing"}
              </TooltipContent>
            </Tooltip>
          )}

          {pageActions.onPublish && pageActions.canPublish !== false && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  className="h-8 gap-1.5"
                  disabled={saveStatus === "saving"}
                  onClick={() => void handlePublish()}
                >
                  {saveStatus === "saving" ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Send className="h-3.5 w-3.5" />
                  )}
                  <span className="hidden sm:inline">
                    {pageActions.publishLabel ?? "Publish"}
                  </span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {pageActions.publishTooltip ?? "Publish changes live"}
              </TooltipContent>
            </Tooltip>
          )}

          {!hasActions && (
            <p className="hidden text-xs text-muted-foreground xl:block">⌘K to search</p>
          )}
        </div>
      </header>
    </TooltipProvider>
  );
}
