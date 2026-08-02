import type { ReactNode } from "react";

/** Layout modes for the form shell. */
export type FxsLayoutMode =
  | "default"
  | "stacked"
  | "inline"
  | "twoColumn"
  | "responsiveGrid"
  | "sectionCard"
  | "split"
  | "wizard"
  | "conversational"
  | "sidebar"
  | "review"
  | "centered"
  | "compact";

/** Two-column ratio presets. */
export type FxsColumnRatio = "50/50" | "40/60" | "60/40" | "30/70" | "70/30";

/** Section visual style. */
export type FxsSectionStyle = "card" | "flat" | "bordered" | "filled" | "collapsible" | "accordion";

/** Field width hint for inline/grid layouts. */
export type FxsFieldWidth = "auto" | "sm" | "md" | "lg" | "full" | "half" | "third" | "quarter";

/** Responsive column config for responsiveGrid layout. */
export type FxsResponsiveColumns = {
  mobile?: number;
  tablet?: number;
  desktop?: number;
};

/** Theme presets (token packs). */
export type FxsThemePreset = "minimal" | "modern" | "enterprise" | "conversational";

/** Field presentation mode. */
export type FxsFieldMode = "classic" | "floating" | "filled" | "outlined" | "underline";

/** Progress indicator style for multi-step. */
export type FxsProgressStyle = "bar" | "steps" | "dots" | "breadcrumb" | "sidebar";

/** Field validation UX phase. */
export type FxsValidationPhase =
  | "idle"
  | "typing"
  | "dirty"
  | "blurred"
  | "validated"
  | "submitted";

export type FxsTrustItem = {
  id: string;
  label: string;
};

export type FxsSidebarSection = {
  id: string;
  title: string;
  completed?: boolean;
  active?: boolean;
};

export type FxsShellConfig = {
  title?: string;
  description?: string;
  trustItems?: FxsTrustItem[];
  formSectionTitle?: string;
  sidebarSections?: FxsSidebarSection[];
  estimatedMinutes?: number;
  layoutMode?: FxsLayoutMode;
  theme?: FxsThemePreset;
  fieldMode?: FxsFieldMode;
  showHero?: boolean;
  heroAside?: ReactNode;
  columnRatio?: FxsColumnRatio;
  sectionStyle?: FxsSectionStyle;
  responsiveColumns?: FxsResponsiveColumns;
};

export type FxsSectionConfig = {
  id: string;
  title?: string;
  description?: string;
  icon?: ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
  style?: FxsSectionStyle;
  fieldIds?: string[];
};

export type FxsStickyActionsConfig = {
  primaryLabel: string;
  secondaryLabel?: string;
  backLabel?: string;
  draftLabel?: string;
  loading?: boolean;
  disabled?: boolean;
  showBack?: boolean;
  showDraft?: boolean;
  showCancel?: boolean;
  onPrimary?: () => void;
  onSecondary?: () => void;
  onBack?: () => void;
  onDraft?: () => void;
  onCancel?: () => void;
};

export type FxsSummaryItem = {
  id: string;
  label: string;
  value: string;
};

export type FxsExperienceConfig = FxsShellConfig & {
  progressStyle?: FxsProgressStyle;
  enableLiveSummary?: boolean;
  enableSmartInputs?: boolean;
  enableEnhancedUpload?: boolean;
  enableErrorSummary?: boolean;
  successTitle?: string;
  successDescription?: string;
  estimatedResponse?: string;
};
