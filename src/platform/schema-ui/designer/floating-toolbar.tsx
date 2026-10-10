"use client";

import type { ReactNode } from "react";
import { Rows3, LayoutGrid } from "lucide-react";

export function FloatingToolbar({
  visible,
  onWrapSection,
  onWrapGrid,
}: {
  visible: boolean;
  onWrapSection: () => void;
  onWrapGrid: () => void;
}) {
  if (!visible) return null;
  return (
    <div className="sticky top-0 z-20 mb-3 flex flex-wrap items-center gap-1 rounded-md border border-[#E5E7EB] bg-white px-2 py-1">
      <span className="me-1 border-e border-[#E5E7EB] pe-2 text-[12px] font-medium text-gray-500">Structure</span>
      <ToolBtn onClick={onWrapSection} icon={<Rows3 className="h-3.5 w-3.5" />} label="Wrap" />
      <ToolBtn onClick={onWrapGrid} icon={<LayoutGrid className="h-3.5 w-3.5" />} label="Grid" />
    </div>
  );
}

function ToolBtn({
  onClick,
  icon,
  label,
}: {
  onClick: () => void;
  icon: ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[12px] font-medium text-gray-700 hover:bg-gray-50"
      onClick={onClick}
    >
      {icon}
      {label}
    </button>
  );
}
