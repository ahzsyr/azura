import type { FxsValidationPhase } from "../types";

export type FieldValidationState = {
  phase: FxsValidationPhase;
  error: string | null;
  success: string | null;
  touched: boolean;
  dirty: boolean;
};

export type ValidationEvent =
  | { type: "FOCUS" }
  | { type: "CHANGE" }
  | { type: "BLUR"; error?: string | null; success?: string | null }
  | { type: "VALIDATE"; error?: string | null; success?: string | null }
  | { type: "SUBMIT"; error?: string | null }
  | { type: "RESET" };

export const initialFieldValidationState = (): FieldValidationState => ({
  phase: "idle",
  error: null,
  success: null,
  touched: false,
  dirty: false,
});

/**
 * Validation UX state machine.
 * Neutral while typing; validate on blur; escalate remaining errors on submit.
 */
export function reduceFieldValidation(
  state: FieldValidationState,
  event: ValidationEvent,
): FieldValidationState {
  switch (event.type) {
    case "FOCUS":
      return {
        ...state,
        phase: state.dirty ? "typing" : "idle",
        // Don't show prior errors until blur/submit unless already submitted
        error: state.phase === "submitted" ? state.error : null,
      };
    case "CHANGE":
      return {
        ...state,
        dirty: true,
        phase: "typing",
        // Clear aggressive errors while typing unless form already submitted
        error: state.phase === "submitted" ? state.error : null,
        success: null,
      };
    case "BLUR": {
      const error = event.error ?? null;
      const success = !error ? event.success ?? (state.dirty ? "Looks good" : null) : null;
      return {
        ...state,
        touched: true,
        phase: "blurred",
        error,
        success,
      };
    }
    case "VALIDATE": {
      const error = event.error ?? null;
      return {
        ...state,
        phase: "validated",
        error,
        success: !error ? event.success ?? "Looks good" : null,
        touched: true,
      };
    }
    case "SUBMIT":
      return {
        ...state,
        phase: "submitted",
        touched: true,
        error: event.error ?? state.error,
        success: event.error ? null : state.success,
      };
    case "RESET":
      return initialFieldValidationState();
    default:
      return state;
  }
}

export function shouldShowFieldError(state: FieldValidationState): boolean {
  if (!state.error) return false;
  return (
    state.phase === "blurred" ||
    state.phase === "validated" ||
    state.phase === "submitted"
  );
}

export function shouldShowFieldSuccess(state: FieldValidationState): boolean {
  if (state.error || !state.success) return false;
  return state.phase === "blurred" || state.phase === "validated";
}

export type FormValidationMap = Record<string, FieldValidationState>;

export function escalateErrorsOnSubmit(
  map: FormValidationMap,
  errors: Record<string, string>,
): FormValidationMap {
  const next: FormValidationMap = { ...map };
  for (const [fieldId, message] of Object.entries(errors)) {
    const prev = next[fieldId] ?? initialFieldValidationState();
    next[fieldId] = reduceFieldValidation(prev, { type: "SUBMIT", error: message });
  }
  return next;
}

export function firstInvalidFieldId(
  errors: Record<string, string>,
  order?: string[],
): string | null {
  const ids = order?.length ? order.filter((id) => Boolean(errors[id])) : Object.keys(errors);
  return ids[0] ?? null;
}
