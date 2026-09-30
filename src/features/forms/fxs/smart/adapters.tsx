"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { FieldWrapper } from "../fields/FieldWrapper";
import type { FxsValidationPhase } from "../types";

const EMAIL_TYPOS: Record<string, string> = {
  "gmail.con": "gmail.com",
  "gmail.co": "gmail.com",
  "gmal.com": "gmail.com",
  "gmial.com": "gmail.com",
  "yahoo.con": "yahoo.com",
  "hotmal.com": "hotmail.com",
  "outlok.com": "outlook.com",
};

export function suggestEmailDomain(email: string): string | null {
  const at = email.lastIndexOf("@");
  if (at < 1) return null;
  const local = email.slice(0, at);
  const domain = email.slice(at + 1).toLowerCase();
  const fixed = EMAIL_TYPOS[domain];
  if (!fixed) return null;
  return `${local}@${fixed}`;
}

export function SmartEmailInput({
  id,
  label = "Email",
  value,
  onChange,
  onBlur,
  required,
  error,
  phase,
  disabled,
  placeholder = "you@example.com",
}: {
  id?: string;
  label?: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  required?: boolean;
  error?: string | null;
  phase?: FxsValidationPhase;
  disabled?: boolean;
  placeholder?: string;
}) {
  const suggestion = useMemo(() => suggestEmailDomain(value), [value]);
  return (
    <FieldWrapper
      id={id}
      label={label}
      required={required}
      error={error}
      phase={phase}
      hint={suggestion ? undefined : "We'll never share your email."}
    >
      <Input
        id={id}
        type="email"
        autoComplete="email"
        inputMode="email"
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        aria-invalid={Boolean(error)}
      />
      {suggestion ? (
        <button
          type="button"
          className="px-3 pb-2 text-left text-xs text-primary underline-offset-2 hover:underline"
          onClick={() => onChange(suggestion)}
        >
          Did you mean {suggestion}?
        </button>
      ) : null}
    </FieldWrapper>
  );
}

/** Soft phone formatting: preserves leading +, groups remaining digits. */
export function formatPhoneDisplay(raw: string): string {
  const trimmed = raw.trim();
  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return hasPlus ? "+" : "";

  // Keep country-code chunk when number is long and starts with +.
  if (hasPlus && digits.length > 10) {
    const ccLen = digits.length >= 12 ? 3 : digits.length >= 11 ? 2 : 1;
    const cc = digits.slice(0, ccLen);
    const rest = digits.slice(ccLen);
    const parts = [rest.slice(0, 3), rest.slice(3, 6), rest.slice(6)].filter(Boolean);
    return `+${cc} ${parts.join(" ")}`.trim();
  }

  const parts = [digits.slice(0, 3), digits.slice(3, 6), digits.slice(6)].filter(Boolean);
  return `${hasPlus ? "+" : ""}${parts.join(" ")}`;
}

export function SmartPhoneInput({
  id,
  label = "Phone",
  value,
  onChange,
  onBlur,
  required,
  error,
  phase,
  disabled,
  placeholder = "+971 50 123 4567",
}: {
  id?: string;
  label?: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  required?: boolean;
  error?: string | null;
  phase?: FxsValidationPhase;
  disabled?: boolean;
  placeholder?: string;
}) {
  return (
    <FieldWrapper id={id} label={label} required={required} error={error} phase={phase}>
      <Input
        id={id}
        type="tel"
        autoComplete="tel"
        inputMode="tel"
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(e) => onChange(formatPhoneDisplay(e.target.value))}
        onBlur={onBlur}
        aria-invalid={Boolean(error)}
      />
    </FieldWrapper>
  );
}

const DEFAULT_COUNTRIES = [
  { value: "AE", label: "United Arab Emirates" },
  { value: "SA", label: "Saudi Arabia" },
  { value: "US", label: "United States" },
  { value: "GB", label: "United Kingdom" },
  { value: "IN", label: "India" },
  { value: "DE", label: "Germany" },
  { value: "FR", label: "France" },
  { value: "SG", label: "Singapore" },
];

export function SmartCountrySelect({
  id,
  label = "Country",
  value,
  onChange,
  onBlur,
  required,
  error,
  phase,
  disabled,
  options = DEFAULT_COUNTRIES,
  favorites = ["AE", "SA", "US"],
}: {
  id?: string;
  label?: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  required?: boolean;
  error?: string | null;
  phase?: FxsValidationPhase;
  disabled?: boolean;
  options?: Array<{ value: string; label: string }>;
  favorites?: string[];
}) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = !q
      ? options
      : options.filter(
          (o) => o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q),
        );
    return [...list].sort((a, b) => {
      const af = favorites.includes(a.value) ? 0 : 1;
      const bf = favorites.includes(b.value) ? 0 : 1;
      return af - bf || a.label.localeCompare(b.label);
    });
  }, [options, query, favorites]);

  return (
    <FieldWrapper id={id} label={label} required={required} error={error} phase={phase}>
      <Input
        type="search"
        value={query}
        placeholder="Search countries…"
        disabled={disabled}
        onChange={(e) => setQuery(e.target.value)}
        className="border-0 border-b border-border/60 shadow-none focus-visible:ring-0"
        aria-label={`${label} search`}
      />
      <select
        id={id}
        className="h-11 w-full bg-transparent px-3 text-sm outline-none"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        aria-invalid={Boolean(error)}
      >
        <option value="">Select…</option>
        {filtered.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </FieldWrapper>
  );
}

const COMPANY_SUGGESTIONS = [
  "Acme Corp",
  "Globex",
  "Initech",
  "Umbrella",
  "Stark Industries",
];

export function SmartCompanyInput({
  id,
  label = "Company",
  value,
  onChange,
  onBlur,
  required,
  error,
  phase,
  disabled,
  suggestions = COMPANY_SUGGESTIONS,
}: {
  id?: string;
  label?: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  required?: boolean;
  error?: string | null;
  phase?: FxsValidationPhase;
  disabled?: boolean;
  suggestions?: string[];
}) {
  const matches = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (q.length < 2) return [];
    return suggestions.filter((s) => s.toLowerCase().includes(q)).slice(0, 5);
  }, [value, suggestions]);

  return (
    <FieldWrapper id={id} label={label} required={required} error={error} phase={phase}>
      <Input
        id={id}
        type="text"
        autoComplete="organization"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        list={id ? `${id}-companies` : undefined}
        aria-invalid={Boolean(error)}
      />
      {id ? (
        <datalist id={`${id}-companies`}>
          {matches.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      ) : null}
    </FieldWrapper>
  );
}
