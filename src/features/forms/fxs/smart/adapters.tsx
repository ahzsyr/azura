"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { FieldWrapper } from "../fields/FieldWrapper";
import { CredentialChecks, useCredentialCheck } from "@/components/security/credential-checks";
import type { FxsValidationPhase } from "../types";
import {
  PHONE_COUNTRIES,
  caretAfterDigits,
  countryFlag,
  detectCountryFromValue,
  detectSessionCountryCode,
  fallbackPhoneCountry,
  findPhoneCountry,
  formatNationalDigits,
  isValidNationalNumber,
  nationalPlaceholder,
  normalizeNationalDigits,
  stripTrunkPrefix,
  type PhoneCountry,
} from "./phone-countries";

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
  const credentialCheck = useCredentialCheck({ email: value });
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
      <CredentialChecks email={value} check={credentialCheck} />
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

export function isValidPhoneForCountry(value: string, countryCode?: string): boolean {
  const country = findPhoneCountry(countryCode) ?? detectCountryFromValue(value) ?? fallbackPhoneCountry();
  return isValidNationalNumber(country, normalizeNationalDigits(value, country));
}

const subscribeToSessionCountry = () => () => {};
const getServerSessionCountry = () => null;

/**
 * Country calling-code trigger. The native `<select>` is transparent and covers
 * the trigger so the closed state can stay compact (`flag + dial`) while the
 * opened list shows every country by name — no dependency on platform emoji.
 */
function CountryCodeSelect({
  country,
  disabled,
  onSelect,
  className,
}: {
  country: PhoneCountry;
  disabled?: boolean;
  onSelect: (country: PhoneCountry) => void;
  className?: string;
}) {
  return (
    <div
      className={cn("relative flex h-full items-center text-sm", className)}
      title={`${country.name} (${country.dial})`}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none flex items-center gap-1 whitespace-nowrap leading-none"
        dir="ltr"
      >
        <span className="text-base leading-none">{countryFlag(country.code)}</span>
        <span>{country.dial}</span>
      </span>
      <ChevronDown className="pointer-events-none absolute end-2 size-4 text-muted-foreground" aria-hidden />
      <select
        aria-label="Country calling code"
        className="absolute inset-0 h-full w-full cursor-pointer appearance-none bg-transparent text-transparent opacity-0 outline-none disabled:cursor-not-allowed"
        value={country.code}
        disabled={disabled}
        onChange={(event) => {
          const next = findPhoneCountry(event.target.value);
          if (next) onSelect(next);
        }}
      >
        {PHONE_COUNTRIES.map((item) => (
          <option
            key={item.code}
            value={item.code}
            style={{ color: "var(--popover-foreground)", backgroundColor: "var(--popover)" }}
          >
            {`${countryFlag(item.code)} ${item.name} (${item.dial})`}
          </option>
        ))}
      </select>
    </div>
  );
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
  placeholder,
  controlClassName,
  hideLabel,
  variant = "fxs",
  defaultCountry,
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
  controlClassName?: string;
  hideLabel?: boolean;
  /**
   * `fxs` uses the FXS field chrome (floating labels, themed borders).
   * `plain` matches the admin `Input` + `Label` pair used by email fields.
   */
  variant?: "fxs" | "plain";
  /** Country for an empty field, e.g. the visitor's session country. */
  defaultCountry?: string | null;
}) {
  const fallbackCountry = findPhoneCountry(defaultCountry) ?? fallbackPhoneCountry();
  const valueCountry = detectCountryFromValue(value);
  const [manualCode, setManualCode] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pendingCaretDigits = useRef<number | null>(null);
  // Session location is a client-only hint (browser time zone), so it is read
  // through useSyncExternalStore to keep SSR and hydration deterministic.
  const sessionCountry = useSyncExternalStore(
    subscribeToSessionCountry,
    detectSessionCountryCode,
    getServerSessionCountry,
  );

  // Saved data always wins: the select follows the dialling code stored in the
  // value. Empty fields fall back to the last selection, the caller's country,
  // the session location, then the site default.
  const country =
    valueCountry ??
    findPhoneCountry(manualCode) ??
    findPhoneCountry(defaultCountry) ??
    findPhoneCountry(sessionCountry) ??
    fallbackCountry;
  const nationalDigits = normalizeNationalDigits(value, country);
  const formattedNational = formatNationalDigits(country, nationalDigits);
  const resolvedPlaceholder = placeholder ?? nationalPlaceholder(country);
  const maxNationalLength = country.lengths?.length ? Math.max(...country.lengths) : 15;
  const showValidationError =
    Boolean(nationalDigits) &&
    (nationalDigits.length >= maxNationalLength || phase === "blurred" || phase === "submitted") &&
    !isValidNationalNumber(country, nationalDigits);
  const resolvedError = error ?? (showValidationError ? `Enter a valid ${country.name} mobile or landline number.` : null);

  // Restore the caret after re-formatting groups while typing.
  useEffect(() => {
    const input = inputRef.current;
    if (!input || pendingCaretDigits.current == null) return;
    const position = caretAfterDigits(input.value, pendingCaretDigits.current);
    input.setSelectionRange(position, position);
    pendingCaretDigits.current = null;
  }, [value]);

  const commitDigits = (digits: string) => {
    onChange(digits ? `${country.dial} ${digits}` : "");
  };

  const handleSelectCountry = (next: PhoneCountry) => {
    setManualCode(next.code);
    if (nationalDigits) {
      onChange(`${next.dial} ${nationalDigits}`);
    } else if (value) {
      onChange("");
    }
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const target = event.target;
    const caret = target.selectionStart ?? target.value.length;
    const digitsBeforeCaret = target.value.slice(0, caret).replace(/\D/g, "").length;
    let digits = target.value.replace(/\D/g, "");

    // Accept pasted international numbers (e.g. +971 55 107 4977) in the national box.
    const dialDigits = country.dial.slice(1);
    const maxLength = country.lengths?.length ? Math.max(...country.lengths) : 15;
    if (digits.startsWith(dialDigits) && digits.length > maxLength) {
      digits = digits.slice(dialDigits.length);
    }
    digits = stripTrunkPrefix(country, digits);

    pendingCaretDigits.current = Math.min(digitsBeforeCaret, digits.length);
    commitDigits(digits);
  };

  const phoneInput = (
    <Input
      ref={inputRef}
      id={id}
      type="tel"
      dir="ltr"
      autoComplete="tel-national"
      inputMode="tel"
      value={formattedNational}
      disabled={disabled}
      placeholder={resolvedPlaceholder}
      onChange={handleInputChange}
      onBlur={onBlur}
      aria-invalid={Boolean(resolvedError)}
    />
  );

  if (variant === "plain") {
    return (
      <div className={cn("space-y-2", controlClassName)}>
        {!hideLabel && label ? (
          <Label htmlFor={id}>
            {label}
            {required ? <span className="text-destructive"> *</span> : null}
          </Label>
        ) : null}

        <div
          className={cn(
            "flex h-12 min-h-11 w-full items-stretch overflow-hidden rounded-lg border bg-[var(--admin-input-bg)] shadow-sm transition-[border-color,box-shadow,background-color] duration-150",
            "border-[var(--admin-border)] hover:border-ring/40 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-0",
            resolvedError && "border-destructive focus-within:ring-destructive/30",
            disabled && "cursor-not-allowed opacity-50",
          )}
        >
          <CountryCodeSelect
            country={country}
            disabled={disabled}
            onSelect={handleSelectCountry}
            className="w-[8.5rem] shrink-0 border-e border-[var(--admin-border)] ps-3 pe-8"
          />
          <Input
            ref={inputRef}
            id={id}
            type="tel"
            dir="ltr"
            autoComplete="tel-national"
            inputMode="tel"
            value={formattedNational}
            disabled={disabled}
            placeholder={resolvedPlaceholder}
            onChange={handleInputChange}
            onBlur={onBlur}
            aria-invalid={Boolean(resolvedError)}
            className="h-full min-h-0 min-w-0 flex-1 rounded-none border-0 bg-transparent px-3 py-0 text-sm shadow-none focus-visible:ring-0"
          />
        </div>

        {resolvedError ? <p className="text-xs text-destructive">{resolvedError}</p> : null}
      </div>
    );
  }

  return (
    <FieldWrapper
      id={id}
      label={label}
      required={required}
      error={resolvedError}
      phase={phase}
      className={controlClassName}
      hideLabel={hideLabel}
      leading={
        <CountryCodeSelect
          country={country}
          disabled={disabled}
          onSelect={handleSelectCountry}
          className="w-[8.5rem] pe-6"
        />
      }
    >
      {phoneInput}
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
