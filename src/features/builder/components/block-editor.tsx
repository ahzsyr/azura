"use client";

import { useEffect, useRef, useState } from "react";
import type { BlockNode, PageBlocks } from "@/types/builder";
import { createBlock, BLOCK_DEFAULTS } from "@/schemas/blocks";
import { BlockTreeEditor, insertBlockInTree } from "./block-tree-editor";
import { BlockPickerModal } from "./block-picker-modal";
import { BlockPresetPanel } from "./block-preset-panel";
import { BlockFieldEditor } from "./block-field-editor";
import { BlockInspectorShell } from "./block-inspector-shell";
import { BlockInspectorErrorBoundary } from "./block-inspector-error-boundary";
import { BlockEditorToolbar } from "./block-editor-toolbar";
import { patchBlockSettings } from "@/features/builder/instance/block-instance";
import { findBlockById, updateBlockInTree, cloneBlocks } from "../block-tree";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAdminFormOptional } from "@/components/admin/layout/admin-form-provider";
import { Plus, LayoutTemplate } from "lucide-react";
import type { GalleryBuilderOption } from "@/features/gallery/types";
import type { FaqSetBuilderOption } from "@/features/faq/types";
import type {
  TestimonialBuilderOption,
  TestimonialCollectionBuilderOption,
} from "@/features/testimonials/types";
import type { EntityTranslation } from "@prisma/client";
import { FALLBACK_LOCALES, type PublicLocale } from "@/i18n/locale-config";
import { getContentFieldSuffix } from "@/i18n/locale-config";
import {
  BlockTranslationProvider,
  BlockTranslationsHiddenInput,
  useBlockTranslationsOptional,
} from "@/features/builder/block-translation-context";
import type { BlockParentType } from "@/features/translation/block-translation";
import type { BlockInspectorTabId } from "@/features/builder/constants/block-inspector-tabs";

type Revision = {
  id: string;
  version: number;
  createdAt: Date | string;
  message?: string | null;
  blocks: unknown;
};

type BlockEditorProps = {
  initialBlocks?: PageBlocks;
  blocks?: PageBlocks;
  onChange?: (blocks: PageBlocks) => void;
  name?: string;
  revisions?: Revision[];
  onRestoreRevision?: (revisionId: string) => void | Promise<void>;
  embeddedTemplates?: boolean;
  embeddedHistory?: boolean;
  onGoToTemplates?: () => void;
  onSelectBlock?: (id: string | null) => void;
  /** Controlled selection (e.g. restored from URL after save). */
  selectedId?: string | null;
  /** Controlled block inspector tab (e.g. Look & Feel from URL). */
  inspectorTab?: BlockInspectorTabId;
  onInspectorTabChange?: (tab: BlockInspectorTabId) => void;
  /** When false, parent form owns the blocks hidden input (e.g. tabbed page editor). */
  includeHiddenInput?: boolean;
  /** Optional ref synced on every block change (for pre-submit sync in native forms). */
  blocksRef?: React.MutableRefObject<PageBlocks | null>;
  galleryOptions?: GalleryBuilderOption[];
  faqSetOptions?: FaqSetBuilderOption[];
  testimonialOptions?: TestimonialBuilderOption[];
  testimonialCollectionOptions?: TestimonialCollectionBuilderOption[];
  locales?: PublicLocale[];
  blockParentType?: BlockParentType | null;
  blockParentId?: string | null;
  initialBlockTranslations?: EntityTranslation[];
};

export function BlockEditor({
  initialBlocks = [],
  blocks: controlledBlocks,
  onChange: controlledOnChange,
  name = "blocks",
  revisions,
  onRestoreRevision,
  embeddedTemplates = true,
  embeddedHistory = true,
  onGoToTemplates,
  onSelectBlock,
  selectedId: controlledSelectedId,
  inspectorTab,
  onInspectorTabChange,
  includeHiddenInput = true,
  blocksRef: externalBlocksRef,
  galleryOptions = [],
  faqSetOptions = [],
  testimonialOptions = [],
  testimonialCollectionOptions = [],
  locales = [],
  blockParentType = null,
  blockParentId = null,
  initialBlockTranslations = [],
}: BlockEditorProps) {
  const [internalBlocks, setInternalBlocks] = useState<PageBlocks>(initialBlocks ?? []);
  const blocks = controlledBlocks ?? internalBlocks;
  const blocksRef = useRef(blocks);
  blocksRef.current = blocks;
  const internalBlocksRef = useRef(internalBlocks);
  internalBlocksRef.current = internalBlocks;
  const [internalSelectedId, setInternalSelectedId] = useState<string | null>(null);
  const selectedId = controlledSelectedId !== undefined ? controlledSelectedId : internalSelectedId;
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerParentId, setPickerParentId] = useState<string | null>(null);
  const adminForm = useAdminFormOptional();

  useEffect(() => {
    if (controlledSelectedId === undefined) return;
    setInternalSelectedId(controlledSelectedId);
  }, [controlledSelectedId]);

  const setSelectedId = (id: string | null) => {
    if (controlledSelectedId === undefined) {
      setInternalSelectedId(id);
    }
    onSelectBlock?.(id);
  };

  const selectedBlock = selectedId != null ? findBlockById(blocks, selectedId) : null;

  const updateBlocks = (next: PageBlocks) => {
    blocksRef.current = next;
    if (externalBlocksRef) externalBlocksRef.current = next;
    if (!controlledOnChange) {
      internalBlocksRef.current = next;
    }
    if (controlledOnChange) {
      controlledOnChange(next);
    } else {
      setInternalBlocks(next);
    }
    adminForm?.setDirty(true);
  };

  const addBlock = (type: BlockNode["type"], parentId?: string | null) => {
    const block = createBlock(type, structuredClone(BLOCK_DEFAULTS[type] ?? {})) as BlockNode;
    updateBlocks(insertBlockInTree(blocksRef.current, block, parentId));
    setSelectedId(block.id);
    setPickerParentId(null);
  };

  const openPicker = (parentId?: string | null) => {
    setPickerParentId(parentId ?? null);
    setPickerOpen(true);
  };

  const updateSelectedBlock = (updated: BlockNode) => {
    if (!selectedId) return;
    updateBlocks(updateBlockInTree(blocksRef.current, selectedId, () => updated));
  };

  const handleSelect = (id: string | null) => {
    setSelectedId(id);
  };

  const handleLegacyPropUpdate = (
    blockId: string,
    field: string,
    localeCode: string,
    value: string
  ) => {
    const suffix = getContentFieldSuffix(localeCode);
    if (suffix !== "En" && suffix !== "Ar") return;
    updateBlocks(
      updateBlockInTree(blocksRef.current, blockId, (block) =>
        patchBlockSettings(block, { [`${field}${suffix}`]: value })
      )
    );
  };

  const editorContent = (
    <div className="space-y-4">
      {includeHiddenInput && (
        <input type="hidden" name={name} value={JSON.stringify(blocks)} readOnly />
      )}
      {includeHiddenInput && <BlockTranslationsHiddenInput />}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button type="button" onClick={() => openPicker()}>
            <Plus className="h-4 w-4 me-1.5" />
            Add block
          </Button>
          {!embeddedTemplates && onGoToTemplates && (
            <Button type="button" variant="outline" onClick={onGoToTemplates}>
              <LayoutTemplate className="h-4 w-4 me-1.5" />
              Browse templates
            </Button>
          )}
        </div>
        <Badge variant="secondary">
          {blocks.length} block{blocks.length !== 1 ? "s" : ""}
        </Badge>
      </div>

      {embeddedTemplates && (
        <BlockPresetPanel
          selectedBlock={selectedBlock}
          currentBlocks={blocks}
          onInsertBlock={(block) => {
            updateBlocks([...blocks, block]);
            setSelectedId(block.id);
          }}
          onApplyTemplate={(tpl) => updateBlocks(tpl)}
        />
      )}

      {blocks.length === 0 ? (
        <div className="rounded-lg border border-dashed py-12 text-center space-y-3">
          <p className="text-sm text-muted-foreground">No blocks yet. Add your first block or apply a template.</p>
          <div className="flex justify-center gap-2">
            <Button type="button" onClick={() => openPicker()}>
              <Plus className="h-4 w-4 me-1.5" />
              Add block
            </Button>
            {!embeddedTemplates && onGoToTemplates && (
              <Button type="button" variant="outline" onClick={onGoToTemplates}>
                Browse templates
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_1fr] xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Block order</CardTitle>
              <CardDescription>Drag to reorder or use arrow buttons.</CardDescription>
            </CardHeader>
            <CardContent>
              <BlockTreeEditor
                blocks={blocks}
                onChange={updateBlocks}
                selectedId={selectedId}
                onSelect={handleSelect}
                onAddToSection={(sectionId) => openPicker(sectionId)}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Block settings</CardTitle>
              <CardDescription>
                {selectedBlock ? "Edit the selected block content." : "Select a block to edit."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedBlock && (
                <BlockEditorToolbar
                  blocks={blocks}
                  selectedBlock={selectedBlock}
                  onBlocksChange={updateBlocks}
                  onSelectBlock={handleSelect}
                />
              )}
              {selectedBlock ? (
                <BlockInspectorErrorBoundary block={selectedBlock}>
                  <BlockInspectorShell
                    block={selectedBlock}
                    onChange={updateSelectedBlock}
                    activeTab={inspectorTab}
                    onTabChange={onInspectorTabChange}
                    content={
                      <BlockFieldEditor
                        block={selectedBlock}
                        onChange={updateSelectedBlock}
                        galleryOptions={galleryOptions}
                        faqSetOptions={faqSetOptions}
                        testimonialOptions={testimonialOptions}
                        testimonialCollectionOptions={testimonialCollectionOptions}
                      />
                    }
                  />
                </BlockInspectorErrorBoundary>
              ) : (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  Select a block from the list to edit its content.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {embeddedHistory && revisions && revisions.length > 0 && (
        <BlockRevisionList
          revisions={revisions}
          onRestoreRevision={onRestoreRevision}
          onPreview={(revBlocks) => updateBlocks(cloneBlocks(revBlocks))}
        />
      )}

      <BlockPickerModal
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onAdd={addBlock}
        parentId={pickerParentId}
        title={pickerParentId ? "Add block to section" : "Add block"}
      />
    </div>
  );

  const existingCtx = useBlockTranslationsOptional();
  if (existingCtx) {
    return editorContent;
  }

  const effectiveLocales = locales.length > 0 ? locales : FALLBACK_LOCALES;

  return (
    <BlockTranslationProvider
      locales={effectiveLocales}
      parentType={blockParentType}
      parentId={blockParentId}
      initialBlocks={blocks}
      initialRows={initialBlockTranslations}
      onLegacyPropUpdate={handleLegacyPropUpdate}
    >
      {editorContent}
    </BlockTranslationProvider>
  );
}

function BlockRevisionList({
  revisions,
  onRestoreRevision,
  onPreview,
}: {
  revisions: Revision[];
  onRestoreRevision?: (revisionId: string) => void | Promise<void>;
  onPreview: (blocks: PageBlocks) => void;
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold mb-2">Version history</h3>
      <ul className="text-xs space-y-2 max-h-48 overflow-y-auto">
        {revisions.map((rev) => (
          <li key={rev.id} className="border rounded p-2">
            <div className="flex justify-between gap-2">
              <span>
                v{rev.version} · {new Date(rev.createdAt).toLocaleString()}
              </span>
              {onRestoreRevision && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 text-[10px] px-2"
                  onClick={() => {
                    if (confirm(`Restore version ${rev.version}? Unsaved changes will be lost.`)) {
                      onRestoreRevision(rev.id);
                    }
                  }}
                >
                  Restore
                </Button>
              )}
            </div>
            {rev.message && <p className="text-muted-foreground mt-0.5">{rev.message}</p>}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-6 text-[10px] mt-2 w-full"
              onClick={() => onPreview((rev.blocks as PageBlocks) ?? [])}
            >
              Preview in editor
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function BlockEditorHistory({
  revisions,
  onRestoreRevision,
  onPreviewBlocks,
}: {
  revisions: Revision[];
  onRestoreRevision?: (revisionId: string) => void | Promise<void>;
  onPreviewBlocks: (blocks: PageBlocks) => void;
}) {
  if (!revisions.length) {
    return <p className="text-sm text-muted-foreground">No revisions yet. Save the page to create one.</p>;
  }
  return (
    <BlockRevisionList
      revisions={revisions}
      onRestoreRevision={onRestoreRevision}
      onPreview={onPreviewBlocks}
    />
  );
}
