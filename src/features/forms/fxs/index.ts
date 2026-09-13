/**
 * Form Experience System (FXS)
 * Presentation + interaction layer between Schema Runtime and UI components.
 * Does not own submission / business logic.
 */

export type * from "./types";
export * from "./feature-flags";

export { FormShell } from "./core/FormShell";
export { FormExperience } from "./core/FormExperience";
export { FormSectionCard, LayoutEngine, useCollapsibleFields } from "./core/LayoutEngine";
export type { FieldWidth, LayoutColumn, LayoutRow, LayoutSection } from "./core/LayoutEngine";
export { FxsThemeProvider, useFxsTheme } from "./core/ThemeProvider";
export { resolveFxsTheme, fxsThemeToCssVars, FXS_THEME_PRESETS } from "./core/theme-tokens";
export type { FxsThemeTokens } from "./core/theme-tokens";

export { FieldWrapper } from "./fields/FieldWrapper";
export { FxsLabel, FxsHint, RequiredBadge, ValidationMessage } from "./fields/atoms";

export {
  reduceFieldValidation,
  initialFieldValidationState,
  shouldShowFieldError,
  shouldShowFieldSuccess,
  escalateErrorsOnSubmit,
  firstInvalidFieldId,
} from "./validation/ValidationStateMachine";
export type {
  FieldValidationState,
  ValidationEvent,
  FormValidationMap,
} from "./validation/ValidationStateMachine";
export { ErrorSummary, errorsToSummaryItems } from "./validation/ErrorSummary";
export { useFocusManager, focusFieldById } from "./validation/FocusManager";

export { StickyActions } from "./interaction/StickyActions";
export { FormProgress } from "./interaction/Progress";
export { LiveSummary } from "./interaction/LiveSummary";
export { SuccessConfirmation, SubmitErrorBanner } from "./interaction/SuccessConfirmation";
export { SidebarNav } from "./interaction/SidebarNav";
export { ConversationalView } from "./interaction/ConversationalView";
export { ReviewSummary } from "./interaction/ReviewSummary";

export { UploadDropzone } from "./uploads/UploadDropzone";
export type { UploadFileItem } from "./uploads/UploadDropzone";

export {
  SmartEmailInput,
  SmartPhoneInput,
  SmartCountrySelect,
  SmartCompanyInput,
  suggestEmailDomain,
  formatPhoneDisplay,
} from "./smart/adapters";

export {
  FXS_TEMPLATE_CATALOG,
  listTemplatesByFamily,
  getFxsTemplate,
  defaultThemeForFamily,
} from "./templates/catalog";
export type { FxsTemplateDefinition, FxsTemplateFamily } from "./templates/catalog";

export { prefersReducedMotion, ProgressiveReveal, FXS_MOTION_MS } from "./a11y/motion";
export { fxsAnnounce } from "./a11y/announce";

export {
  dynamicFormAppearanceSchema,
  appearanceToCssVars,
} from "./appearance/dynamic-form-appearance";
export type { DynamicFormAppearance } from "./appearance/dynamic-form-appearance";
export { DynamicFormAppearanceFields } from "./appearance/DynamicFormAppearanceFields";
