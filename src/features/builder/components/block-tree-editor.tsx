"use client";

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical,
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  Pencil,
  Copy,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
} from "lucide-react";
import type { BlockNode, PageBlocks } from "@/types/builder";
import { getBlockMeta } from "../block-registry";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  reorderInTree,
  removeBlockFromTree,
  duplicateBlockInTree,
  moveBlockInTree,
  updateBlockInTree,
} from "../block-tree";
import { isBlockHidden, setBlockHidden } from "@/features/builder/lib/block-hidden";
import { containerMaxChildren, isContainerBlock } from "@/features/builder/container-blocks";
import { cn } from "@/lib/utils";
import { useState } from "react";

type TreeProps = {
  blocks: PageBlocks;
  onChange: (blocks: PageBlocks) => void;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onAddToSection?: (sectionId: string) => void;
};

type BlockItemProps = {
  block: BlockNode;
  blocks: PageBlocks;
  onChange: (blocks: PageBlocks) => void;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onAddToSection?: (sectionId: string) => void;
  depth: number;
  index?: number;
  siblings: PageBlocks;
};

function BlockActions({
  block,
  blocks,
  onChange,
  selectedId,
  onSelect,
  siblings,
}: Pick<BlockItemProps, "block" | "blocks" | "onChange" | "selectedId" | "onSelect" | "siblings">) {
  const idx = siblings.findIndex((b) => b.id === block.id);
  const canMoveUp = idx > 0;
  const canMoveDown = idx >= 0 && idx < siblings.length - 1;

  const remove = () => {
    const hasChildren =
      isContainerBlock(block.type) && (block.children?.length ?? 0) > 0;
    const containerLabel = block.type === "rowSection" ? "row section" : "section";
    if (hasChildren && !confirm(`Delete this ${containerLabel} and all its child blocks?`)) return;
    if (!hasChildren && !confirm("Delete this block?")) return;
    onChange(removeBlockFromTree(blocks, block.id));
    if (selectedId === block.id) onSelect(null);
  };

  const duplicate = () => {
    const { blocks: next, newId } = duplicateBlockInTree(blocks, block.id);
    onChange(next);
    if (newId) onSelect(newId);
  };

  const move = (direction: "up" | "down") => {
    onChange(moveBlockInTree(blocks, block.id, direction));
  };

  const hidden = isBlockHidden(block);
  const toggleHidden = () => {
    onChange(
      updateBlockInTree(blocks, block.id, (b) => setBlockHidden(b, !isBlockHidden(b)))
    );
  };

  return (
    <div className="flex items-center gap-0.5 ms-auto shrink-0">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant={hidden ? "secondary" : "ghost"}
            size="sm"
            className="h-7 w-7 p-0"
            onClick={(e) => {
              e.stopPropagation();
              toggleHidden();
            }}
          >
            {hidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          </Button>
        </TooltipTrigger>
        <TooltipContent>{hidden ? "Show block on site" : "Hide block on site"}</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant={selectedId === block.id ? "secondary" : "ghost"}
            size="sm"
            className="h-7 w-7 p-0"
            onClick={(e) => {
              e.stopPropagation();
              onSelect(block.id);
            }}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Edit</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={(e) => {
              e.stopPropagation();
              duplicate();
            }}
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Duplicate</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            disabled={!canMoveUp}
            onClick={(e) => {
              e.stopPropagation();
              move("up");
            }}
          >
            <ArrowUp className="h-3.5 w-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Move up</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            disabled={!canMoveDown}
            onClick={(e) => {
              e.stopPropagation();
              move("down");
            }}
          >
            <ArrowDown className="h-3.5 w-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Move down</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-destructive hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              remove();
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Delete</TooltipContent>
      </Tooltip>
    </div>
  );
}

function SortableBlockItem({
  block,
  blocks,
  onChange,
  selectedId,
  onSelect,
  onAddToSection,
  depth,
  index,
  siblings,
}: BlockItemProps) {
  const [expanded, setExpanded] = useState(true);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: block.id,
  });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const isSelected = selectedId === block.id;
  const hidden = isBlockHidden(block);
  const meta = getBlockMeta(block.type);
  const label = meta?.label ?? block.type;
  const isContainer = isContainerBlock(block.type);
  const maxChildren = isContainer ? containerMaxChildren(block.type, block.props) : null;
  const childCount = block.children?.length ?? 0;
  const atChildCap = maxChildren != null && childCount >= maxChildren;

  return (
    <div ref={setNodeRef} style={style} className={cn("mb-2", isDragging && "opacity-50")}>
      <div
        className={cn(
          "rounded-lg border bg-card overflow-hidden",
          isSelected && "ring-2 ring-primary",
          hidden && "opacity-60 border-dashed",
          depth > 0 && "ms-4"
        )}
      >
        <div
          className={cn(
            "flex items-center gap-2 p-2.5 cursor-pointer",
            hidden ? "bg-muted/50" : "bg-muted/30"
          )}
          onClick={() => onSelect(isSelected ? null : block.id)}
        >
          <button type="button" className="cursor-grab touch-none shrink-0" {...attributes} {...listeners}>
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </button>
          {depth === 0 && index != null && (
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
              {index + 1}
            </span>
          )}
          {isContainer && (
            <button
              type="button"
              className="shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                setExpanded(!expanded);
              }}
            >
              {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
          )}
          <Badge variant="outline" className="text-[10px] shrink-0">
            {block.type === "rowSection" && maxChildren != null
              ? `Row · ${childCount}/${maxChildren} columns`
              : label}
          </Badge>
          {hidden ? (
            <Badge variant="secondary" className="text-[10px] shrink-0">
              Hidden
            </Badge>
          ) : null}
          <BlockActions
            block={block}
            blocks={blocks}
            onChange={onChange}
            selectedId={selectedId}
            onSelect={onSelect}
            siblings={siblings}
          />
        </div>
        {isContainer && expanded && (
          <div className="p-3 border-t bg-muted/10 space-y-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              disabled={atChildCap}
              onClick={() => onAddToSection?.(block.id)}
            >
              <Plus className="h-3 w-3 me-1" />
              {block.type === "rowSection" ? "Add block to column" : "Add block to section"}
            </Button>
            {atChildCap && block.type === "rowSection" && (
              <p className="text-[10px] text-muted-foreground">
                Column limit reached ({maxChildren} max). Increase max columns in settings to add more.
              </p>
            )}
            {block.children && block.children.length > 0 && (
              <NestedBlockList
                blocks={blocks}
                children={block.children}
                onChange={onChange}
                selectedId={selectedId}
                onSelect={onSelect}
                onAddToSection={onAddToSection}
                depth={depth + 1}
                parentBlockId={block.id}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function NestedBlockList({
  blocks,
  children,
  onChange,
  selectedId,
  onSelect,
  onAddToSection,
  depth,
  parentBlockId,
}: {
  blocks: PageBlocks;
  children: PageBlocks;
  onChange: (blocks: PageBlocks) => void;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onAddToSection?: (sectionId: string) => void;
  depth: number;
  parentBlockId: string;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    onChange(reorderInTree(blocks, String(active.id), String(over.id)));
  };

  return (
    <DndContext
      id={`cms-block-tree-nested-${parentBlockId}`}
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={children.map((c) => c.id)} strategy={verticalListSortingStrategy}>
        {children.map((child) => (
          <SortableBlockItem
            key={child.id}
            block={child}
            blocks={blocks}
            onChange={onChange}
            selectedId={selectedId}
            onSelect={onSelect}
            onAddToSection={onAddToSection}
            depth={depth}
            siblings={children}
          />
        ))}
      </SortableContext>
    </DndContext>
  );
}

export function BlockTreeEditor({
  blocks,
  onChange,
  selectedId,
  onSelect,
  onAddToSection,
}: TreeProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    onChange(reorderInTree(blocks, String(active.id), String(over.id)));
  };

  return (
    <DndContext
      id="cms-block-tree-root"
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
        {blocks.map((block, index) => (
          <SortableBlockItem
            key={block.id}
            block={block}
            blocks={blocks}
            onChange={onChange}
            selectedId={selectedId}
            onSelect={onSelect}
            onAddToSection={onAddToSection}
            depth={0}
            index={index}
            siblings={blocks}
          />
        ))}
      </SortableContext>
    </DndContext>
  );
}

export { insertBlockInTree } from "../block-tree";
