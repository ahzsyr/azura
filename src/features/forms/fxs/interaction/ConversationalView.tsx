"use client";

import { SchemaRenderer } from "@/platform/schema-ui/layout/schema-renderer";
import type { SchemaDocument } from "@/platform/schema-ui/schema/schema-document";
import type { SchemaRuntime } from "@/platform/schema-ui/runtime/schema-runtime";
import { FormProgress } from "./Progress";

export function ConversationalView({
  document,
  schemaId,
  locale,
  runtime,
  errors,
  currentBindingId,
  currentIndex,
  total,
  onBindingChange,
}: {
  document: SchemaDocument;
  schemaId: string;
  locale: string;
  runtime: SchemaRuntime;
  errors?: Record<string, string>;
  currentBindingId: string;
  currentIndex: number;
  total: number;
  onBindingChange?: () => void;
}) {
  const singleFieldDocument: SchemaDocument = {
    ...document,
    nodes: [{ kind: "binding", bindingId: currentBindingId }],
  };

  return (
    <div className="space-y-6">
      <FormProgress step={currentIndex} total={total} style="dots" />
      <div className="fxs-conversational-field space-y-4">
        <SchemaRenderer
          document={singleFieldDocument}
          schemaId={schemaId}
          locale={locale}
          runtime={runtime}
          errors={errors}
          visibleBindingIds={new Set([currentBindingId])}
          onBindingChange={() => onBindingChange?.()}
        />
      </div>
    </div>
  );
}
