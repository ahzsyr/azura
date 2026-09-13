import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type RowSectionViewProps = {
  maxColumns: number;
  columnLayout: string;
  gap: string;
  stackOnMobile: boolean;
  verticalAlign: string;
  children: ReactNode;
  className?: string;
};

function gapClass(gap: string): string {
  if (gap === "sm") return "row-section-grid--gap-sm";
  if (gap === "lg") return "row-section-grid--gap-lg";
  return "row-section-grid--gap-md";
}

function alignClass(verticalAlign: string): string {
  if (verticalAlign === "start") return "row-section-grid--align-start";
  if (verticalAlign === "center") return "row-section-grid--align-center";
  return "row-section-grid--align-stretch";
}

export function RowSectionView({
  maxColumns,
  columnLayout,
  gap,
  stackOnMobile,
  verticalAlign,
  children,
  className,
}: RowSectionViewProps) {
  return (
    <div
      className={cn(
        "row-section-grid",
        gapClass(gap),
        alignClass(verticalAlign),
        stackOnMobile && "row-section-grid--stack-mobile",
        className
      )}
      data-column-layout={columnLayout}
      data-max-columns={maxColumns}
    >
      {children}
    </div>
  );
}
