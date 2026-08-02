"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { inquirySchema, type InquiryInput } from "@/lib/validations";
import {
  FieldWrapper,
  FormExperience,
  FormSectionCard,
  isFxsEnabled,
  isFxsSmartInputsEnabled,
  SmartEmailInput,
  SmartPhoneInput,
  useFocusManager,
  type FxsValidationPhase,
} from "@/features/forms/fxs";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

type InquiryFormProps = {
  locale: string;
  type?: InquiryInput["type"];
  contentItemId?: string;
  contentItemSlug?: string;
  /** @deprecated use contentItemId */
  packageId?: string;
  /** @deprecated use contentItemSlug */
  packageSlug?: string;
};

function phaseFromField(meta?: { isTouched?: boolean; isDirty?: boolean }, submitted?: boolean): FxsValidationPhase {
  if (submitted) return "submitted";
  if (meta?.isTouched) return "blurred";
  if (meta?.isDirty) return "typing";
  return "idle";
}

export function InquiryForm({
  locale,
  type = "GENERAL",
  contentItemId,
  contentItemSlug,
  packageId,
  packageSlug,
}: InquiryFormProps) {
  const t = useTranslations("contact");
  const sessionState = useSession();
  const session = sessionState?.data;
  const customer = session?.user?.role === "CUSTOMER" ? session.user : null;
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [submitted, setSubmitted] = useState(false);
  const [referenceId, setReferenceId] = useState<string | undefined>();
  const fxsOn = isFxsEnabled();
  const smart = isFxsSmartInputsEnabled();
  const { focusFirstInvalid } = useFocusManager();

  const itemId = contentItemId ?? packageId;
  const itemSlug = contentItemSlug ?? packageSlug;
  const inquiryType = type === "PACKAGE" && itemId ? "CONTENT" : type;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting, touchedFields, dirtyFields },
  } = useForm<InquiryInput>({
    resolver: zodResolver(inquirySchema),
    defaultValues: {
      type: inquiryType,
      locale,
      contentItemId: itemId,
      name: customer?.name ?? "",
      email: customer?.email ?? "",
      message: itemSlug ? `Inquiry about: ${itemSlug}` : "",
    },
  });

  useEffect(() => {
    if (customer?.name) setValue("name", customer.name);
    if (customer?.email) setValue("email", customer.email);
  }, [customer?.name, customer?.email, setValue]);

  const onSubmit = async (data: InquiryInput) => {
    setStatus("submitting");
    setSubmitted(true);
    try {
      const res = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          contentItemId: data.contentItemId ?? data.packageId,
          type: data.type === "PACKAGE" ? "CONTENT" : data.type,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      const json = (await res.json().catch(() => ({}))) as { id?: string };
      setReferenceId(json.id ? `#INQ-${String(json.id).slice(0, 5).toUpperCase()}` : undefined);
      setStatus("success");
      reset({
        type: inquiryType,
        locale,
        contentItemId: itemId,
        name: "",
        email: "",
        phone: "",
        message: "",
      });
    } catch {
      setStatus("error");
    }
  };

  const onInvalid = () => {
    setSubmitted(true);
    const map: Record<string, string> = {};
    for (const [key, err] of Object.entries(errors)) {
      if (err?.message) map[key] = String(err.message);
    }
    focusFirstInvalid(map, ["name", "email", "phone", "message"]);
  };

  const email = watch("email") ?? "";
  const phone = watch("phone") ?? "";
  const message = watch("message") ?? "";

  const errorMap = Object.fromEntries(
    Object.entries(errors)
      .filter(([, e]) => e?.message)
      .map(([k, e]) => [k, String(e?.message)]),
  ) as Record<string, string>;

  if (!fxsOn) {
    return (
      <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="az-form-surface space-y-5">
        <input type="hidden" {...register("contentItemId")} />
        <input type="hidden" {...register("type")} />
        <input type="hidden" {...register("locale")} />
        <div className="grid gap-5 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">{t("name")}</Label>
            <Input id="name" {...register("name")} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">{t("email")}</Label>
            <Input id="email" type="email" {...register("email")} />
            {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">{t("phone")}</Label>
          <Input id="phone" {...register("phone")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="message">{t("message")}</Label>
          <Textarea id="message" rows={5} {...register("message")} />
          {errors.message && <p className="text-xs text-destructive">{errors.message.message}</p>}
        </div>
        {status === "success" && (
          <p className="rounded-lg bg-primary/10 p-3 text-sm text-primary">{t("success")}</p>
        )}
        {status === "error" && (
          <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{t("error")}</p>
        )}
        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? "…" : t("submit")}
        </Button>
      </form>
    );
  }

  return (
    <FormExperience
      className="az-form-surface"
      config={{
        title: "Need help?",
        description: "Tell us about your project. We'll reply within one business day.",
        trustItems: [
          { id: "t1", label: "Response within 24 hours" },
          { id: "t2", label: "No obligation" },
          { id: "t3", label: "Your information stays private" },
        ],
        layoutMode: "default",
        theme: "modern",
        fieldMode: "classic",
        enableErrorSummary: true,
        estimatedMinutes: 2,
        estimatedResponse: "Within one business day",
        successTitle: t("success"),
        successDescription: "We've emailed you confirmation.",
        showHero: true,
      }}
      status={status === "submitting" ? "submitting" : status}
      referenceId={referenceId}
      errors={errorMap}
      errorLabels={{
        name: t("name"),
        email: t("email"),
        phone: t("phone"),
        message: t("message"),
      }}
      onRetry={() => setStatus("idle")}
      sticky={{
        primaryLabel: status === "submitting" || isSubmitting ? "Submitting…" : `${t("submit")} →`,
        loading: status === "submitting" || isSubmitting,
        onPrimary: () => {
          void handleSubmit(onSubmit, onInvalid)();
        },
      }}
    >
      <form
        onSubmit={handleSubmit(onSubmit, onInvalid)}
        className="space-y-5"
        noValidate
        data-fxs-form="inquiry"
      >
        <input type="hidden" {...register("contentItemId")} />
        <input type="hidden" {...register("type")} />
        <input type="hidden" {...register("locale")} />

        <FormSectionCard
          config={{
            id: "contact-info",
            title: "Contact information",
            description: "How can we reach you?",
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <FieldWrapper
              id="name"
              label={t("name")}
              required
              error={errors.name?.message}
              phase={phaseFromField(
                { isTouched: touchedFields.name, isDirty: dirtyFields.name },
                submitted,
              )}
            >
              <Input id="name" autoComplete="name" {...register("name")} />
            </FieldWrapper>

            {smart ? (
              <SmartEmailInput
                id="email"
                label={t("email")}
                required
                value={email}
                error={errors.email?.message}
                phase={phaseFromField(
                  { isTouched: touchedFields.email, isDirty: dirtyFields.email },
                  submitted,
                )}
                onChange={(v) => setValue("email", v, { shouldDirty: true, shouldValidate: submitted })}
                onBlur={() => void register("email").onBlur({ target: { name: "email" } } as never)}
              />
            ) : (
              <FieldWrapper
                id="email"
                label={t("email")}
                required
                error={errors.email?.message}
                phase={phaseFromField(
                  { isTouched: touchedFields.email, isDirty: dirtyFields.email },
                  submitted,
                )}
              >
                <Input id="email" type="email" autoComplete="email" {...register("email")} />
              </FieldWrapper>
            )}
          </div>

          {smart ? (
            <SmartPhoneInput
              id="phone"
              label={t("phone")}
              value={phone}
              phase={phaseFromField(
                { isTouched: touchedFields.phone, isDirty: dirtyFields.phone },
                submitted,
              )}
              onChange={(v) => setValue("phone", v, { shouldDirty: true })}
            />
          ) : (
            <FieldWrapper
              id="phone"
              label={t("phone")}
              optional
              phase={phaseFromField(
                { isTouched: touchedFields.phone, isDirty: dirtyFields.phone },
                submitted,
              )}
            >
              <Input id="phone" type="tel" autoComplete="tel" {...register("phone")} />
            </FieldWrapper>
          )}
        </FormSectionCard>

        <FormSectionCard
          config={{
            id: "project-details",
            title: "Project details",
            description: "What can we help with?",
          }}
        >
          <FieldWrapper
            id="message"
            label={t("message")}
            required
            error={errors.message?.message}
            phase={phaseFromField(
              { isTouched: touchedFields.message, isDirty: dirtyFields.message },
              submitted,
            )}
            characterCount={{ current: message.length, max: 2000 }}
          >
            <Textarea id="message" rows={5} {...register("message")} />
          </FieldWrapper>
        </FormSectionCard>
      </form>
    </FormExperience>
  );
}
