import type { SchemaDocument, StepDefinition } from "../schema/schema-document";

export class NavigationEngine {
  private stepIndex = 0;

  constructor(
    private readonly document: SchemaDocument,
    private readonly multiStep: boolean,
  ) {}

  getSteps(): StepDefinition[] {
    if (this.document.steps?.length) return this.document.steps;
    if (!this.multiStep) {
      return [
        {
          id: "all",
          title: "",
          bindingIds: this.document.bindings.map((b) => b.bindingId),
        },
      ];
    }
    const chunk = 2;
    const steps: StepDefinition[] = [];
    for (let i = 0; i < this.document.bindings.length; i += chunk) {
      const slice = this.document.bindings.slice(i, i + chunk);
      steps.push({
        id: `step-${i}`,
        title: `Step ${steps.length + 1}`,
        bindingIds: slice.map((b) => b.bindingId),
      });
    }
    return steps.length
      ? steps
      : [{ id: "all", title: "", bindingIds: this.document.bindings.map((b) => b.bindingId) }];
  }

  getCurrentStepIndex(): number {
    return this.stepIndex;
  }

  getCurrentStep(): StepDefinition {
    return this.getSteps()[this.stepIndex] ?? this.getSteps()[0];
  }

  canGoBack(): boolean {
    return this.stepIndex > 0;
  }

  canGoNext(): boolean {
    return this.stepIndex < this.getSteps().length - 1;
  }

  goNext(): void {
    if (this.canGoNext()) this.stepIndex += 1;
  }

  goBack(): void {
    if (this.canGoBack()) this.stepIndex -= 1;
  }

  goToStep(stepId: string): void {
    const idx = this.getSteps().findIndex((s) => s.id === stepId);
    if (idx >= 0) this.stepIndex = idx;
  }

  setStepIndex(index: number): void {
    this.stepIndex = Math.max(0, Math.min(index, this.getSteps().length - 1));
  }

  getBindingsForCurrentStep(): string[] {
    return this.getCurrentStep()?.bindingIds ?? [];
  }
}
