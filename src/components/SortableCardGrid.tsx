import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  rectSortingStrategy,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import React from "react";

export function getOrdered<T extends { id: string }>(
  items: T[],
  order?: string[]
): T[] {
  if (!order || order.length === 0) return items;
  const map = new Map(items.map((i) => [i.id, i]));
  const ordered: T[] = [];
  for (const id of order) {
    const item = map.get(id);
    if (item) {
      ordered.push(item);
      map.delete(id);
    }
  }
  for (const item of map.values()) ordered.push(item);
  return ordered;
}

function SortableItem({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
    position: "relative" as const,
  };

  return (
    <div ref={setNodeRef} style={style} className="group">
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing p-1.5 rounded-md hover:bg-muted/80 bg-card/80 backdrop-blur-sm shadow-sm border border-border/50"
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </button>
      {children}
    </div>
  );
}

interface SortableCardGridProps<T extends { id: string }> {
  items: T[];
  onReorder: (ids: string[]) => void;
  className?: string;
  layout?: "grid" | "list";
  renderItem: (item: T) => React.ReactNode;
}

export function SortableCardGrid<T extends { id: string }>({
  items,
  onReorder,
  className = "grid gap-4 md:grid-cols-2",
  layout = "grid",
  renderItem,
}: SortableCardGridProps<T>) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((i) => i.id === String(active.id));
      const newIndex = items.findIndex((i) => i.id === String(over.id));
      const newItems = arrayMove(items, oldIndex, newIndex);
      onReorder(newItems.map((i) => i.id));
    }
  };

  const strategy =
    layout === "list" ? verticalListSortingStrategy : rectSortingStrategy;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={items.map((i) => i.id)}
        strategy={strategy}
      >
        <div className={className}>
          {items.map((item) => (
            <SortableItem key={item.id} id={item.id}>
              {renderItem(item)}
            </SortableItem>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
