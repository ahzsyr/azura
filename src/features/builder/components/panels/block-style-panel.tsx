"use client";

import type { BlockNode } from "@/types/builder";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BlockStyleLayoutPanel } from "./block-style-layout-panel";
import { BlockStyleTypographyPanel } from "./block-style-typography-panel";
import { BlockStyleColorsPanel } from "./block-style-colors-panel";
import { BlockStyleAdvancedPanel } from "./block-style-advanced-panel";

type Props = {
  block: BlockNode;
  onChange: (block: BlockNode) => void;
};

export function BlockStylePanel({ block, onChange }: Props) {
  return (
    <Tabs defaultValue="layout" className="w-full">
      <TabsList className="grid w-full grid-cols-4 h-auto">
        <TabsTrigger value="layout" className="text-xs px-2">
          Layout
        </TabsTrigger>
        <TabsTrigger value="typography" className="text-xs px-2">
          Type
        </TabsTrigger>
        <TabsTrigger value="colors" className="text-xs px-2">
          Colors
        </TabsTrigger>
        <TabsTrigger value="advanced" className="text-xs px-2">
          More
        </TabsTrigger>
      </TabsList>
      <TabsContent value="layout" className="pt-3">
        <BlockStyleLayoutPanel block={block} onChange={onChange} />
      </TabsContent>
      <TabsContent value="typography" className="pt-3">
        <BlockStyleTypographyPanel block={block} onChange={onChange} />
      </TabsContent>
      <TabsContent value="colors" className="pt-3">
        <BlockStyleColorsPanel block={block} onChange={onChange} />
      </TabsContent>
      <TabsContent value="advanced" className="pt-3">
        <BlockStyleAdvancedPanel block={block} onChange={onChange} />
      </TabsContent>
    </Tabs>
  );
}
