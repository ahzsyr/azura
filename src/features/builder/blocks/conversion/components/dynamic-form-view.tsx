"use client";

import { useCallback, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { evaluateConditional } from "@/features/forms/lib/build-zod-schema";
import type { FormTemplateDefinition } from "@/features/forms/types";
import { loadDocumentFromRaw } from "@/features/forms/lib/document-envelope";
import { compileRuntimeDefinition } from "@/features/forms/compiler";
import { getAbVisitorKey, resolveAbTestedRaw } from "@/features/forms/lib/ab-testing";
import { createSchemaRuntime } from "@/platform/schema-ui/runtime/schema-runtime";
import { SchemaRenderer } from "@/platform/schema-ui/layout/schema-renderer";
import { platformEventBus, createInteractionEvent } from "@/platform/schema-ui/events/event-bus";
import { behaviorAnalyticsProjection } from "@/platform/schema-ui/events/projections";
import { trackFormBehaviorEvent } from "@/features/forms/lib/behavior-tracker.client";
import { resolveItemField } from "@/features/builder/blocks/marketing/lib/resolve-item-locale";
import {
  ConversationalView,
  FormExperience,
  FormSectionCard,
  ReviewSummary,
  isFxsEnabled,
  isFxsLiveSummaryEnabled,
  useFocusManager,
  type FxsColumnRatio,
  type FxsExperienceConfig,
  type FxsLayoutMode,
  type FxsSummaryItem,
} from "@/features/forms/fxs";
import {
  appearanceToCssVars,
  type DynamicFormAppearance,
} from "@/features/forms/fxs/appearance/dynamic-form-appearance";
import { resolveMarketingIcon } from "@/features/builder/blocks/marketing/lib/icon-map";
import { formatSubmissionReference } from "@/features/forms/lib/submission-contact";
import { cn } from "@/lib/utils";
import "@/features/forms/platform/register-commands.client";

type Props = {
  templateId: string;
  definition: FormTemplateDefinition;
  definitionRaw?: unknown;
  locale: string;
  blockType: string;
  blockId?: string;
  pageSlug?: string;
  multiStep?: boolean;
  saveAndResume?: boolean;
  draftToken?: string;
  allowBack?: boolean;
  progressStyle?: "bar" | "steps" | "dots" | "breadcrumb" | "sidebar";
  successMessage?: string;
  experience?: FxsExperienceConfig;
  appearance?: Partial<DynamicFormAppearance>;
  onSuccess?: (result: { id: string; score: number }) => void;
};

function ratioToGridCols(ratio?: FxsColumnRatio): string {
  switch (ratio) {
    case "40/60":
      return "md:grid-cols-[2fr_3fr]";
    case "60/40":
      return "md:grid-cols-[3fr_2fr]";
    case "30/70":
      return "md:grid-cols-[3fr_7fr]";
    case "70/30":
      return "md:grid-cols-[7fr_3fr]";
    case "50/50":
    default:
      return "md:grid-cols-2";
  }
}

function resolveFieldsClassName(
  layoutMode: FxsLayoutMode,
  columnRatio?: FxsColumnRatio,
  hasDocumentSections?: boolean,
): string | undefined {
  if (hasDocumentSections) return undefined;
  switch (layoutMode) {
    case "stacked":
      return "fxs-stacked";
    case "inline":
      return "fxs-inline";
    case "twoColumn":
      return `fxs-two-column ${ratioToGridCols(columnRatio)}`;
    case "responsiveGrid":
      return "fxs-responsive-grid";
    default:
      return "fxs-fields-responsive";
  }
}

export function DynamicFormView({
  templateId,
  definition,
  definitionRaw,
  locale,
  blockType,
  blockId,
  pageSlug,
  multiStep = false,
  saveAndResume = false,
  draftToken: initialDraftToken,
  allowBack = true,
  progressStyle = "bar",
  successMessage = "Thank you!",
  experience,
  appearance,
  onSuccess,
}: Props) {
  const sourceRaw = definitionRaw ?? definition;
  const fxsOn = isFxsEnabled();
  const { focusFirstInvalid } = useFocusManager();

  const abAssignment = useMemo(() => {
    const visitorKey = getAbVisitorKey(`brt_ab_${templateId}`);
    return resolveAbTestedRaw(sourceRaw, visitorKey);
  }, [sourceRaw, templateId]);

  const { schema, form } = useMemo(() => {
    const raw = abAssignment.raw ?? sourceRaw;
    const { document, extensions } = loadDocumentFromRaw(raw, definition);
    const compiled = compileRuntimeDefinition(document, extensions);
    return {
      schema: document,
      form: {
        ...compiled,
        scoringRules: definition.scoringRules ?? compiled.scoringRules,
        notifications: definition.notifications ?? compiled.notifications,
        webhooks: definition.webhooks ?? compiled.webhooks,
        pipeline: definition.pipeline ?? compiled.pipeline,
        routingRules: definition.routingRules ?? compiled.routingRules,
        destinations: definition.destinations ?? compiled.destinations,
        automationRules: definition.automationRules ?? compiled.automationRules,
      },
    };
  }, [abAssignment.raw, sourceRaw, definition]);

  const [translatedSchema, setTranslatedSchema] = useState(schema);

  useEffect(() => {
    setTranslatedSchema(schema);
    if (!locale || locale === "en") return;
    let cancelled = false;
    fetch(`/api/forms/${templateId}/translations?locale=${encodeURIComponent(locale)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((copy) => {
        if (cancelled || !copy?.fieldLabels) return;
        setTranslatedSchema({
          ...schema,
          bindings: schema.bindings.map((b) => ({
            ...b,
            presentation: {
              ...b.presentation,
              label: copy.fieldLabels[b.bindingId] || b.presentation.label,
              placeholder: copy.fieldPlaceholders?.[b.bindingId] || b.presentation.placeholder,
            },
          })),
        });
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [schema, templateId, locale]);

  const [step, setStep] = useState(0);
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [draftToken, setDraftToken] = useState(initialDraftToken ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [honeypot, setHoneypot] = useState("");
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [conversationIndex, setConversationIndex] = useState(0);
  const [, tick] = useState(0);

  const runtime = useMemo(
    () => createSchemaRuntime({ document: translatedSchema, schemaId: templateId, multiStep }),
    [translatedSchema, templateId, multiStep],
  );

  const steps = runtime.navigation.getSteps();
  const values = runtime.getValues();

  const visibleBindingIds = useMemo(() => {
    const stepBindingIds = new Set(steps[step]?.bindingIds ?? steps[0]?.bindingIds ?? []);
    const ids = new Set<string>();
    for (const field of form.fields) {
      if (multiStep && !stepBindingIds.has(field.id)) continue;
      const { visible } = evaluateConditional(field, values);
      if (visible) ids.add(field.id);
    }
    return ids;
  }, [form.fields, steps, step, multiStep, values]);

  const visibleBindingList = useMemo(
    () => form.fields.map((field) => field.id).filter((id) => visibleBindingIds.has(id)),
    [form.fields, visibleBindingIds],
  );

  const experienceConfig = useMemo<FxsExperienceConfig>(() => {
    const headingNode = translatedSchema.nodes.find(
      (n) => n.kind === "content" && n.type === "heading",
    );
    const paraNode = translatedSchema.nodes.find(
      (n) => n.kind === "content" && n.type === "paragraph",
    );
    // When the block passes `experience`, Contact Form Builder Content settings own the
    // FXS chrome. Do not replace them with template nodes or hardcoded marketing copy.
    const templateHeading =
      headingNode && "props" in headingNode ? String(headingNode.props.text ?? "") : "";
    const templateDescription =
      paraNode && "props" in paraNode ? String(paraNode.props.text ?? "") : "";

    if (experience) {
      return {
        title: experience.title || undefined,
        description: experience.description || undefined,
        trustItems: experience.trustItems,
        formSectionTitle: experience.formSectionTitle ?? "",
        layoutMode: experience.layoutMode ?? (multiStep ? "default" : "split"),
        columnRatio: experience.columnRatio,
        sectionStyle: experience.sectionStyle,
        theme: experience.theme ?? "modern",
        fieldMode: experience.fieldMode ?? "classic",
        progressStyle: experience.progressStyle ?? progressStyle,
        enableLiveSummary: experience.enableLiveSummary ?? multiStep,
        enableErrorSummary: experience.enableErrorSummary ?? true,
        estimatedResponse: experience.estimatedResponse ?? "Within one business day",
        successTitle: experience.successTitle ?? successMessage,
        successDescription:
          experience.successDescription ?? "We've received your submission and emailed a confirmation.",
        estimatedMinutes: experience.estimatedMinutes ?? (multiStep ? 4 : 2),
        showHero: experience.showHero ?? true,
      };
    }

    return {
      title: templateHeading || "Let's get started",
      description:
        templateDescription || "Tell us a bit about your needs — it only takes a moment.",
      trustItems: [
        { id: "t1", label: "Response within 24 hours" },
        { id: "t2", label: "No obligation" },
        { id: "t3", label: "Your information stays private" },
      ],
      formSectionTitle: undefined,
      layoutMode: multiStep ? "default" : "split",
      theme: "modern",
      fieldMode: "classic",
      progressStyle,
      enableLiveSummary: multiStep,
      enableErrorSummary: true,
      estimatedResponse: "Within one business day",
      successTitle: successMessage,
      successDescription: "We've received your submission and emailed a confirmation.",
      estimatedMinutes: multiStep ? 4 : 2,
      showHero: true,
    };
  }, [experience, translatedSchema.nodes, multiStep, progressStyle, successMessage]);

  const layoutMode = experienceConfig.layoutMode ?? "default";

  const summaryItems = useMemo<FxsSummaryItem[]>(() => {
    if (!isFxsLiveSummaryEnabled() || !experienceConfig.enableLiveSummary) return [];
    const fields = form.fields.filter((f) => visibleBindingIds.has(f.id) || values[f.id]);
    return fields.slice(0, 6).map((f) => ({
      id: f.id,
      label: f.label,
      value: values[f.id] == null || values[f.id] === "" ? "—" : String(values[f.id]),
    }));
  }, [form.fields, visibleBindingIds, values, experienceConfig.enableLiveSummary]);

  const sidebarSections = useMemo(() => {
    if (layoutMode !== "sidebar" || steps.length <= 1) return undefined;
    return steps.map((stepDef, index) => ({
      id: `form-fields-${index}`,
      title: resolveItemField(stepDef as Record<string, unknown>, "title", locale) || `Step ${index + 1}`,
      completed: index < step,
      active: index === step,
    }));
  }, [layoutMode, locale, step, steps]);

  const fieldLabels = useMemo(() => {
    const map: Record<string, string> = {};
    for (const f of form.fields) map[f.id] = f.label;
    return map;
  }, [form.fields]);

  useEffect(() => {
    void platformEventBus.emit(
      createInteractionEvent(templateId, "schema.viewed", { schemaId: templateId, blockType }),
    );
    behaviorAnalyticsProjection.record(
      createInteractionEvent(templateId, "schema.viewed", { schemaId: templateId }),
    );
    void trackFormBehaviorEvent({ schemaId: templateId, type: "schema.viewed", payload: { blockType } });
  }, [templateId, blockType]);

  useEffect(() => {
    runtime.navigation.setStepIndex(step);
  }, [step, runtime]);

  useEffect(() => {
    setConversationIndex((current) => {
      if (visibleBindingList.length === 0) return 0;
      return Math.min(current, visibleBindingList.length - 1);
    });
  }, [visibleBindingList]);

  useEffect(() => {
    const token =
      initialDraftToken ??
      (typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("draft") : null);
    if (!token) return;
    fetch(`/api/forms/draft/${token}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.payload) {
          runtime.state.reset(data.payload);
          setStep(data.currentStep ?? 0);
          setDraftToken(data.token);
          tick((n) => n + 1);
        }
      })
      .catch(() => undefined);
  }, [initialDraftToken, runtime]);

  const saveDraft = useCallback(async () => {
    if (!saveAndResume) return;
    const result = await runtime.saveDraft(draftToken || undefined);
    if (result.token) setDraftToken(String(result.token));
  }, [saveAndResume, runtime, draftToken]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validation = await runtime.validate([...visibleBindingIds]);
    setErrors(validation.errors);
    if (!validation.valid) {
      focusFirstInvalid(validation.errors, [...visibleBindingIds]);
      return;
    }

    if (multiStep && step < steps.length - 1) {
      await saveDraft();
      setStep((s) => s + 1);
      return;
    }

    setStatus("submitting");
    try {
      const result = await runtime.submit({
        blockType,
        blockId,
        pageSlug,
        locale,
        abTestId: abAssignment.abTestId,
        abVariantId: abAssignment.abVariantId,
        honeypot,
      });
      setSubmissionId(String(result.id));
      setStatus("success");
      onSuccess?.({ id: String(result.id), score: Number(result.score ?? 0) });
    } catch {
      setStatus("error");
    }
  };

  const hasDocumentSections = translatedSchema.nodes.some(
    (n) => n.kind === "layout" && n.type === "section",
  );

  /** When FXS hero shows title/description, skip duplicate heading/paragraph nodes in the body. */
  const renderDocument = useMemo(() => {
    if (!fxsOn || experienceConfig.showHero === false) return translatedSchema;
    const nodes = translatedSchema.nodes.filter((n) => {
      if (n.kind !== "content") return true;
      return n.type !== "heading" && n.type !== "paragraph";
    });
    return nodes.length === translatedSchema.nodes.length
      ? translatedSchema
      : { ...translatedSchema, nodes };
  }, [translatedSchema, fxsOn, experienceConfig.showHero]);

  const fieldsClassName = resolveFieldsClassName(
    layoutMode,
    experienceConfig.columnRatio,
    hasDocumentSections,
  );
  const currentBindingId = visibleBindingList[Math.min(conversationIndex, Math.max(visibleBindingList.length - 1, 0))];

  const handleBindingChange = useCallback(
    async (bindingId: string) => {
      tick((n) => n + 1);
      const result = await runtime.validate([bindingId]);
      setErrors((prev) => {
        const next = { ...prev };
        if (result.errors[bindingId]) {
          next[bindingId] = result.errors[bindingId];
        } else {
          delete next[bindingId];
        }
        return next;
      });
    },
    [runtime],
  );

  const standardRenderer = (
    <div className={fieldsClassName}>
      <SchemaRenderer
        document={renderDocument}
        schemaId={templateId}
        locale={locale}
        runtime={runtime}
        errors={errors}
        visibleBindingIds={visibleBindingIds}
        onBindingChange={(bindingId) => {
          void handleBindingChange(bindingId);
        }}
      />
    </div>
  );

  const reviewSections = useMemo(() => {
    if (multiStep && steps.length > 1) {
      return steps.map((stepDef, stepIndex) => ({
        id: stepDef.id,
        title: resolveItemField(stepDef as Record<string, unknown>, "title", locale) || `Step ${stepIndex + 1}`,
        stepIndex,
        items: stepDef.bindingIds.map((bindingId) => {
          const field = form.fields.find((candidate) => candidate.id === bindingId);
          const value = values[bindingId];
          return {
            id: bindingId,
            label: field?.label ?? bindingId,
            value:
              value == null || value === ""
                ? "—"
                : Array.isArray(value)
                  ? value.map((entry) => String((entry as { name?: string })?.name ?? entry)).join(", ")
                  : String(value),
          };
        }),
      }));
    }

    return [
      {
        id: `review-${templateId}`,
        title: "Review your details",
        items: visibleBindingList.map((bindingId) => {
          const field = form.fields.find((candidate) => candidate.id === bindingId);
          const value = values[bindingId];
          return {
            id: bindingId,
            label: field?.label ?? bindingId,
            value:
              value == null || value === ""
                ? "—"
                : Array.isArray(value)
                  ? value.map((entry) => String((entry as { name?: string })?.name ?? entry)).join(", ")
                  : String(value),
          };
        }),
      },
    ];
  }, [form.fields, locale, multiStep, steps, templateId, values, visibleBindingList]);

  const renderer =
    layoutMode === "conversational" && currentBindingId ? (
      <ConversationalView
        document={renderDocument}
        schemaId={templateId}
        locale={locale}
        runtime={runtime}
        errors={errors}
        currentBindingId={currentBindingId}
        currentIndex={conversationIndex}
        total={visibleBindingList.length}
        onBindingChange={() => {
          void handleBindingChange(currentBindingId);
        }}
      />
    ) : layoutMode === "review" ? (
      <div className="grid gap-6 lg:grid-cols-2">
        <div>{standardRenderer}</div>
        <div className="lg:sticky lg:top-4 lg:self-start">
          <ReviewSummary
            sections={reviewSections}
            onEditSection={multiStep ? (stepIndex) => setStep(stepIndex) : undefined}
          />
        </div>
      </div>
    ) : (
      standardRenderer
    );

  const formBody = (
    <form onSubmit={handleSubmit} className="relative space-y-4" noValidate={fxsOn}>
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        value={honeypot}
        onChange={(e) => setHoneypot(e.target.value)}
        className="absolute left-[-9999px] top-auto h-0 w-0 overflow-hidden opacity-0"
      />

      {hasDocumentSections ? (
        renderer
      ) : (
        <FormSectionCard
          config={{
            id: `form-fields-${step}`,
            title: multiStep
              ? resolveItemField(steps[step] as Record<string, unknown>, "title", locale) ||
                `Step ${step + 1}`
              : experience
                ? experienceConfig.formSectionTitle || ""
                : experienceConfig.formSectionTitle || "Your details",
            style: experienceConfig.sectionStyle,
            fieldIds: visibleBindingList,
          }}
          errors={errors}
        >
          {renderer}
        </FormSectionCard>
      )}

      {saveAndResume && draftToken ? (
        <p className="text-xs text-muted-foreground">
          Resume link:{" "}
          {typeof window !== "undefined" ? `${window.location.pathname}?draft=${draftToken}` : ""}
        </p>
      ) : null}
    </form>
  );

  const submitForm = () => {
    const formEl = document.querySelector<HTMLFormElement>(`[data-fxs-form="${templateId}"] form`);
    formEl?.requestSubmit();
  };

  const handleConversationalPrimary = async () => {
    if (!currentBindingId) {
      submitForm();
      return;
    }
    if (conversationIndex < visibleBindingList.length - 1) {
      const validation = await runtime.validate([currentBindingId]);
      setErrors((current) => ({ ...current, ...validation.errors }));
      if (!validation.valid) {
        focusFirstInvalid(validation.errors, [currentBindingId]);
        return;
      }
      setConversationIndex((current) => Math.min(current + 1, visibleBindingList.length - 1));
      return;
    }
    submitForm();
  };

  if (!fxsOn) {
    // Parity fallback — keep previous chrome if FXS is disabled.
    if (status === "success") {
      return <p className="text-sm text-primary font-medium">{successMessage}</p>;
    }
    return wrapWithAppearance(formBody, appearance);
  }

  const FormIcon = appearance?.formIcon
    ? resolveMarketingIcon(appearance.formIcon)
    : null;

  const appearanceHeader =
    appearance && (appearance.formIcon || appearance.badge || appearance.subtitle || appearance.description) ? (
      <div
        className={cn(
          "mb-4 flex gap-3",
          appearance.iconPosition === "top" ? "flex-col" : "flex-row items-start",
          appearance.titleAlignment === "center" && "items-center text-center",
          appearance.titleAlignment === "right" && "items-end text-right",
        )}
      >
        {FormIcon ? (
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
            <FormIcon className="h-5 w-5" />
          </span>
        ) : null}
        <div className="min-w-0 flex-1 space-y-1">
          {appearance.badge ? (
            <span className="inline-flex rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
              {appearance.badge}
            </span>
          ) : null}
          {appearance.subtitle ? (
            <p className="text-sm text-muted-foreground">{appearance.subtitle}</p>
          ) : null}
          {appearance.description ? (
            <p className="text-sm text-muted-foreground/80">{appearance.description}</p>
          ) : null}
        </div>
      </div>
    ) : null;

  return wrapWithAppearance(
    <>
      {appearanceHeader}
      <FormExperience
      config={{ ...experienceConfig, sidebarSections }}
      status={status}
      referenceId={submissionId ? formatSubmissionReference(submissionId) : undefined}
      errors={errors}
      errorLabels={fieldLabels}
      summaryItems={summaryItems}
      progress={
        multiStep && steps.length > 1
          ? {
              step,
              total: steps.length,
              labels: steps.map((s) =>
                resolveItemField(s as Record<string, unknown>, "title", locale),
              ),
            }
          : undefined
      }
      onRetry={() => setStatus("idle")}
      sticky={{
        primaryLabel:
          status === "submitting"
            ? appearance?.loadingText || "Submitting…"
            : layoutMode === "conversational"
              ? conversationIndex < visibleBindingList.length - 1
                ? "Next →"
                : appearance?.buttonText || "Submit →"
            : multiStep && step < steps.length - 1
              ? "Continue"
              : appearance?.buttonText || "Submit →",
        loading: status === "submitting",
        showBack:
          layoutMode === "conversational"
            ? conversationIndex > 0
            : multiStep && step > 0 && allowBack,
        showDraft: saveAndResume,
        onBack:
          layoutMode === "conversational"
            ? () => setConversationIndex((current) => Math.max(0, current - 1))
            : () => setStep((s) => Math.max(0, s - 1)),
        onDraft: () => void saveDraft(),
        onPrimary:
          layoutMode === "conversational"
            ? () => void handleConversationalPrimary()
            : submitForm,
      }}
    >
      <div data-fxs-form={templateId}>{formBody}</div>
    </FormExperience>
    </>,
    appearance,
  );
}

function wrapWithAppearance(
  children: ReactNode,
  appearance?: Partial<DynamicFormAppearance>,
) {
  if (!appearance) return children;
  const cssVars = appearanceToCssVars(appearance);
  const style = {
    ...cssVars,
    ...(appearance.maxWidth ? { maxWidth: appearance.maxWidth } : {}),
  } as CSSProperties;

  return (
    <div
      className={cn(
        "fxs-appearance-root w-full",
        appearance.buttonWidth === "full" && "[&_[data-fxs-submit]]:w-full",
      )}
      style={style}
    >
      {children}
    </div>
  );
}
