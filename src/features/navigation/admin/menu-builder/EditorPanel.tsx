"use client";

import type { ReactNode } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type EditorToolTab = "edit" | "quickAdd" | "templates" | "health";

type Props = {
  value: EditorToolTab;
  onChange: (next: EditorToolTab) => void;
  edit: ReactNode;
  quickAdd: ReactNode;
  templates: ReactNode;
  health: ReactNode;
};

/** Tool tabs: Edit Item / Quick Add / Templates / Health (not item-editing sections). */
export function EditorPanel({ value, onChange, edit, quickAdd, templates, health }: Props) {
  return (
    <Tabs
      value={value}
      onValueChange={(v) => onChange(v as EditorToolTab)}
      className="mb-editor-panel flex min-h-0 flex-col"
    >
      <TabsList className="mb-editor-tabs h-auto w-full flex-wrap justify-start gap-1">
        <TabsTrigger value="edit" className="text-xs">
          Edit Item
        </TabsTrigger>
        <TabsTrigger value="quickAdd" className="text-xs">
          Quick Add
        </TabsTrigger>
        <TabsTrigger value="templates" className="text-xs">
          Templates
        </TabsTrigger>
        <TabsTrigger value="health" className="text-xs">
          Health
        </TabsTrigger>
      </TabsList>
      <TabsContent value="edit" className="mt-3 min-h-0 focus-visible:ring-0">
        {edit}
      </TabsContent>
      <TabsContent value="quickAdd" className="mt-3 focus-visible:ring-0">
        {quickAdd}
      </TabsContent>
      <TabsContent value="templates" className="mt-3 focus-visible:ring-0">
        {templates}
      </TabsContent>
      <TabsContent value="health" className="mt-3 focus-visible:ring-0">
        {health}
      </TabsContent>
    </Tabs>
  );
}
