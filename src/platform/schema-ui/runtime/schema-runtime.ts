import type { SchemaDocument } from "../schema/schema-document";
import { StateManager, buildInitialValues, applyComputedValues } from "./state-manager";
import { ValidationEngine, validationEngine } from "./validation-engine";
import { ExpressionEngine, expressionEngine } from "./expression-engine";
import { NavigationEngine } from "./navigation-engine";
import { DraftManager, SubmissionEngine } from "./submission-engine";
import type { SubmitCommand } from "../manifests/types";

export type SchemaRuntimeOptions = {
  document: SchemaDocument;
  schemaId: string;
  multiStep?: boolean;
  initialValues?: Record<string, unknown>;
};

export class SchemaRuntime {
  readonly state: StateManager;
  readonly validation: ValidationEngine;
  readonly expressions: ExpressionEngine;
  readonly navigation: NavigationEngine;
  readonly submission: SubmissionEngine;
  readonly drafts: DraftManager;

  constructor(private readonly options: SchemaRuntimeOptions) {
    this.state = new StateManager(options.initialValues ?? buildInitialValues(options.document));
    this.validation = validationEngine;
    this.expressions = expressionEngine;
    this.navigation = new NavigationEngine(options.document, options.multiStep ?? false);
    this.submission = new SubmissionEngine();
    this.drafts = new DraftManager();
  }

  getValue(bindingId: string): unknown {
    return this.state.getValue(bindingId);
  }

  setValue(bindingId: string, value: unknown): void {
    this.state.setValue(bindingId, value);
    this.recalculateComputed();
  }

  watch(bindingId: string, callback: (value: unknown) => void): () => void {
    return this.state.watch(bindingId, callback);
  }

  getValues(): Record<string, unknown> {
    return applyComputedValues(this.options.document, this.state.getValues(), (expr, ctx) =>
      this.expressions.evaluate(expr, ctx),
    );
  }

  async validate(bindingIds?: string[]): Promise<{ valid: boolean; errors: Record<string, string> }> {
    return this.validation.validate(this.options.document, this.getValues(), bindingIds);
  }

  goNext(): void {
    this.navigation.goNext();
  }

  goBack(): void {
    this.navigation.goBack();
  }

  goToStep(stepId: string): void {
    this.navigation.goToStep(stepId);
  }

  async submit(context: Omit<SubmitCommand["context"], "locale"> & { locale?: string }): Promise<Record<string, unknown>> {
    const validation = await this.validate();
    if (!validation.valid) throw new Error("Validation failed");
    return this.submission.submit({
      type: "Submit",
      schemaId: this.options.schemaId,
      bindingValues: this.getValues(),
      context: { locale: context.locale ?? "en", ...context },
    });
  }

  async saveDraft(token?: string): Promise<Record<string, unknown>> {
    return this.drafts.saveDraft({
      schemaId: this.options.schemaId,
      token,
      bindingValues: this.getValues(),
      currentStep: this.navigation.getCurrentStepIndex(),
    });
  }

  private recalculateComputed(): void {
    const computed = applyComputedValues(this.options.document, this.state.getValues(), (expr, ctx) =>
      this.expressions.evaluate(expr, ctx),
    );
    for (const binding of this.options.document.bindings) {
      if (binding.computed?.expression) {
        this.state.setValue(binding.bindingId, computed[binding.bindingId]);
      }
    }
  }
}

export function createSchemaRuntime(options: SchemaRuntimeOptions): SchemaRuntime {
  return new SchemaRuntime(options);
}
