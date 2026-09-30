"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  id?: string;
  name?: string;
  label?: string;
  description?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (v: string) => void;
  placeholder?: string;
  minLength?: number;
  autoComplete?: string;
  required?: boolean;
  className?: string;
};

/** Password input with show/hide toggle. Controlled or uncontrolled. */
export function PasswordField({
  label,
  description,
  value,
  defaultValue,
  onChange,
  placeholder,
  id,
  name,
  minLength,
  autoComplete,
  required,
  className,
}: Props) {
  const [visible, setVisible] = useState(false);
  const inputId = id ?? name ?? "password";

  return (
    <div className={cn("space-y-1.5", className)}>
      {label ? <Label htmlFor={inputId}>{label}</Label> : null}
      {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
      <div className="relative">
        <Input
          id={inputId}
          name={name}
          type={visible ? "text" : "password"}
          placeholder={placeholder}
          value={value}
          defaultValue={defaultValue}
          minLength={minLength}
          autoComplete={autoComplete}
          required={required}
          className="pe-10"
          onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute end-0 top-0 h-full px-3 hover:bg-transparent"
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          onClick={() => setVisible((v) => !v)}
        >
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </Button>
      </div>
    </div>
  );
}
