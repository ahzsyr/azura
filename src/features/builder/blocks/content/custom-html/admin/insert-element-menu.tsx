"use client";

import { useState, useRef, useEffect } from "react";
import { Plus, ChevronRight, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ELEMENT_MENU_GROUPS, type ElementMenuItem } from "../defaults";

type Props = {
  onInsert: (item: ElementMenuItem) => void;
  label?: string;
  size?: "sm" | "default";
  openUpward?: boolean;
};

export function InsertElementMenu({
  onInsert,
  label = "Add Element",
  size = "sm",
  openUpward = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setExpandedGroup(null);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div ref={ref} className="relative inline-block">
      <Button
        type="button"
        variant="outline"
        size={size}
        className="gap-1.5 text-xs"
        onClick={() => {
          setOpen((v) => !v);
          setExpandedGroup(null);
        }}
      >
        <Plus className="h-3.5 w-3.5" />
        {label}
      </Button>

      {open && (
        <div
          className={`absolute left-0 z-50 w-56 rounded-md border bg-popover shadow-md ${
            openUpward ? "bottom-full mb-1" : "top-full mt-1"
          }`}
        >
          {ELEMENT_MENU_GROUPS.map((group) => (
            <div key={group.label} className="relative border-b last:border-b-0">
              <button
                type="button"
                className="flex w-full items-center justify-between px-3 py-2 text-xs hover:bg-accent"
                onClick={() =>
                  setExpandedGroup(expandedGroup === group.label ? null : group.label)
                }
              >
                <span>{group.label}</span>
                {expandedGroup === group.label ? (
                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-3 w-3 text-muted-foreground" />
                )}
              </button>

              {expandedGroup === group.label && (
                <div className="pb-1">
                  {group.items.map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      className="flex w-full items-center px-5 py-2 text-xs text-left hover:bg-accent"
                      onClick={() => {
                        onInsert(item);
                        setOpen(false);
                        setExpandedGroup(null);
                      }}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
