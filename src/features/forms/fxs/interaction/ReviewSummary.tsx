"use client";

import { Button } from "@/components/ui/button";
import { FormSectionCard } from "../core/LayoutEngine";

type ReviewSection = {
  id: string;
  title: string;
  items: Array<{ id: string; label: string; value: string }>;
  stepIndex?: number;
};

export function ReviewSummary({
  sections,
  onEditSection,
}: {
  sections: ReviewSection[];
  onEditSection?: (stepIndex: number) => void;
}) {
  return (
    <div className="space-y-4">
      {sections.map((section) => (
        <FormSectionCard
          key={section.id}
          config={{ id: section.id, title: section.title, style: "bordered" }}
        >
          <div className="space-y-3">
            {typeof section.stepIndex === "number" && onEditSection ? (
              <div className="flex justify-end">
                <Button type="button" variant="ghost" size="sm" onClick={() => onEditSection(section.stepIndex!)}>
                  Edit
                </Button>
              </div>
            ) : null}
            {section.items.map((item) => (
              <div key={item.id} className="grid gap-1 sm:grid-cols-[minmax(10rem,12rem)_1fr] sm:gap-3">
                <div className="text-sm font-medium text-foreground">{item.label}</div>
                <div className="text-sm text-muted-foreground break-words">{item.value}</div>
              </div>
            ))}
          </div>
        </FormSectionCard>
      ))}
    </div>
  );
}
