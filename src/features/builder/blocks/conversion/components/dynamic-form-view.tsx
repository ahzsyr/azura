"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { evaluateConditional } from "@/features/forms/lib/build-zod-schema";
import type { FormFieldDefinition, FormStepDefinition, FormTemplateDefinition } from "@/features/forms/types";
import { resolveItemField } from "@/features/builder/blocks/marketing/lib/resolve-item-locale";
import { cn } from "@/lib/utils";

type Props = {
  templateId: string;
  definition: FormTemplateDefinition;
  locale: string;
  blockType: string;
  blockId?: string;
  pageSlug?: string;
  multiStep?: boolean;
  saveAndResume?: boolean;
  draftToken?: string;
  allowBack?: boolean;
  progressStyle?: "bar" | "steps" | "dots";
  successMessage?: string;
  onSuccess?: (result: { id: string; score: number }) => void;
};

function fieldLabel(field: FormFieldDefinition, locale: string) {
  return resolveItemField(field as Record<string, unknown>, "label", locale);
}

function FieldInput({
  field,
  locale,
  register,
  errors,
}: {
  field: FormFieldDefinition;
  locale: string;
  register: ReturnType<typeof useForm>["register"];
  errors: Record<string, { message?: string } | undefined>;
}) {
  const label = fieldLabel(field, locale);
  const err = errors[field.id]?.message;

  if (field.type === "hidden") {
    return <input type="hidden" {...register(field.id)} />;
  }
  if (field.type === "textarea") {
    return (
      <div className="space-y-1">
        <Label>{label}</Label>
        <Textarea {...register(field.id, { required: field.required })} rows={4} />
        {err && <p className="text-xs text-destructive">{err}</p>}
      </div>
    );
  }
  if (field.type === "select") {
    return (
      <div className="space-y-1">
        <Label>{label}</Label>
        <select className="w-full border rounded-md h-10 px-2 text-sm" {...register(field.id, { required: field.required })}>
          <option value="">—</option>
          {(field.options ?? []).map((o) => (
            <option key={o.value} value={o.value}>
              {resolveItemField(o as Record<string, unknown>, "label", locale)}
            </option>
          ))}
        </select>
        {err && <p className="text-xs text-destructive">{err}</p>}
      </div>
    );
  }
  if (field.type === "checkbox") {
    return (
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" {...register(field.id)} />
        {label}
      </label>
    );
  }

  const inputType =
    field.type === "email" ? "email" : field.type === "number" ? "number" : field.type === "date" ? "date" : field.type === "file" ? "file" : "text";

  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <Input type={inputType} {...register(field.id, { required: field.required })} />
      {err && <p className="text-xs text-destructive">{err}</p>}
    </div>
  );
}

export function DynamicFormView({
  templateId,
  definition,
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
  onSuccess,
}: Props) {
  const [step, setStep] = useState(0);
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [draftToken, setDraftToken] = useState(initialDraftToken ?? "");
  const { register, handleSubmit, watch, reset, getValues } = useForm({ defaultValues: {} as Record<string, unknown> });

  const steps: FormStepDefinition[] = useMemo(() => {
    if (definition.steps?.length) return definition.steps;
    if (!multiStep) return [{ id: "all", title: "", fieldIds: definition.fields.map((f) => f.id) }];
    const chunk = 2;
    const out: FormStepDefinition[] = [];
    for (let i = 0; i < definition.fields.length; i += chunk) {
      const slice = definition.fields.slice(i, i + chunk);
      out.push({
        id: `step-${i}`,
        title: `Step ${out.length + 1}`,
        fieldIds: slice.map((f) => f.id),
      });
    }
    return out.length ? out : [{ id: "all", title: "", fieldIds: definition.fields.map((f) => f.id) }];
  }, [definition, multiStep]);

  const values = watch();
  const visibleFields = useMemo(() => {
    const stepFieldIds = new Set(steps[step]?.fieldIds ?? []);
    return definition.fields.filter((f) => {
      if (multiStep && !stepFieldIds.has(f.id)) return false;
      const { visible } = evaluateConditional(f, values as Record<string, unknown>);
      return visible;
    });
  }, [definition.fields, steps, step, multiStep, values]);

  useEffect(() => {
    const token = initialDraftToken ?? (typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("draft") : null);
    if (!token) return;
    fetch(`/api/forms/draft/${token}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.payload) {
          reset(data.payload);
          setStep(data.currentStep ?? 0);
          setDraftToken(data.token);
        }
      })
      .catch(() => undefined);
  }, [initialDraftToken, reset]);

  const saveDraft = useCallback(async () => {
    if (!saveAndResume) return;
    const payload = getValues();
    const res = await fetch("/api/forms/draft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ templateId, token: draftToken || undefined, payload, currentStep: step }),
    });
    const data = await res.json();
    if (data.token) setDraftToken(data.token);
  }, [saveAndResume, getValues, templateId, draftToken, step]);

  const onSubmit = async (payload: Record<string, unknown>) => {
    if (multiStep && step < steps.length - 1) {
      await saveDraft();
      setStep((s) => s + 1);
      return;
    }

    setStatus("submitting");
    try {
      const res = await fetch("/api/forms/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId,
          payload,
          blockType,
          blockId,
          pageSlug,
          locale,
        }),
      });
      if (!res.ok) throw new Error("Submit failed");
      const data = await res.json();
      setStatus("success");
      onSuccess?.({ id: data.id, score: data.score ?? 0 });
    } catch {
      setStatus("error");
    }
  };

  if (status === "success") {
    return <p className="text-sm text-primary font-medium">{successMessage}</p>;
  }

  const progress = steps.length > 1 ? ((step + 1) / steps.length) * 100 : 100;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {multiStep && steps.length > 1 && (
        <div className="space-y-2">
          {progressStyle === "bar" && (
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
            </div>
          )}
          {progressStyle === "steps" && (
            <p className="text-xs text-muted-foreground">
              {resolveItemField(steps[step] as Record<string, unknown>, "title", locale)} ({step + 1}/{steps.length})
            </p>
          )}
          {progressStyle === "dots" && (
            <div className="flex gap-1">
              {steps.map((_, i) => (
                <span key={i} className={cn("h-2 w-2 rounded-full", i <= step ? "bg-primary" : "bg-muted")} />
              ))}
            </div>
          )}
        </div>
      )}

      <div className={cn("grid gap-4", visibleFields.length > 1 && "md:grid-cols-2")}>
        {visibleFields.map((field) => (
          <FieldInput key={field.id} field={field} locale={locale} register={register} errors={{}} />
        ))}
      </div>

      {saveAndResume && draftToken && (
        <p className="text-xs text-muted-foreground">
          Resume link: {typeof window !== "undefined" ? `${window.location.pathname}?draft=${draftToken}` : ""}
        </p>
      )}

      <div className="flex gap-2">
        {multiStep && step > 0 && allowBack && (
          <Button type="button" variant="outline" onClick={() => setStep((s) => s - 1)}>
            Back
          </Button>
        )}
        <Button type="submit" disabled={status === "submitting"}>
          {status === "submitting"
            ? "Sending…"
            : multiStep && step < steps.length - 1
              ? "Continue"
              : "Submit"}
        </Button>
      </div>
      {status === "error" && <p className="text-sm text-destructive">Something went wrong. Please try again.</p>}
    </form>
  );
}
