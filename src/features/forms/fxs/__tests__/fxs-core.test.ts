import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  escalateErrorsOnSubmit,
  firstInvalidFieldId,
  initialFieldValidationState,
  reduceFieldValidation,
  shouldShowFieldError,
  shouldShowFieldSuccess,
} from "../validation/ValidationStateMachine";
import { suggestEmailDomain, formatPhoneDisplay } from "../smart/adapters";
import { FXS_TEMPLATE_CATALOG } from "../templates/catalog";
import { resolveFxsTheme } from "../core/theme-tokens";

describe("FXS validation state machine", () => {
  it("stays neutral while typing", () => {
    let state = initialFieldValidationState();
    state = reduceFieldValidation(state, { type: "CHANGE" });
    assert.equal(state.phase, "typing");
    assert.equal(state.error, null);
    assert.equal(shouldShowFieldError(state), false);
  });

  it("validates on blur with success or error", () => {
    let state = initialFieldValidationState();
    state = reduceFieldValidation(state, { type: "CHANGE" });
    state = reduceFieldValidation(state, { type: "BLUR", success: "Looks good" });
    assert.equal(state.phase, "blurred");
    assert.equal(shouldShowFieldSuccess(state), true);

    state = reduceFieldValidation(state, { type: "BLUR", error: "Required" });
    assert.equal(shouldShowFieldError(state), true);
    assert.equal(shouldShowFieldSuccess(state), false);
  });

  it("escalates errors on submit", () => {
    const map = escalateErrorsOnSubmit({}, { email: "Valid email required", name: "Required" });
    assert.equal(map.email?.phase, "submitted");
    assert.equal(map.email?.error, "Valid email required");
    assert.equal(firstInvalidFieldId({ email: "x", name: "y" }, ["name", "email"]), "name");
  });
});

describe("FXS smart adapters", () => {
  it("suggests corrected email domains", () => {
    assert.equal(suggestEmailDomain("ali@gmail.con"), "ali@gmail.com");
    assert.equal(suggestEmailDomain("ali@gmail.com"), null);
  });

  it("formats phone numbers softly", () => {
    assert.match(formatPhoneDisplay("+971501234567"), /\+971/);
    assert.ok(formatPhoneDisplay("0501234567").length > 0);
  });
});

describe("FXS theme + templates", () => {
  it("resolves theme presets", () => {
    const modern = resolveFxsTheme("modern");
    assert.equal(modern.preset, "modern");
    assert.equal(modern.fieldMode, "floating");
    assert.ok(modern.inputHeight);
  });

  it("ships curated template families", () => {
    assert.ok(FXS_TEMPLATE_CATALOG.length >= 20);
    const families = new Set(FXS_TEMPLATE_CATALOG.map((t) => t.family));
    for (const f of ["marketing", "sales", "support", "hr", "customer", "operations"]) {
      assert.ok(families.has(f as never), `missing family ${f}`);
    }
  });
});
