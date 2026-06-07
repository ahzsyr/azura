"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { inquirySchema, type InquiryInput } from "@/lib/validations";

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
  const customer =
    session?.user?.role === "CUSTOMER" ? session.user : null;
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");

  const itemId = contentItemId ?? packageId;
  const itemSlug = contentItemSlug ?? packageSlug;
  const inquiryType = type === "PACKAGE" && itemId ? "CONTENT" : type;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
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
    setStatus("idle");
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
      setStatus("success");
      reset({ type: inquiryType, locale, contentItemId: itemId, name: "", email: "", phone: "", message: "" });
    } catch {
      setStatus("error");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="az-form-surface space-y-5">
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
