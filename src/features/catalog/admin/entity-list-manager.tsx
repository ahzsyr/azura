"use client";

import Link from "next/link";
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
  rectSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, ImageIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import type { CatalogListItem } from "@/features/catalog/types";
import { AdminCardGrid } from "@/components/admin/layout/admin-content-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useClientMounted } from "@/hooks/use-client-mounted";
import { cn } from "@/lib/utils";

type EntityListManagerProps = {
  items: CatalogListItem[];
  onReorder: (ids: string[]) => Promise<void>;
  /** When provided, drag-end stages the new order locally via this callback instead of persisting immediately. */
  onStagedReorder?: (reordered: CatalogListItem[]) => void;
  onTogglePublished: (id: string, isPublished: boolean) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  emptyMessage?: string;
  /** Tailwind aspect-ratio class applied to card cover images, e.g. "aspect-video" or "aspect-square". Defaults to "aspect-video". */
  imageAspectClass?: string;
};

type CardActionsProps = {
  item: CatalogListItem;
  imageAspectClass?: string;
  onTogglePublished: (id: string, isPublished: boolean) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
};

function EntityListCardBody({
  item,
  dragHandle,
  imageAspectClass = "aspect-video",
}: {
  item: CatalogListItem;
  dragHandle?: React.ReactNode;
  imageAspectClass?: string;
}) {
  return (
    <>
      <div className={cn("relative bg-muted", imageAspectClass)}>
        {item.thumbnailUrl ? (
          <img src={item.thumbnailUrl} alt={item.titleEn} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <ImageIcon className="h-10 w-10 opacity-40" />
          </div>
        )}
        {dragHandle}
      </div>

      <div className="space-y-3 p-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-medium">{item.titleEn}</h3>
            {!item.isPublished && (
              <Badge variant="secondary" className="text-[10px]">
                Hidden
              </Badge>
            )}
            {item.badge && (
              <Badge variant="outline" className="text-[10px]">
                {item.badge}
              </Badge>
            )}
          </div>
          {item.meta && <p className="mt-1 text-xs text-muted-foreground">{item.meta}</p>}
          {item.subtitle && <p className="mt-1 text-sm text-muted-foreground">{item.subtitle}</p>}
        </div>
      </div>
    </>
  );
}

function EntityListCardActions({ item, onTogglePublished, onDelete }: CardActionsProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-wrap gap-2 px-4 pb-4">
      <Button asChild size="sm" variant="outline">
        <Link href={item.editHref}>Edit</Link>
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            await onTogglePublished(item.id, !item.isPublished);
            router.refresh();
          })
        }
      >
        {item.isPublished ? "Hide" : "Show"}
      </Button>
      <Button
        type="button"
        size="sm"
        variant="destructive"
        disabled={pending}
        onClick={() => {
          if (!confirm(`Delete "${item.titleEn}"?`)) return;
          startTransition(async () => {
            await onDelete(item.id);
            router.refresh();
          });
        }}
      >
        Delete
      </Button>
    </div>
  );
}

function StaticListCard(props: CardActionsProps) {
  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <EntityListCardBody item={props.item} imageAspectClass={props.imageAspectClass} />
      <EntityListCardActions {...props} />
    </div>
  );
}

function SortableListCard(props: CardActionsProps) {
  const { item } = props;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });
  const style = { transform: CSS.Transform.toString(transform), transition };

  const dragHandle = (
    <button
      type="button"
      className="absolute start-2 top-2 cursor-grab touch-none rounded-md bg-background/80 p-1"
      {...attributes}
      {...listeners}
      aria-label="Drag to reorder"
    >
      <GripVertical className="h-4 w-4" />
    </button>
  );

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn("rounded-xl border bg-card overflow-hidden", isDragging && "opacity-50")}
    >
      <EntityListCardBody item={item} dragHandle={dragHandle} imageAspectClass={props.imageAspectClass} />
      <EntityListCardActions {...props} />
    </div>
  );
}

export function EntityListManager({
  items,
  onReorder,
  onStagedReorder,
  onTogglePublished,
  onDelete,
  emptyMessage = "No items yet.",
  imageAspectClass,
}: EntityListManagerProps) {
  const mounted = useClientMounted();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const reordered = arrayMove(items, oldIndex, newIndex);
    if (onStagedReorder) {
      onStagedReorder(reordered);
    } else {
      startTransition(async () => {
        await onReorder(reordered.map((i) => i.id));
        router.refresh();
      });
    }
  };

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  const cardProps = { onTogglePublished, onDelete, imageAspectClass };

  if (!mounted) {
    return (
      <AdminCardGrid columns={3}>
        {items.map((item) => (
          <StaticListCard key={item.id} item={item} {...cardProps} />
        ))}
      </AdminCardGrid>
    );
  }

  return (
    <DndContext
      id="catalog-entity-list"
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={items.map((i) => i.id)} strategy={rectSortingStrategy}>
        <AdminCardGrid columns={3} className={cn(pending && "opacity-70")}>
          {items.map((item) => (
            <SortableListCard key={item.id} item={item} {...cardProps} />
          ))}
        </AdminCardGrid>
      </SortableContext>
    </DndContext>
  );
}
