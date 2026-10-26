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
import {
  PHONE_COUNTRIES,
  caretAfterDigits,
  detectCountryFromValue,
  findPhoneCountry,
  formatNationalDigits,
  isValidNationalNumber,
  nationalPlaceholder,
  normalizeNationalDigits,
} from "../smart/phone-countries";
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

describe("FXS phone country catalogue", () => {
  it("ships the full dialling list", () => {
    assert.ok(PHONE_COUNTRIES.length >= 230, `expected full list, got ${PHONE_COUNTRIES.length}`);
    const codes = new Set(PHONE_COUNTRIES.map((country) => country.code));
    for (const code of [
      "AE", "SA", "QA", "KW", "BH", "OM", "JO", "EG", "US", "GB", "CA",
      "DE", "FR", "IT", "ES", "IN", "PK", "BD", "NG", "ZA", "BR", "JP",
      "CN", "AU", "NZ", "SG", "TR", "RU", "UA",
    ]) {
      assert.ok(codes.has(code), `missing ${code}`);
    }
  });

  it("formats written digits exactly like the country example", () => {
    const ae = findPhoneCountry("AE")!;
    assert.equal(nationalPlaceholder(ae), "50 123 4567");
    assert.equal(formatNationalDigits(ae, "551074977"), "55 107 4977");

    const us = findPhoneCountry("US")!;
    assert.equal(nationalPlaceholder(us), "201 555 0123");
    assert.equal(formatNationalDigits(us, "2015550123"), "201 555 0123");

    const gb = findPhoneCountry("GB")!;
    assert.equal(nationalPlaceholder(gb), "7911 123456");

    for (const code of ["AE", "SA", "US", "GB", "IN", "DE", "FR", "AU"]) {
      const country = findPhoneCountry(code)!;
      assert.equal(
        isValidNationalNumber(country, country.example ?? ""),
        true,
        `${code} example must satisfy its own pattern`,
      );
    }
  });

  it("keeps the saved number's country and strips trunk prefixes", () => {
    assert.equal(detectCountryFromValue("+966 50 123 4567")?.code, "SA");
    assert.equal(detectCountryFromValue("+1 201 555 0123")?.code, "US");
    assert.equal(detectCountryFromValue("+1 242 555 0123")?.code, "BS");
    assert.equal(detectCountryFromValue("551074977"), undefined);

    const ae = findPhoneCountry("AE")!;
    assert.equal(normalizeNationalDigits("+971 55 107 4977", ae), "551074977");
    assert.equal(normalizeNationalDigits("971551074977", ae), "551074977");
    assert.equal(normalizeNationalDigits("0551074977", ae), "551074977");
  });

  it("validates per-country numbering plans", () => {
    assert.equal(isValidNationalNumber(findPhoneCountry("AE")!, "551074977"), true);
    assert.equal(isValidNationalNumber(findPhoneCountry("AE")!, "123"), false);
    assert.equal(isValidNationalNumber(findPhoneCountry("SA")!, "501234567"), true);
    assert.equal(isValidNationalNumber(findPhoneCountry("GB")!, "7911123456"), true);
  });

  it("keeps the caret after the typed digit", () => {
    assert.equal(caretAfterDigits("50 123 4567", 3), 4);
    assert.equal(caretAfterDigits("50 123 4567", 9), 11);
    assert.equal(caretAfterDigits("50 123 4567", 20), 11);
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
