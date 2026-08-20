"use client";

import {
  cloneElement,
  forwardRef,
  isValidElement,
  useCallback,
  useEffect,
  useState,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from "react";
import { Shapes, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Icon } from "./icon";
import { IconPickerPanel, type IconPickerSelectResult } from "./icon-picker-panel";

type Props = {
  label?: string;
  hint?: string;
  value?: string | null;
  onChange: (iconId: string) => void;
  /** Hidden form field name */
  fieldName?: string;
  trigger?: ReactNode;
  className?: string;
};

export function IconPickerField({
  label = "Icon",
  hint,
  value = "",
  onChange,
  fieldName = "iconId",
  trigger,
  className,
}: Props) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(value ?? "");

  useEffect(() => {
    setSelected(value ?? "");
  }, [value]);

  const handleSelect = useCallback(
    (result: IconPickerSelectResult) => {
      setSelected(result.iconId);
      onChange(result.iconId);
      setOpen(false);
    },
    [onChange],
  );

  const clear = () => {
    setSelected("");
    onChange("");
  };

  const defaultTrigger = (
    <Button type="button" variant="outline" size="sm">
      <Shapes className="h-4 w-4 me-1" />
      {selected ? "Change icon" : "Select icon"}
    </Button>
  );

  const triggerNode =
    trigger && isValidElement(trigger)
      ? cloneElement(trigger as React.ReactElement<{ onClick?: (e: React.MouseEvent) => void }>, {
          onClick: (e: React.MouseEvent) => {
            (trigger as React.ReactElement<{ onClick?: (e: React.MouseEvent) => void }>).props.onClick?.(e);
            if (!e.defaultPrevented) setOpen(true);
          },
        })
      : (
          <span onClick={() => setOpen(true)} role="presentation">
            {defaultTrigger}
          </span>
        );

  return (
    <div className={cn("space-y-2", className)}>
      {label ? <Label>{label}</Label> : null}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      <input type="hidden" name={fieldName} value={selected} readOnly />

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg border bg-muted/30">
          {selected ? (
            <Icon iconId={selected} className="h-5 w-5" />
          ) : (
            <Shapes className="h-5 w-5 text-muted-foreground" aria-hidden />
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {triggerNode}
          {selected ? (
            <Button type="button" variant="ghost" size="sm" onClick={clear}>
              <X className="h-4 w-4 me-1" />
              Clear
            </Button>
          ) : null}
        </div>
        {selected ? (
          <p className="text-[10px] text-muted-foreground font-mono truncate">iconId: {selected}</p>
        ) : null}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="!flex max-w-4xl w-[min(96vw,56rem)] max-h-[85vh] overflow-hidden flex-col gap-4">
          <DialogHeader className="shrink-0 pe-8">
            <DialogTitle>Icon library</DialogTitle>
            <DialogDescription>Select a built-in, custom, or font icon. Stores iconId only.</DialogDescription>
          </DialogHeader>
          <IconPickerPanel
            active={open}
            selectedId={selected || null}
            onSelect={handleSelect}
            className="min-h-0 flex-1"
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

export const IconPickerTriggerButton = forwardRef<
  HTMLButtonElement,
  ComponentPropsWithoutRef<typeof Button> & { label?: string }
>(function IconPickerTriggerButton({ label = "Select icon", children, ...props }, ref) {
  return (
    <Button ref={ref} type="button" variant="outline" size="sm" {...props}>
      <Shapes className="h-4 w-4 me-1" />
      {children ?? label}
    </Button>
  );
});
IconPickerTriggerButton.displayName = "IconPickerTriggerButton";
